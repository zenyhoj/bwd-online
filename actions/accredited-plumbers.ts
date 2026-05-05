"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import {
  accreditedPlumberSchema,
  deleteAccreditedPlumberSchema,
  inhouseInstallationSchema,
  installationScheduleSchema
} from "@/schemas";
import type { ActionState } from "@/types";

function isFutureDate(value: string) {
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected.getTime() > today.getTime();
}

function isMissingInstallationScheduleColumn(message?: string | null) {
  return message?.includes("inhouse_installation_scheduled_at") ?? false;
}

export async function scheduleInhouseInstallationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can schedule inhouse installation." };
    }

    const parsed = await parseFormData(installationScheduleSchema, {
      applicationId: formData.get("applicationId"),
      scheduledAt: formData.get("scheduledAt")
    });

    if (parsed.error) {
      return parsed.error;
    }

    if (isFutureDate(parsed.data.scheduledAt)) {
      return { success: false, message: "Installation date cannot be in the future." };
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, organization_id")
      .eq("id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    const { data: latestPayment } = await supabase
      .from("payments")
      .select("status, paid_at, due_date")
      .eq("application_id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("due_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestPayment || latestPayment.status !== "paid") {
      return { success: false, message: "Set the installation schedule only after payment is marked as paid." };
    }

    const installationDate = new Date(`${parsed.data.scheduledAt}T00:00:00`).toISOString();
    const { error: scheduleError } = await supabase
      .from("applications")
      .update({
        inhouse_installation_scheduled_at: installationDate,
        inhouse_installation_scheduled_by: profile.id,
        inhouse_installation_completed: true,
        inhouse_installation_completed_at: installationDate,
        inhouse_installation_updated_by: profile.id,
        status: "approved"
      })
      .eq("id", parsed.data.applicationId);

    if (scheduleError) {
      if (isMissingInstallationScheduleColumn(scheduleError.message)) {
        return {
          success: false,
          message:
            "Database is missing installation date columns. Run supabase/installation-schedule.sql in Supabase SQL Editor, then retry."
        };
      }
      return { success: false, message: scheduleError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/applicant");
    return { success: true, message: "Installation date saved and marked as complete." };
  });
}

export async function createAccreditedPlumberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage accredited plumbers." };
    }

    const parsed = await parseFormData(accreditedPlumberSchema, {
      fullName: formData.get("fullName"),
      licenseNumber: formData.get("licenseNumber"),
      phone: formData.get("phone"),
      notes: formData.get("notes")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { error } = await supabase.from("accredited_plumbers").insert({
      organization_id: profile.organization_id,
      full_name: parsed.data.fullName,
      license_number: parsed.data.licenseNumber || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
      created_by: profile.id
    });

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/plumbers");
    revalidatePath("/admin");
    revalidatePath("/applicant");
    return { success: true, message: "Accredited plumber added." };
  });
}

export async function updateAccreditedPlumberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage accredited plumbers." };
    }

    const plumberId = formData.get("plumberId")?.toString() ?? "";
    if (!plumberId) return { success: false, message: "Plumber ID is required." };

    const parsed = await parseFormData(accreditedPlumberSchema, {
      fullName: formData.get("fullName"),
      licenseNumber: formData.get("licenseNumber"),
      phone: formData.get("phone"),
      notes: formData.get("notes")
    });

    if (parsed.error) return parsed.error;

    const { error } = await supabase
      .from("accredited_plumbers")
      .update({
        full_name: parsed.data.fullName,
        license_number: parsed.data.licenseNumber || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null
      })
      .eq("id", plumberId)
      .eq("organization_id", profile.organization_id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/plumbers");
    revalidatePath("/admin");
    revalidatePath("/applicant");
    return { success: true, message: "Plumber updated." };
  });
}

export async function deleteAccreditedPlumberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage accredited plumbers." };
    }

    const parsed = await parseFormData(deleteAccreditedPlumberSchema, {
      plumberId: formData.get("plumberId")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { data: usage, error: usageError } = await supabase
      .from("applications")
      .select("id")
      .eq("accredited_plumber_id", parsed.data.plumberId)
      .limit(1)
      .maybeSingle();

    if (usageError) {
      return { success: false, message: usageError.message };
    }

    if (usage) {
      const { error } = await supabase
        .from("accredited_plumbers")
        .update({ is_active: false })
        .eq("id", parsed.data.plumberId)
        .eq("organization_id", profile.organization_id);

      if (error) {
        return { success: false, message: error.message };
      }

      revalidatePath("/admin/plumbers");
      revalidatePath("/admin");
      revalidatePath("/applicant");
      return { success: true, message: "Plumber archived because it is already linked to an application." };
    }

    const { error } = await supabase
      .from("accredited_plumbers")
      .delete()
      .eq("id", parsed.data.plumberId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/plumbers");
    revalidatePath("/admin");
    revalidatePath("/applicant");
    return { success: true, message: "Accredited plumber removed." };
  });
}

export async function updateInhouseInstallationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(inhouseInstallationSchema, {
      applicationId: formData.get("applicationId"),
      accreditedPlumberId: formData.get("accreditedPlumberId"),
      completed: formData.get("completed")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, applicant_id, organization_id")
      .eq("id", parsed.data.applicationId)
      .single();

    if (applicationError || !application) {
      return { success: false, message: "Application not found." };
    }

    let canManage = false;

    if (profile.role === "admin") {
      canManage = application.organization_id === profile.organization_id;
    } else if (profile.role === "applicant") {
      // applicant_id references the applicants table, not the profile directly
      const { data: applicantRecord } = await supabase
        .from("applicants")
        .select("id")
        .eq("id", application.applicant_id)
        .eq("profile_id", profile.id)
        .maybeSingle();
      canManage = Boolean(applicantRecord);
    }

    if (!canManage) {
      return { success: false, message: "You are not allowed to update this installation record." };
    }

    const { data: plumber, error: plumberError } = await supabase
      .from("accredited_plumbers")
      .select("id")
      .eq("id", parsed.data.accreditedPlumberId)
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .single();

    if (plumberError || !plumber) {
      return { success: false, message: "Choose a valid accredited plumber." };
    }

    const { error } = await supabase
      .from("applications")
      .update({
        accredited_plumber_id: parsed.data.accreditedPlumberId,
        inhouse_installation_completed: parsed.data.completed,
        inhouse_installation_completed_at: parsed.data.completed ? new Date().toISOString() : null,
        inhouse_installation_updated_by: profile.id
      })
      .eq("id", parsed.data.applicationId);

    if (error) {
      return { success: false, message: error.message };
    }

      // Do not artificially jump the status to payment_scheduled or approved here.
      // The workflow logic in the admin dashboard handles the progression based on completed steps.

    revalidatePath("/applicant");
    revalidatePath("/admin");
    revalidatePath("/admin/concessionaires");
    return {
      success: true,
      message:
        profile.role === "admin"
          ? "Inhouse installation marked complete for this application."
          : "Your inhouse installation completion was recorded."
    };
  });
}
