"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { getSessionUser } from "@/lib/auth";
import { sendPushNotificationAction } from "./push-server";
import { sendWorkflowEmail, getAdminEmails } from "./email-server";
import { applicationStatusSchema } from "@/schemas";
import type { ConcessionaireClassification } from "@/lib/fee-schedule";
import type { ActionState } from "@/types";

export async function createApplicationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const user = await getSessionUser();

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

    const { data: existingApps, error: existingAppsError } = await supabase
      .from("applications")
      .select("id, status, payments(status)")
      .eq("organization_id", profile.organization_id)
      .eq("full_name", applicant.full_name)
      .neq("status", "rejected")
      .neq("status", "converted");

    if (existingAppsError) {
      return { success: false, message: "Failed to check for existing applications." };
    }

    if (existingApps && existingApps.length > 0) {
      const hasActiveUnpaidApp = existingApps.some(app => {
        const payments = app.payments as any[];
        const isPaid = payments && payments.some(p => p.status === "paid");
        return !isPaid;
      });

      if (hasActiveUnpaidApp) {
        return { success: false, message: "An active application for this name already exists. Please wait for it to be processed." };
      }
    }

    const { error } = await supabase.from("applications").insert({
      organization_id: profile.organization_id,
      applicant_id: applicantId,
      full_name: applicant.full_name,
      gender: applicant.gender,
      age: applicant.age,
      address: applicant.address,
      email_address: applicant.email_address,
      cellphone_number: applicant.cellphone_number,
      number_of_users: numberOfUsers,
      service_type: "new_connection",
      seminar_completed: true,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      concessionaire_classification: classification as ConcessionaireClassification
    });

    if (error) {
      return { success: false, message: error.message };
    }

    // Send email to Admin
    await sendWorkflowEmail(
      await getAdminEmails(),
      "New Application Submitted",
      `<h3>New Application Submitted</h3>
       <p>A new application for <b>${applicant.full_name}</b> has been submitted.</p>
       <p>Please check the admin dashboard for details.</p>`
    );

    // Send email to User
    if (user?.email) {
      await sendWorkflowEmail(
        user.email,
        "Application Submitted Successfully",
        `<h3>Application Submitted</h3>
         <p>Your water connection application for <b>${applicant.full_name}</b> has been successfully submitted.</p>
         <p>Please check your dashboard for the next steps.</p>`
      );
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

    // Send push notification & email to applicant
    try {
      const { data: appData } = await supabase
        .from("applications")
        .select("status, applicants(profile_id)")
        .eq("id", parsed.data.applicationId)
        .single();
      
      const applicantProfileId = (appData?.applicants as any)?.profile_id;
      if (applicantProfileId) {
        await sendPushNotificationAction(
          applicantProfileId,
          "Application Update",
          `Your application status has been updated to: ${parsed.data.status.replace("_", " ")}`,
          "/applicant"
        );

        const adminClient = (await import("@/lib/supabase/server")).createSupabaseAdminClient();
        const { data: userAuth } = await adminClient.auth.admin.getUserById(applicantProfileId);
        if (userAuth?.user?.email) {
          await sendWorkflowEmail(
            userAuth.user.email,
            "Application Update - BWD Online",
            `<h3>Application Update</h3>
             <p>Your application status has been updated to: <strong>${parsed.data.status.replace("_", " ")}</strong></p>
             <p>Please log in to BWD Online to check for any pending tasks or requirements.</p>`
          );
        }
      }
    } catch (pushError) {
      console.error("Failed to send push/email notification:", pushError);
      // Don't fail the whole action if push/email fails
    }

    revalidatePath("/admin");
    return { success: true, message: "Application status updated." };
  });
}

export async function deleteApplicantAndApplicationsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Unauthorized. Only administrators can delete applicants." };
    }

    const applicantId = formData.get("applicantId")?.toString();
    if (!applicantId) {
      return { success: false, message: "Applicant ID is required." };
    }

    // Ensure applicant belongs to admin's organization
    const { data: applicant, error: applicantError } = await supabase
      .from("applicants")
      .select("id")
      .eq("id", applicantId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicantError || !applicant) {
      return { success: false, message: "Applicant not found or access denied." };
    }

    // 1. Delete physical files from storage
    const { data: documents } = await supabase
      .from("documents")
      .select("file_path")
      .eq("applicant_id", applicantId)
      .eq("organization_id", profile.organization_id);

    if (documents && documents.length > 0) {
      const filePaths = documents.map((doc) => doc.file_path).filter(Boolean);
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("application-documents")
          .remove(filePaths);

        if (storageError) {
          console.error("Failed to delete some storage files:", storageError);
          // Continue anyway to clear the database
        }
      }
    }

    // 2. Cascade delete database records manually to avoid FK constraint errors if ON DELETE CASCADE is missing
    const { data: applications } = await supabase
      .from("applications")
      .select("id")
      .eq("applicant_id", applicantId);

    const appIds = applications?.map(app => app.id) ?? [];

    if (appIds.length > 0) {
      await supabase.from("documents").delete().in("application_id", appIds);
      await supabase.from("inspections").delete().in("application_id", appIds);
      await supabase.from("payments").delete().in("application_id", appIds);
      await supabase.from("seminar_progress").delete().in("application_id", appIds);
      await supabase.from("applications").delete().in("id", appIds);
    }

    await supabase.from("applicant_seminar_progress").delete().eq("applicant_id", applicantId);
    
    // Attempt to delete concessionaires (if converted)
    const { error: concessionaireError } = await supabase.from("concessionaires").delete().eq("applicant_id", applicantId);
    if (concessionaireError) {
      return { 
        success: false, 
        message: "Cannot delete this applicant because they have active concessionaire records (e.g. water meters or bills) that must be removed first." 
      };
    }
    
    // Finally, delete the applicant
    const { error: deleteError } = await supabase.from("applicants").delete().eq("id", applicantId);

    if (deleteError) {
      return { success: false, message: deleteError.message };
    }

    revalidatePath("/admin");
    return { success: true, message: "Applicant and related data successfully deleted.", redirectTo: "/admin" };
  });
}
