"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { paymentScheduleSchema, paymentStatusSchema } from "@/schemas";
import { validateBusinessSchedule } from "@/lib/business-hours";
import type { ActionState } from "@/types";

function isPastOfficePaymentDate(value: string) {
  return new Date(value).getTime() < Date.now();
}

function isMissingOfficePaymentAtColumn(message?: string | null) {
  return message?.includes("Could not find the 'office_payment_at' column of 'payments'") ?? false;
}

export async function schedulePaymentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(paymentScheduleSchema, {
      applicationId: formData.get("applicationId"),
      paymentType: formData.get("paymentType"),
      officePaymentAt: formData.get("officePaymentAt")
    });

    if (parsed.error) {
      return parsed.error;
    }

    if (isPastOfficePaymentDate(parsed.data.officePaymentAt)) {
      return {
        success: false,
        message: "Office payment schedule must be today or a future date and time."
      };
    }

    const scheduleValidation = validateBusinessSchedule(parsed.data.officePaymentAt);
    if (!scheduleValidation.valid) {
      return { success: false, message: scheduleValidation.message ?? "Invalid schedule." };
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, organization_id, status, document_submission_mode, document_review_note")
      .eq("id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    const { data: approvedInspection, error: inspectionError } = await supabase
      .from("inspections")
      .select("id")
      .eq("application_id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id)
      .eq("status", "approved")
      .order("inspected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inspectionError) {
      return { success: false, message: inspectionError.message };
    }

    if (!approvedInspection) {
      return {
        success: false,
        message: "Schedule the office payment only after the inspection is approved."
      };
    }

    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .eq("application_id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id);

    if (documentsError) {
      return { success: false, message: documentsError.message };
    }

    if (!areDocumentsReadyForPayment(application)) {
      return {
        success: false,
        message:
          "Verify all required documents first, or wait for the applicant to choose to bring the documents to the office."
      };
    }

    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from("payments")
      .select("id")
      .eq("application_id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id)
      .limit(1)
      .maybeSingle();

    if (existingPaymentError) {
      return { success: false, message: existingPaymentError.message };
    }

    if (existingPayment) {
      return { success: false, message: "A payment schedule already exists for this application." };
    }

    const { error } = await supabase.from("payments").insert({
      organization_id: profile.organization_id,
      application_id: parsed.data.applicationId,
      scheduled_by: profile.id,
      payment_type: parsed.data.paymentType,
      amount: 0,
      due_date: parsed.data.officePaymentAt.slice(0, 10),
      office_payment_at: new Date(parsed.data.officePaymentAt).toISOString()
    });

    if (error) {
      if (isMissingOfficePaymentAtColumn(error.message)) {
        return {
          success: false,
          message:
            "The database is missing the payments.office_payment_at column. Run supabase/payment-office-datetime.sql in Supabase SQL Editor, then try scheduling again."
        };
      }

      return { success: false, message: error.message };
    }

    await supabase
      .from("applications")
      .update({ status: "payment_scheduled" })
      .eq("id", parsed.data.applicationId);

    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    revalidatePath("/applicant");
    revalidatePath("/applicant/payments");
    return { success: true, message: "Office payment schedule saved." };
  });
}

export async function updatePaymentStatusAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase } = await getActionContext();
    const parsed = await parseFormData(paymentStatusSchema, {
      paymentId: formData.get("paymentId"),
      status: formData.get("status"),
      amount: formData.get("amount") || undefined,
      officialReceiptNumber: formData.get("officialReceiptNumber") || undefined,
      paidAt: formData.get("paidAt") || undefined,
      officePaymentAt: formData.get("officePaymentAt") || undefined
    });

    if (parsed.error) {
      return parsed.error;
    }

    if (parsed.data.status === "paid" && parsed.data.amount === undefined) {
      return { success: false, message: "Official receipt amount is required to confirm payment." };
    }

    const { data: paymentRecord, error: paymentRecordError } = await supabase
      .from("payments")
      .select("application_id, office_payment_at")
      .eq("id", parsed.data.paymentId)
      .maybeSingle();

    if (paymentRecordError || !paymentRecord) {
      return { success: false, message: paymentRecordError?.message ?? "Payment record not found." };
    }

    if (parsed.data.status === "paid" && parsed.data.paidAt && paymentRecord.office_payment_at) {
      const paidAtTime = new Date(parsed.data.paidAt).getTime();
      const officePaymentTime = new Date(paymentRecord.office_payment_at).getTime();
      
      if (paidAtTime < officePaymentTime) {
        return {
          success: false,
          message: "Date of payment cannot be earlier than the scheduled office payment date."
        };
      }
    }

    const { data: applicationRecord, error: applicationRecordError } = await supabase
      .from("applications")
      .select("id, status, inhouse_installation_completed")
      .eq("id", paymentRecord.application_id)
      .maybeSingle();

    if (applicationRecordError || !applicationRecord) {
      return { success: false, message: applicationRecordError?.message ?? "Application not found." };
    }

    const { error } = await supabase
      .from("payments")
      .update({
        status: parsed.data.status,
        amount: parsed.data.amount,
        official_receipt_number: parsed.data.officialReceiptNumber,
        paid_at: parsed.data.status === "paid"
          ? (parsed.data.paidAt ? new Date(parsed.data.paidAt).toISOString() : new Date().toISOString())
          : null,
        office_payment_at: parsed.data.status === "scheduled" && parsed.data.officePaymentAt
          ? new Date(parsed.data.officePaymentAt).toISOString()
          : undefined,
        due_date: parsed.data.status === "scheduled" && parsed.data.officePaymentAt
          ? new Date(parsed.data.officePaymentAt).toISOString()
          : undefined
      })
      .eq("id", parsed.data.paymentId);

    if (error) {
      return { success: false, message: error.message };
    }

    if (applicationRecord.status !== "converted") {
      const nextApplicationStatus =
        parsed.data.status === "paid" && applicationRecord.inhouse_installation_completed
          ? "approved"
          : "payment_scheduled";

      const { error: applicationUpdateError } = await supabase
        .from("applications")
        .update({ status: nextApplicationStatus })
        .eq("id", paymentRecord.application_id);

      if (applicationUpdateError) {
        return { success: false, message: applicationUpdateError.message };
      }
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin");
    revalidatePath("/applicant");
    revalidatePath("/applicant/payments");
    return { success: true, message: "Payment status updated." };
  });
}
