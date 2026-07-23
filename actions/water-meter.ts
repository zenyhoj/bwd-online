"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { sendWorkflowEmail, getAdminEmails } from "./email-server";
import { waterMeterScheduleSchema } from "@/schemas/water-meter";
import { toManilaISOString, validateBusinessSchedule } from "@/lib/business-hours";
import type { ActionState } from "@/types";

export async function scheduleWaterMeterAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(waterMeterScheduleSchema, {
      applicationId: formData.get("applicationId"),
      scheduledAt: formData.get("scheduledAt"),
      minDate: formData.get("minDate") || undefined
    });

    if (parsed.error) {
      return parsed.error;
    }

    if (parsed.data.minDate && parsed.data.scheduledAt < parsed.data.minDate) {
      return { success: false, message: "Installation date cannot be before the payment date." };
    }

    const scheduleValidation = validateBusinessSchedule(parsed.data.scheduledAt);
    if (!scheduleValidation.valid) {
      return { success: false, message: scheduleValidation.message ?? "Invalid schedule." };
    }

    const { error } = await supabase
      .from("applications")
      .update({
        water_meter_installation_scheduled_at: toManilaISOString(parsed.data.scheduledAt),
        water_meter_installation_scheduled_by: profile.id
      })
      .eq("id", parsed.data.applicationId);

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/reports/${parsed.data.applicationId}`);

    return { success: true, message: "Water meter installation scheduled successfully." };
  });
}

export async function markWaterMeterInstalledAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const applicationId = formData.get("applicationId");

    if (typeof applicationId !== "string" || !applicationId) {
      return { success: false, message: "Invalid application ID." };
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select(
        "id, applicant_id, organization_id, water_meter_installed_at, inspections(id, account_number, inspected_at, scheduled_at), concessionaires(id), applicants(profile_id)"
      )
      .eq("id", applicationId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    const latestInspectionWithAccount =
      [...(((application.inspections as { account_number?: string | null; inspected_at?: string | null; scheduled_at?: string | null }[] | undefined) ?? []))]
        .filter((inspection) => Boolean(inspection.account_number?.trim()))
        .sort((a, b) => {
          const aTime = new Date(a.inspected_at ?? a.scheduled_at ?? 0).getTime();
          const bTime = new Date(b.inspected_at ?? b.scheduled_at ?? 0).getTime();
          return bTime - aTime;
        })[0] ?? null;
    const accountNumber = latestInspectionWithAccount?.account_number?.trim() ?? "";

    if (!accountNumber) {
      return {
        success: false,
        message: "Enter the account number in the inspection report before marking the water meter installation complete."
      };
    }

    const installedAt = application.water_meter_installed_at ?? new Date().toISOString();

    const existingConcessionaire =
      ((application.concessionaires as { id?: string }[] | undefined) ?? [])[0] ?? null;

    if (!existingConcessionaire) {
      const { error: concessionaireError } = await supabase
        .from("concessionaires")
        .insert({
          organization_id: profile.organization_id,
          application_id: applicationId,
          concessionaire_number: accountNumber,
          connection_date: installedAt.slice(0, 10),
          meter_number: null,
          created_by: profile.id
        });

      if (concessionaireError) {
        return { success: false, message: concessionaireError.message };
      }
    }

    const { error } = await supabase
      .from("applications")
      .update({
        water_meter_installed_at: installedAt,
        status: "converted"
      })
      .eq("id", applicationId);

    if (error) {
      throw error;
    }

    // Send workflow email asynchronously in the background
    const applicantProfileId = (application?.applicants as any)?.profile_id;
    const applicantName = (application?.applicants as any)?.full_name ?? applicationId;
    if (applicantProfileId) {
      (async () => {
        try {
          const adminClient = (await import("@/lib/supabase/server")).createSupabaseAdminClient();
          const { data: userAuth } = await adminClient.auth.admin.getUserById(applicantProfileId);
          if (userAuth?.user?.email) {
            await sendWorkflowEmail(
              userAuth.user.email,
              "Water Connection Active - Welcome to BWD!",
              `<h3>Water Connection Active</h3>
               <p>Congratulations! Your water meter for applicant: <b>${applicantName}</b> has been successfully installed and activated.</p>
               <p>You can now view your concessionaire details and water bills in your dashboard.</p>`
            );
          }
        } catch (emailErr) {
          console.error("Failed to send water connection email in background:", emailErr);
        }
      })();
    }

    revalidatePath("/admin");
    revalidatePath("/admin/concessionaires");
    revalidatePath("/applicant");
    revalidatePath(`/admin/reports/${applicationId}`);

    return { success: true, message: "Water meter installation completed and account converted." };
  });
}
