"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { getSessionUser } from "@/lib/auth";
import { sendWorkflowEmail, getAdminEmails } from "./email-server";
import { inspectionRescheduleSchema, inspectionScheduleSchema, inspectionUpdateSchema } from "@/schemas";
import { toManilaDate, toManilaISOString, validateBusinessSchedule } from "@/lib/business-hours";
import type { ActionState } from "@/types";

// Helper function removed to allow flexible, deadlock-free inspection scheduling

function getSchemaMismatchMessage(message: string) {
  if (!message.includes("material_list") || !message.includes("inspections")) {
    return null;
  }

  return "The database is missing the inspections.material_list column. Run supabase/inspection-material-list.sql in Supabase SQL Editor, then try saving again.";
}

export async function scheduleInspectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(inspectionScheduleSchema, {
      applicationId: formData.get("applicationId"),
      inspectorId: formData.get("inspectorId"),
      scheduledAt: formData.get("scheduledAt")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const scheduleValidation = validateBusinessSchedule(parsed.data.scheduledAt);
    if (!scheduleValidation.valid) {
      return { success: false, message: scheduleValidation.message ?? "Invalid schedule." };
    }

    // Prerequisite: in-house plumbing must be completed first
    const { data: appCheck, error: appCheckError } = await supabase
      .from("applications")
      .select("inhouse_installation_completed")
      .eq("id", parsed.data.applicationId)
      .single();

    if (appCheckError || !appCheck) {
      return { success: false, message: "Application not found." };
    }

    if (!appCheck.inhouse_installation_completed) {
      return {
        success: false,
        message: "In-house plumbing must be completed before scheduling an inspection."
      };
    }

    const { data: inspector, error: inspectorError } = await supabase
      .from("inspectors")
      .select("id, full_name")
      .eq("id", parsed.data.inspectorId)
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .single();

    if (inspectorError || !inspector) {
      return { success: false, message: inspectorError?.message ?? "Selected inspector was not found." };
    }

    const { error } = await supabase.from("inspections").insert({
      organization_id: profile.organization_id,
      application_id: parsed.data.applicationId,
      scheduled_by: profile.id,
      registry_inspector_id: parsed.data.inspectorId,
      inspector_name: inspector.full_name,
      scheduled_at: toManilaISOString(parsed.data.scheduledAt),
      status: "scheduled"
    });

    if (error) {
      return {
        success: false,
        message: getSchemaMismatchMessage(error.message) ?? error.message
      };
    }

    await supabase
      .from("applications")
      .update({ status: "inspection_scheduled" })
      .eq("id", parsed.data.applicationId);

    // Send email asynchronously in the background
    (async () => {
      try {
        const { data: applicationRecord } = await supabase
          .from("applications")
          .select("applicants(profile_id, full_name)")
          .eq("id", parsed.data.applicationId)
          .single();

        const applicantProfileId = (applicationRecord?.applicants as any)?.profile_id;
        const applicantName = (applicationRecord?.applicants as any)?.full_name ?? parsed.data.applicationId;
        if (applicantProfileId) {
          const adminClient = (await import("@/lib/supabase/server")).createSupabaseAdminClient();
          const { data: userAuth } = await adminClient.auth.admin.getUserById(applicantProfileId);
          if (userAuth?.user?.email) {
            await sendWorkflowEmail(
              userAuth.user.email,
              "Inspection Scheduled - BWD Online",
              `<h3>Inspection Scheduled</h3>
               <p>An inspection for applicant: <b>${applicantName}</b> has been scheduled.</p>
               <p><strong>Scheduled Date:</strong> ${new Date(parsed.data.scheduledAt).toLocaleString()}</p>
               <p>Please ensure someone is available at the premises during the inspection.</p>`
            );
          }
        }
      } catch (emailErr) {
        console.error("Failed to send workflow email in background:", emailErr);
      }
    })();

    revalidatePath("/admin/inspections");
    return { success: true, message: "Inspection scheduled." };
  });
}

export async function rescheduleInspectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase } = await getActionContext();
    const parsed = await parseFormData(inspectionRescheduleSchema, {
      inspectionId: formData.get("inspectionId"),
      scheduledAt: formData.get("scheduledAt")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const scheduleValidation = validateBusinessSchedule(parsed.data.scheduledAt);
    if (!scheduleValidation.valid) {
      return { success: false, message: scheduleValidation.message ?? "Invalid schedule." };
    }

    const { data: inspection, error: fetchError } = await supabase
      .from("inspections")
      .select("application_id, scheduled_at")
      .eq("id", parsed.data.inspectionId)
      .single();

    if (fetchError || !inspection) {
      return { success: false, message: fetchError?.message ?? "Inspection not found." };
    }

    const [updateInspectionRes, updateAppRes] = await Promise.all([
      supabase
        .from("inspections")
        .update({
          scheduled_at: toManilaISOString(parsed.data.scheduledAt),
          status: "rescheduled"
        })
        .eq("id", parsed.data.inspectionId),
      supabase
        .from("applications")
        .update({ status: "inspection_scheduled" })
        .eq("id", inspection.application_id)
    ]);

    if (updateInspectionRes.error) {
      return { success: false, message: updateInspectionRes.error.message };
    }
    if (updateAppRes.error) {
      return { success: false, message: updateAppRes.error.message };
    }

    revalidatePath("/admin/inspections");
    revalidatePath("/admin");
    revalidatePath("/applicant");
    return { success: true, message: "Inspection schedule updated." };
  });
}

export async function updateInspectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase } = await getActionContext();
    const parsed = await parseFormData(inspectionUpdateSchema, {
      inspectionId: formData.get("inspectionId"),
      status: formData.get("status"),
      plumbingApproved: formData.get("plumbingApproved") === "true",
      inspectedAt: formData.get("inspectedAt"),
      remarks: formData.get("remarks"),
      materialList: formData.get("materialList"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      referenceAccountNumber: formData.get("referenceAccountNumber"),
      referenceAccountName: formData.get("referenceAccountName"),
      accountNumber: formData.get("accountNumber")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const plumbingApproved = parsed.data.status === "approved" ? parsed.data.plumbingApproved : false;

    // Combined query: Fetch inspection and application details (plumber & applicant) in a single database call
    const { data: inspection, error: fetchError } = await supabase
      .from("inspections")
      .select(`
        scheduled_at,
        application_id,
        applications!inner (
          accredited_plumber_id,
          accredited_plumbers (full_name),
          applicants (profile_id, full_name)
        )
      `)
      .eq("id", parsed.data.inspectionId)
      .single();

    if (fetchError || !inspection) {
      return { success: false, message: fetchError?.message ?? "Inspection not found." };
    }

    const scheduledAt = inspection.scheduled_at;
    if (scheduledAt) {
      const inspectedAtTime = toManilaDate(parsed.data.inspectedAt).getTime();
      const scheduledAtTime = new Date(scheduledAt).getTime();

      if (inspectedAtTime < scheduledAtTime) {
        return {
          success: false,
          message: "Actual inspection date and time cannot be earlier than the scheduled inspection date and time."
        };
      }
    }

    const application = (inspection as any).applications;
    const plumberName = (application?.accredited_plumbers as { full_name?: string } | null)?.full_name?.trim() ?? "";

    if (!plumberName) {
      return {
        success: false,
        message: "Set an accredited plumber on this application before saving the inspection."
      };
    }

    // Parallelize updates to inspections and applications
    const [updateInspectionRes, updateAppRes] = await Promise.all([
      supabase
        .from("inspections")
        .update({
          status: parsed.data.status,
          plumbing_approved: plumbingApproved,
          remarks: parsed.data.remarks,
          material_list: parsed.data.materialList,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          plumber_name: plumberName,
          reference_account_number: parsed.data.referenceAccountNumber,
          reference_account_name: parsed.data.referenceAccountName,
          account_number: parsed.data.accountNumber,
          inspected_at: toManilaISOString(parsed.data.inspectedAt)
        })
        .eq("id", parsed.data.inspectionId),
      supabase
        .from("applications")
        .update({
          status: parsed.data.status === "approved" ? "inspection_completed" : "under_review"
        })
        .eq("id", inspection.application_id)
    ]);

    if (updateInspectionRes.error) {
      return { success: false, message: updateInspectionRes.error.message };
    }
    if (updateAppRes.error) {
      return { success: false, message: updateAppRes.error.message };
    }

    // Non-blocking background email sending for approved inspections
    if (parsed.data.status === "approved") {
      const applicantProfileId = application?.applicants?.profile_id;
      const applicantName = application?.applicants?.full_name ?? inspection.application_id;

      if (applicantProfileId) {
        (async () => {
          try {
            const adminClient = (await import("@/lib/supabase/server")).createSupabaseAdminClient();
            const { data: userAuth } = await adminClient.auth.admin.getUserById(applicantProfileId);
            if (userAuth?.user?.email) {
              await sendWorkflowEmail(
                userAuth.user.email,
                "Inspection Approved - BWD Online",
                `<h3>Inspection Approved</h3>
                 <p>Your site inspection for applicant: <b>${applicantName}</b> has been approved!</p>
                 <p>Please log in to your dashboard to proceed to the next steps.</p>`
              );
            }
          } catch (emailErr) {
            console.error("Failed to send workflow email in background:", emailErr);
          }
        })();
      }
    }

    revalidatePath("/inspector");
    revalidatePath("/admin/inspections");
    revalidatePath("/admin");
    revalidatePath("/applicant");
    return { success: true, message: "Inspection report saved." };
  });
}

export async function searchReferenceAccountsAction(query: string) {
  const { supabase, profile } = await getActionContext();

  if (!query || query.trim().length < 2) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from("inspections")
    .select(`
      latitude,
      longitude,
      account_number,
      applications!inner(full_name)
    `)
    .eq("organization_id", profile.organization_id)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .ilike("applications.full_name", `%${query.trim()}%`)
    .limit(5);

  if (error) {
    return { success: false, message: error.message, data: [] };
  }

  const formattedData = data.map((item: any) => ({
    name: item.applications?.full_name ?? "",
    accountNumber: item.account_number ?? "",
    latitude: item.latitude,
    longitude: item.longitude
  }));

  return { success: true, data: formattedData };
}

export async function updateAccountNumberByAdminAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase } = await getActionContext();
    const applicationId = String(formData.get("applicationId") ?? "").trim();
    const inspectionId = String(formData.get("inspectionId") ?? "").trim();
    const accountNumber = String(formData.get("accountNumber") ?? "").trim();

    if (!/^\d{4}-\d{2}-\d{3}$/.test(accountNumber)) {
      return { success: false, message: "Account number must be in XXXX-XX-XXX format (e.g. 0441-12-031)." };
    }

    if (inspectionId) {
      const { error } = await supabase
        .from("inspections")
        .update({ account_number: accountNumber })
        .eq("id", inspectionId);

      if (error) {
        return { success: false, message: error.message };
      }
    }

    if (applicationId) {
      await supabase
        .from("concessionaires")
        .update({ concessionaire_number: accountNumber })
        .eq("application_id", applicationId);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/inspections");
    revalidatePath("/inspector");
    revalidatePath("/applicant");

    return { success: true, message: "Account number updated successfully." };
  });
}
