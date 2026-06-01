"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionState } from "@/types";

export type WaterBillUploadData = {
  account_number: string;
  account_name: string;
  address?: string | null;
  amount: number;
  amount_after_duedate?: number | null;
  due_date: string; // ISO date string
};

export async function uploadWaterBillsAction(
  bills: WaterBillUploadData[]
): Promise<ActionState & { data?: { inserted: number } }> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Not authenticated" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return { success: false, message: "Not authorized" };
    }

    // Delete all existing water bills for this organization before uploading new ones
    const { error: deleteError } = await supabase
      .from("water_bills")
      .delete()
      .eq("organization_id", profile.organization_id);

    if (deleteError) {
      console.error("Failed to delete existing water bills:", deleteError);
      return { success: false, message: "Failed to clear old water bills before upload." };
    }

    // 1. Fetch all existing concessionaires to minimize DB roundtrips
    const { data: existingConcessionaires } = await supabase
      .from("concessionaires")
      .select("id, concessionaire_number")
      .eq("organization_id", profile.organization_id);

    const accToId = new Map<string, string>();
    if (existingConcessionaires) {
      for (const c of existingConcessionaires) {
        accToId.set(c.concessionaire_number, c.id);
      }
    }

    // 2. Identify and create missing concessionaires in bulk
    const missingAccountNumbers = new Set<string>();
    for (const bill of bills) {
      if (!accToId.has(bill.account_number)) {
        missingAccountNumbers.add(bill.account_number);
      }
    }

    const missingAccountsArray = Array.from(missingAccountNumbers);
    if (missingAccountsArray.length > 0) {
      const newConcessionaires = missingAccountsArray.map((acc) => ({
        organization_id: profile.organization_id,
        concessionaire_number: acc,
        connection_date: new Date().toISOString(),
        account_status: "active",
      }));

      // Insert missing concessionaires in chunks of 1000
      for (let i = 0; i < newConcessionaires.length; i += 1000) {
        const chunk = newConcessionaires.slice(i, i + 1000);
        const { data: insertedConcessionaires, error: insertError } = await supabase
          .from("concessionaires")
          .insert(chunk)
          .select("id, concessionaire_number");
          
        if (!insertError && insertedConcessionaires) {
          for (const c of insertedConcessionaires) {
            accToId.set(c.concessionaire_number, c.id);
          }
        } else if (insertError) {
          console.error("Failed to bulk insert concessionaires chunk:", insertError);
        }
      }
    }

    // 3. Prepare water bills for bulk insertion
    const billsToInsert = [];
    for (const bill of bills) {
      const cId = accToId.get(bill.account_number);
      if (cId) {
        billsToInsert.push({
          organization_id: profile.organization_id,
          concessionaire_id: cId,
          account_number: bill.account_number,
          account_name: bill.account_name,
          address: bill.address || null,
          amount: bill.amount,
          amount_after_duedate: bill.amount_after_duedate || null,
          due_date: bill.due_date,
          status: "unpaid",
        });
      }
    }

    // 4. Bulk insert water bills in chunks of 1000
    let insertedCount = 0;
    for (let i = 0; i < billsToInsert.length; i += 1000) {
      const chunk = billsToInsert.slice(i, i + 1000);
      const { error: billError } = await supabase
        .from("water_bills")
        .insert(chunk);

      if (billError) {
        console.error("Failed to insert water bills chunk:", billError);
      } else {
        insertedCount += chunk.length;
      }
    }

    return {
      success: true,
      message: `Successfully processed ${insertedCount} water bills.`,
      data: { inserted: insertedCount },
    };
  } catch (error) {
    console.error("Water bills upload error:", error);
    return {
      success: false,
      message: "An unexpected error occurred while processing water bills",
    };
  }
}
