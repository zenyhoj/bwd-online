"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { applicationStatusSchema } from "@/schemas";
import type { ActionState } from "@/types";

export async function createApplicationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    const applicantId = formData.get("applicantId")?.toString() ?? "";
    const numberOfUsersRaw = formData.get("numberOfUsers");
    const numberOfUsers = numberOfUsersRaw ? parseInt(String(numberOfUsersRaw), 10) : NaN;

    if (!applicantId) {
      return { success: false, message: "Applicant ID is required." };
    }
    if (isNaN(numberOfUsers) || numberOfUsers < 1 || numberOfUsers > 100) {
      return { success: false, message: "Number of users must be between 1 and 100.", fieldErrors: { numberOfUsers: ["Number of users must be between 1 and 100."] } };
    }

    // Fetch applicant data server-side (do not trust hidden form inputs for personal data)
    const { data: applicant, error: applicantError } = await supabase
      .from("applicants")
      .select("*")
      .eq("id", applicantId)
      .eq("profile_id", profile.id)
      .single();

    if (applicantError || !applicant) {
      return { success: false, message: "Applicant not found or you do not have permission." };
    }

    const { data: seminarItems, error: seminarItemsError } = await supabase
      .from("seminar_items")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true);

    if (seminarItemsError) {
      return { success: false, message: seminarItemsError.message };
    }

    const seminarItemIds = seminarItems?.map((item) => item.id) ?? [];
    if (seminarItemIds.length === 0) {
      return { success: false, message: "No seminar items are configured yet. Please contact the administrator." };
    }

    const { data: completedItems, error: completedItemsError } = await supabase
      .from("applicant_seminar_progress")
      .select("seminar_item_id")
      .eq("applicant_id", applicantId)
      .eq("completed", true)
      .in("seminar_item_id", seminarItemIds);

    if (completedItemsError) {
      return { success: false, message: completedItemsError.message };
    }

    if ((completedItems?.length ?? 0) < seminarItemIds.length) {
      return { success: false, message: "Complete the full seminar series before submitting your application." };
    }

    const classification = formData.get("classification")?.toString() ?? "";
    if (!classification) {
      return { success: false, message: "Connection classification is required.", fieldErrors: { classification: ["Please select a classification."] } as Record<string, string[]> };
    }

    const { error } = await supabase.from("applications").insert({
      organization_id: profile.organization_id,
      applicant_id: applicantId,
      full_name: applicant.full_name,
      gender: applicant.gender,
      age: applicant.age,
      address: applicant.address,
      cellphone_number: applicant.cellphone_number,
      number_of_users: numberOfUsers,
      service_type: "new_connection",
      seminar_completed: true,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      concessionaire_classification: classification as "residential_commercial_c" | "commercial_a_b" | "commercial_industrial_bulk"
    });

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/applicant");
    revalidatePath("/applicant/applications/new");
    revalidatePath("/applicant/documents");
    revalidatePath("/applicant/payments");
    return {
      success: true,
      message: "Application submitted successfully.",
      redirectTo: `/applicant?applicant=${applicantId}`
    };
  });
}

export async function updateApplicationStatusAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase } = await getActionContext();
    const parsed = await parseFormData(applicationStatusSchema, {
      applicationId: formData.get("applicationId"),
      status: formData.get("status"),
      rejectionReason: formData.get("rejectionReason")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        status: parsed.data.status,
        rejection_reason: parsed.data.rejectionReason,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", parsed.data.applicationId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin");
    return { success: true, message: "Application status updated." };
  });
}
