"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { type ActionState } from "@/types";

export type WaterBillUploadData = {
  account_number: string;
  name: string;
  date_bill?: string | null;
  consumption?: number | null;
  total: number;
  amount_after_due_date?: number | null;
  due?: string | null;
  disconnection?: string | null;
};

export async function uploadWaterBillsAction(
  bills: WaterBillUploadData[],
  clearExisting: boolean = true
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

    if (clearExisting) {
      // Delete all existing water bills for this organization before uploading new ones
      const { error: deleteError } = await supabase
        .from("water_bills")
        .delete()
        .eq("organization_id", profile.organization_id);

      if (deleteError) {
        console.error("Failed to delete existing water bills:", deleteError);
        return { success: false, message: "Failed to clear old water bills before upload." };
      }
    }

    // 1. Fetch all existing concessionaires for the given account numbers in chunks
    const supabaseAdmin = createSupabaseAdminClient();
    const accNumbers = Array.from(new Set(bills.map(b => b.account_number)));
    
    const existingConcessionaires = [];
    const CHUNK_SIZE = 100;
    for (let i = 0; i < accNumbers.length; i += CHUNK_SIZE) {
      const chunk = accNumbers.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabaseAdmin
        .from("concessionaires")
        .select("id, concessionaire_number, applicant_id, created_at")
        .in("concessionaire_number", chunk)
        .order("created_at", { ascending: false }); // Newest first
        
      if (error) {
        console.error("Failed to fetch concessionaires chunk:", error);
      } else if (data) {
        existingConcessionaires.push(...data);
      }
    }

    const accToId = new Map<string, string>();
    for (const c of existingConcessionaires) {
      if (!accToId.has(c.concessionaire_number) || c.applicant_id) {
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
          name: bill.name,
          date_bill: bill.date_bill || null,
          consumption: bill.consumption ?? 0,
          total: bill.total,
          amount_after_due_date: bill.amount_after_due_date || null,
          due: bill.due || null,
          disconnection: bill.disconnection || null,
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

export async function clearWaterBillsAction(): Promise<ActionState> {
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

    const { error: deleteError } = await supabase
      .from("water_bills")
      .delete()
      .eq("organization_id", profile.organization_id);

    if (deleteError) {
      console.error("Failed to clear water bills:", deleteError);
      return { success: false, message: "Failed to clear water bills." };
    }

    return {
      success: true,
      message: "Successfully cleared all water bills.",
    };
  } catch (error) {
    console.error("Clear water bills error:", error);
    return {
      success: false,
      message: "An unexpected error occurred while clearing water bills",
    };
  }
}
