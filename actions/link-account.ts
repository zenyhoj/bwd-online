"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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
      .select("id, organization_id, role")
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
    const { data: concessionaire, error: findError } = await supabase
      .from("concessionaires")
      .select("id, applicant_id")
      .eq("organization_id", profile.organization_id)
      .eq("concessionaire_number", accountNumber)
      .single();

    if (findError || !concessionaire) {
      return { success: false, message: "Account number not found. Please check your latest bill." };
    }

    if (concessionaire.applicant_id) {
      // If it's already linked to this profile, return success anyway
      // But we can't easily check that without another query.
      return { success: false, message: "This account is already linked to a user profile." };
    }

    // Verify account name against water bills
    const { data: bills } = await supabase
      .from("water_bills")
      .select("account_name")
      .eq("concessionaire_id", concessionaire.id)
      .limit(1);

    if (bills && bills.length > 0) {
      const billName = bills[0].account_name.trim().toLowerCase();
      if (billName !== accountName.trim().toLowerCase()) {
        return { success: false, message: "Account name does not match our records." };
      }
    } else {
      // No bills yet, so we can't verify account name. 
      // This happens if admin creates concessionaire manually without bills.
      return { success: false, message: "Cannot verify account at this time. No bills on record." };
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
      // Create applicant record
      const { data: newApp, error: appError } = await supabase
        .from("applicants")
        .insert({
          profile_id: profile.id,
          organization_id: profile.organization_id,
        })
        .select("id")
        .single();
        
      if (appError || !newApp) {
        throw new Error("Failed to create applicant record for linking.");
      }
      applicant = newApp;
    }

    // Update concessionaire with this applicant_id
    const { error: updateError } = await supabase
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
