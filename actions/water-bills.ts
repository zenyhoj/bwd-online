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

    let insertedCount = 0;

    for (const bill of bills) {
      // 1. Find or create concessionaire
      let { data: concessionaire } = await supabase
        .from("concessionaires")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .eq("concessionaire_number", bill.account_number)
        .single();

      if (!concessionaire) {
        // Auto-create legacy concessionaire
        const { data: newConcessionaire, error: createError } = await supabase
          .from("concessionaires")
          .insert({
            organization_id: profile.organization_id,
            concessionaire_number: bill.account_number,
            connection_date: new Date().toISOString(), // Default
            account_status: "active",
          })
          .select("id")
          .single();

        if (createError || !newConcessionaire) {
          console.error("Failed to create legacy concessionaire:", createError);
          continue; // Skip this bill
        }
        concessionaire = newConcessionaire;
      }

      // 2. Insert the water bill
      const { error: billError } = await supabase
        .from("water_bills")
        .insert({
          organization_id: profile.organization_id,
          concessionaire_id: concessionaire.id,
          account_number: bill.account_number,
          account_name: bill.account_name,
          address: bill.address || null,
          amount: bill.amount,
          amount_after_duedate: bill.amount_after_duedate || null,
          due_date: bill.due_date,
          status: "unpaid",
        });

      if (billError) {
        console.error("Failed to insert water bill:", billError);
      } else {
        insertedCount++;
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
