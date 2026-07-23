"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { getSessionUser } from "@/lib/auth";
import { sendWorkflowEmail, getAdminEmails } from "./email-server";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { paymentScheduleSchema, paymentStatusSchema } from "@/schemas";
import { toManilaDate, toManilaISOString, validateBusinessSchedule } from "@/lib/business-hours";
import type { ActionState } from "@/types";

function isPastOfficePaymentDate(value: string) {
  return toManilaDate(value).getTime() < Date.now();
}

function isValidDateTimeLocal(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && !Number.isNaN(toManilaDate(value).getTime());
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
      .select("id, organization_id, status, document_submission_mode, document_review_note, documents_verified_at, applicants(full_name)")
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
      office_payment_at: toManilaISOString(parsed.data.officePaymentAt)
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

    // Send email notifications asynchronously in the background
    (async () => {
      try {
        const user = await getSessionUser();
        const applicantName = (application.applicants as any)?.full_name ?? parsed.data.applicationId;
        const adminEmails = await getAdminEmails();

        await sendWorkflowEmail(
          adminEmails,
          "New Payment Scheduled",
          `<h3>New Payment Scheduled</h3>
           <p>A new payment has been scheduled for applicant: <b>${applicantName}</b>.</p>
           <p>Please check the admin dashboard for details.</p>`
        );

        if (user?.email) {
          await sendWorkflowEmail(
            user.email,
            "Payment Scheduled",
            `<h3>Payment Scheduled</h3>
             <p>Your payment schedule has been saved for applicant: <b>${applicantName}</b>.</p>
             <p>Please pay at the office on the scheduled date.</p>`
          );
        }
      } catch (emailErr) {
        console.error("Failed to send payment scheduled email in background:", emailErr);
      }
    })();

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

    if (parsed.data.status === "paid" && parsed.data.paidAt) {
      const paidAtTime = toManilaDate(parsed.data.paidAt).getTime();

      if (Number.isNaN(paidAtTime)) {
        return { success: false, message: "Date of payment is invalid." };
      }
    }

    if (parsed.data.status === "scheduled") {
      if (!parsed.data.officePaymentAt) {
        return { success: false, message: "Office payment date and time are required to reschedule payment." };
      }

      if (!isValidDateTimeLocal(parsed.data.officePaymentAt)) {
        return { success: false, message: "Office payment date and time are invalid." };
      }
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
      const paidAtTime = toManilaDate(parsed.data.paidAt).getTime();
      const officePaymentTime = new Date(paymentRecord.office_payment_at).getTime();

      if (!Number.isNaN(paidAtTime) && !Number.isNaN(officePaymentTime) && paidAtTime < officePaymentTime) {
        return { success: false, message: "Date of payment cannot be earlier than the scheduled office payment date." };
      }
    }

    const { data: applicationRecord, error: applicationRecordError } = await supabase
      .from("applications")
      .select("id, status, inhouse_installation_completed, applicants(profile_id)")
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
          ? (parsed.data.paidAt ? toManilaISOString(parsed.data.paidAt) : new Date().toISOString())
          : null,
        office_payment_at: parsed.data.status === "scheduled" && parsed.data.officePaymentAt
          ? toManilaISOString(parsed.data.officePaymentAt)
          : undefined,
        due_date: parsed.data.status === "scheduled" && parsed.data.officePaymentAt
          ? parsed.data.officePaymentAt.slice(0, 10)
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

    // Send email asynchronously in the background if payment was marked as paid
    if (parsed.data.status === "paid") {
      const applicantProfileId = (applicationRecord.applicants as any)?.profile_id;
      if (applicantProfileId) {
        (async () => {
          try {
            const adminClient = (await import("@/lib/supabase/server")).createSupabaseAdminClient();
            const { data: userAuth } = await adminClient.auth.admin.getUserById(applicantProfileId);
            const applicantName = (applicationRecord.applicants as any)?.full_name ?? paymentRecord.application_id;
            if (userAuth?.user?.email) {
              await sendWorkflowEmail(
                userAuth.user.email,
                "Payment Approved - BWD Online",
                `<h3>Payment Approved</h3>
                 <p>Your payment for applicant: <b>${applicantName}</b> has been received and verified.</p>
                 <p>Thank you! You can view the receipt in your dashboard.</p>`
              );
            }
          } catch (emailErr) {
            console.error("Failed to send payment approval email in background:", emailErr);
          }
        })();
      }
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin");
    revalidatePath("/applicant");
    revalidatePath("/applicant/payments");
    return { success: true, message: "Payment status updated." };
  });
}
