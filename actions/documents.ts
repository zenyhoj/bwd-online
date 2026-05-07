"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { buildSecureDocumentPath, validateDocumentFile } from "@/lib/security/documents";
import {
  documentReviewSchema,
  documentSubmissionModeSchema,
  documentUploadSchema,
  documentWorkflowNoteSchema
} from "@/schemas";
import type { ActionState } from "@/types";

async function getManagedApplication({
  supabase,
  applicationId,
  profileId
}: {
  supabase: Awaited<ReturnType<typeof getActionContext>>["supabase"];
  applicationId: string;
  profileId: string;
}) {
  const { data: applicant } = await supabase
    .from("applicants")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!applicant) {
    return null;
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, applicant_id")
    .eq("id", applicationId)
    .eq("applicant_id", applicant.id)
    .maybeSingle();

  return application ?? null;
}

export async function uploadDocumentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(documentUploadSchema, {
      applicationId: formData.get("applicationId"),
      documentType: formData.get("documentType")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, message: "A file is required." };
    }

    const application = await getManagedApplication({
      supabase,
      applicationId: parsed.data.applicationId,
      profileId: profile.id
    });

    if (!application) {
      return { success: false, message: "You are not allowed to upload documents for this application." };
    }

    const existingDocument = await supabase
      .from("documents")
      .select("id, status")
      .eq("application_id", parsed.data.applicationId)
      .eq("document_type", parsed.data.documentType)
      .maybeSingle();

    if (existingDocument.data && existingDocument.data.status !== "rejected") {
      return {
        success: false,
        message: "A document for this requirement already exists. Contact the administrator if it needs to be replaced."
      };
    }

    const validatedFile = await validateDocumentFile(file);
    const path = buildSecureDocumentPath(profile.id, parsed.data.applicationId, validatedFile.extension);
    const { error: uploadError } = await supabase.storage.from("application-documents").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: validatedFile.mimeType
    });

    if (uploadError) {
      return { success: false, message: uploadError.message };
    }

    const payload = {
      organization_id: profile.organization_id,
      application_id: parsed.data.applicationId,
      applicant_id: application.applicant_id,
      document_type: parsed.data.documentType,
      file_path: path,
      file_url: path,
      file_name: validatedFile.sanitizedFileName,
      mime_type: validatedFile.mimeType,
      size_bytes: file.size,
      status: "pending" as const,
      reviewer_id: null,
      reviewed_at: null,
      review_notes: null
    };

    const { error } = existingDocument.data
      ? await supabase.from("documents").update(payload).eq("id", existingDocument.data.id)
      : await supabase.from("documents").insert(payload);

    if (error) {
      return { success: false, message: error.message };
    }

    await supabase
      .from("applications")
      .update({
        document_submission_mode: "online"
      })
      .eq("id", parsed.data.applicationId);

    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    return { success: true, message: "Document uploaded successfully." };
  });
}

export async function setDocumentSubmissionModeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(documentSubmissionModeSchema, {
      applicationId: formData.get("applicationId"),
      submissionMode: formData.get("submissionMode")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const application = await getManagedApplication({
      supabase,
      applicationId: parsed.data.applicationId,
      profileId: profile.id
    });

    if (!application) {
      return { success: false, message: "You are not allowed to update this document preference." };
    }

    const { error } = await supabase
      .from("applications")
      .update({
        document_submission_mode: parsed.data.submissionMode
      })
      .eq("id", parsed.data.applicationId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    return {
      success: true,
      message:
        parsed.data.submissionMode === "office"
          ? "BWD has been informed that you will bring the documents to the office."
          : "Document submission preference updated."
    };
  });
}

export async function updateDocumentWorkflowNoteAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can update document review notes." };
    }

    const parsed = await parseFormData(documentWorkflowNoteSchema, {
      applicationId: formData.get("applicationId"),
      reviewNote: formData.get("reviewNote")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        document_review_note: parsed.data.reviewNote
      })
      .eq("id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    return { success: true, message: "Document note saved." };
  });
}

export async function reviewDocumentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(documentReviewSchema, {
      documentId: formData.get("documentId"),
      status: formData.get("status"),
      reviewNotes: formData.get("reviewNotes")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { error } = await supabase
      .from("documents")
      .update({
        status: parsed.data.status,
        review_notes: parsed.data.reviewNotes,
        reviewer_id: profile.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", parsed.data.documentId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    return { success: true, message: "Document review saved." };
  });
}
