"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { type ActionState } from "@/types";

export async function linkLegacyAccountAction(
  accountNumber: string,
  accountName: string
): Promise<ActionState> {
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
      .select("id, organization_id, role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "applicant") {
      return { success: false, message: "Not authorized as an applicant" };
    }

    // Ensure we match case-insensitively or exact match depending on requirements.
    // For simplicity and matching Excel exactly, we'll use exact match.
    // We check if the concessionaire exists, has no applicant_id, and matches account_name in water bills.
    
    // Wait, account_name is in water_bills, not concessionaires.
    // Let's find the concessionaire by concessionaire_number
    const cleanAccountNumber = accountNumber.trim();
    const cleanAccountName = accountName.trim();

    // Verify against the latest uploaded bill first. This avoids picking an older
    // duplicate concessionaire row that has the same account number but no bills.
    const { data: latestBill, error: billLookupError } = await adminClient
      .from("water_bills")
      .select("concessionaire_id, name")
      .eq("organization_id", profile.organization_id)
      .eq("account_number", cleanAccountNumber)
      .order("due", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (billLookupError) {
      return { success: false, message: billLookupError.message };
    }

    if (!latestBill) {
      return { success: false, message: "Account number not found. Please check your latest bill." };
    }

    const billName = latestBill.name.trim().toLowerCase();
    if (billName !== cleanAccountName.toLowerCase()) {
      return { success: false, message: "Account name does not match our records." };
    }

    // USE adminClient to bypass RLS since applicants might not have read access to unlinked concessionaires
    const { data: concessionaire, error: findError } = await adminClient
      .from("concessionaires")
      .select("id, applicant_id")
      .eq("organization_id", profile.organization_id)
      .eq("id", latestBill.concessionaire_id)
      .maybeSingle();

    if (findError || !concessionaire) {
      return { success: false, message: "Account number not found. Please check your latest bill." };
    }

    // It matches. Link it.
    // But concessionaires requires applicant_id (which references applicants table).
    // Does this user have an applicant record?
    let { data: applicant } = await supabase
      .from("applicants")
      .select("id")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle();

    if (!applicant) {
      // Create applicant record - use adminClient to bypass RLS
      const { data: newApp, error: appError } = await adminClient
        .from("applicants")
        .insert({
          profile_id: profile.id,
          organization_id: profile.organization_id,
          full_name: profile.full_name || cleanAccountName,
        })
        .select("id")
        .single();
        
      if (appError || !newApp) {
        console.error("Applicant insert error:", appError);
        throw new Error("Failed to create applicant record for linking.");
      }
      applicant = newApp;
    }

    // Update concessionaire with this applicant_id
    // USE adminClient to bypass RLS
    const { error: updateError } = await adminClient
      .from("concessionaires")
      .update({ applicant_id: applicant.id })
      .eq("id", concessionaire.id);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      message: "Account successfully linked! You can now view your water bills.",
    };
  } catch (error: any) {
    console.error("Link account error:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred",
    };
  }
}
