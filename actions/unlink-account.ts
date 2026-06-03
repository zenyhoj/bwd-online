"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { type ActionState } from "@/types";

export async function unlinkAccountAction(concessionaireId: string): Promise<ActionState> {
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

    // First get all applicant_ids for this user
    const { data: applicants } = await supabase
      .from("applicants")
      .select("id")
      .eq("profile_id", profile.id);

    if (!applicants || applicants.length === 0) {
      return { success: false, message: "Applicant profile not found" };
    }

    const applicantIds = applicants.map(a => a.id);
    const adminClient = createSupabaseAdminClient();

    // Verify that the concessionaire belongs to one of this user's applicants and is in their organization
    const { data: concessionaire, error: findError } = await adminClient
      .from("concessionaires")
      .select("id")
      .eq("id", concessionaireId)
      .in("applicant_id", applicantIds)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (findError || !concessionaire) {
      return { success: false, message: "Account not found or you don't have permission to unlink it." };
    }

    // Update concessionaire to remove applicant_id
    const { error: updateError } = await adminClient
      .from("concessionaires")
      .update({ applicant_id: null })
      .eq("id", concessionaireId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/applicant");
    revalidatePath("/applicant/water-bills");

    return {
      success: true,
      message: "Account successfully unlinked.",
    };
  } catch (error: any) {
    console.error("Unlink account error:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred",
    };
  }
}
