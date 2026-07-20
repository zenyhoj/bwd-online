"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { sendWorkflowEmail, getAdminEmails } from "./email-server";
import { buildSecureDocumentPath, validateDocumentFile } from "@/lib/security/documents";
import {
  documentReviewSchema,
  documentSubmissionModeSchema,
  documentUploadSchema,
  documentWorkflowNoteSchema
} from "@/schemas";
import type { ActionState, Document } from "@/types";
import {
  getDocumentRequirementRows,
  isDocumentSubmissionLocked,
  requiredDocumentTypes
} from "@/lib/document-workflow";
import { applicationDocumentTypes, documentTypeLabels, type ApplicationDocumentType } from "@/lib/constants";

function isMissingDocumentEnumValue(message?: string | null) {
  return message?.includes("invalid input value for enum document_type") ?? false;
}

function buildVerifiedDocumentAuditList({
  documents,
  submissionMode,
  optionalDocumentTypes,
  classifiedDocumentTypes
}: {
  documents: Document[];
  submissionMode: string;
  optionalDocumentTypes: ApplicationDocumentType[];
  classifiedDocumentTypes: ApplicationDocumentType[];
}) {
  const optionalTypes = new Set(optionalDocumentTypes);
  const classifiedTypes = new Set(classifiedDocumentTypes);

  if (submissionMode === "office") {
    return requiredDocumentTypes.map((type) => ({
      document_id: null,
      document_type: type,
      label: documentTypeLabels[type],
      is_required: true,
      file_name: null,
      status: "verified",
      reviewed_at: null,
      reviewer_id: null,
      source: "office_submission"
    }));
  }

  return getDocumentRequirementRows(documents, optionalDocumentTypes, classifiedDocumentTypes)
    .filter((row) => row.status === "verified")
    .map((row) => ({
      document_id: row.document?.id ?? null,
      document_type: row.type,
      label: row.label,
      is_required: row.isRequired,
      file_name: row.document?.file_name ?? null,
      status: row.status,
      reviewed_at: row.document?.reviewed_at ?? null,
      reviewer_id: row.document?.reviewer_id ?? null,
      source: "online_upload"
    }));
}

function getStatusAfterDocumentReopen(application: {
  inspections?: { status?: string | null }[] | null;
}) {
  const inspections = application.inspections ?? [];

  if (inspections.some((inspection) => inspection.status === "approved")) {
    return "inspection_completed" as const;
  }

  if (inspections.length > 0) {
    return "inspection_scheduled" as const;
  }

  return "submitted" as const;
}

async function getManagedApplication({
  supabase,
  applicationId,
  profileId
}: {
  supabase: Awaited<ReturnType<typeof getActionContext>>["supabase"];
  applicationId: string;
  profileId: string;
}) {
  const { data: applicants, error: applicantsError } = await supabase
    .from("applicants")
    .select("id")
    .eq("profile_id", profileId);

  if (applicantsError || !applicants || applicants.length === 0) {
    return null;
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, applicant_id, status, seminar_completed, optional_document_types, classified_document_types, documents_verified_at")
    .eq("id", applicationId)
    .in("applicant_id", applicants.map((applicant) => applicant.id))
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

    if (isDocumentSubmissionLocked(application.status, application.documents_verified_at)) {
      return { success: false, message: "Documents cannot be uploaded after verification is complete." };
    }

    if (!application.seminar_completed) {
      return {
        success: false,
        message: "Complete the seminar before uploading documents."
      };
    }

    const existingDocument = await supabase
      .from("documents")
      .select("id, status, file_path")
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
      await supabase.storage.from("application-documents").remove([path]);

      if (isMissingDocumentEnumValue(error.message)) {
        return {
          success: false,
          message:
            "The database has not been updated for the new document requirements yet. Please ask the administrator to run supabase/applicant-document-requirements.sql, then try uploading again."
        };
      }

      return { success: false, message: error.message };
    }

    // Explicitly purge the old file from storage to free up space
    if (
      existingDocument.data?.file_path &&
      existingDocument.data.file_path !== path
    ) {
      const { error: removeError } = await supabase.storage
        .from("application-documents")
        .remove([existingDocument.data.file_path]);
      
      if (removeError) {
        console.error("Failed to remove old document file:", removeError);
        // We don't return error here because the new one is already saved
      }
    }

    const { data: allDocs } = await supabase
      .from("documents")
      .select("*")
      .eq("application_id", parsed.data.applicationId);

    const requirementRows = getDocumentRequirementRows(
      allDocs ?? [],
      application.optional_document_types ?? [],
      application.classified_document_types ?? [],
      application.status
    );
    const anyRejected = requirementRows.some((row) => row.isRequired && row.status === "rejected");

    await supabase
      .from("applications")
      .update({
        document_submission_mode: "online",
        ...(anyRejected ? {} : { document_review_note: null })
      })
      .eq("id", parsed.data.applicationId);

    const applicantRes = await supabase.from("applicants").select("full_name").eq("id", application.applicant_id).maybeSingle();
    const applicantName = applicantRes.data?.full_name ?? parsed.data.applicationId;

    // Notify admin
    await sendWorkflowEmail(
      await getAdminEmails(),
      "New Document Uploaded",
      `<h3>New Document Uploaded</h3>
       <p>A new document (<strong>${documentTypeLabels[parsed.data.documentType as ApplicationDocumentType] ?? parsed.data.documentType}</strong>) has been uploaded for applicant: <b>${applicantName}</b>.</p>
       <p>Please review it in the admin dashboard.</p>`
    );

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

    if (isDocumentSubmissionLocked(application.status, application.documents_verified_at)) {
      return {
        success: false,
        message: "The document submission method cannot be changed after verification is complete."
      };
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

export async function reenableDocumentValidationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can re-enable document validation." };
    }

    const parsed = await parseFormData(documentWorkflowNoteSchema, {
      applicationId: formData.get("applicationId"),
      reviewNote: formData.get("reviewNote")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, status, inspections(status)")
      .eq("id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    if (application.status === "converted") {
      return { success: false, message: "Converted applications cannot be sent back to document review." };
    }

    const { error } = await supabase
      .from("applications")
      .update({
        status: getStatusAfterDocumentReopen(application),
        document_review_note: parsed.data.reviewNote,
        documents_verified_at: null,
        documents_verified_by: null
      })
      .eq("id", parsed.data.applicationId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    return { success: true, message: "Document validation re-enabled for this applicant." };
  });
}

export async function updateDocumentRequirementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can change document requirements." };
    }

    const applicationId = formData.get("applicationId");
    const documentType = formData.get("documentType");
    const requirementLevel = formData.get("requirementLevel");

    if (typeof applicationId !== "string" || !applicationId) {
      return { success: false, message: "Invalid application ID." };
    }

    if (
      typeof documentType !== "string" ||
      !applicationDocumentTypes.includes(documentType as ApplicationDocumentType)
    ) {
      return { success: false, message: "Invalid document requirement." };
    }

    if (
      typeof requirementLevel !== "string" ||
      !["unset", "required", "optional"].includes(requirementLevel)
    ) {
      return { success: false, message: "Invalid requirement level." };
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, status, optional_document_types, classified_document_types, documents_verified_at")
      .eq("id", applicationId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    if (isDocumentSubmissionLocked(application.status, application.documents_verified_at)) {
      return { success: false, message: "Document requirements cannot be changed after verification is complete." };
    }

    const optionalTypes = new Set<ApplicationDocumentType>(
      (application.optional_document_types ?? []) as ApplicationDocumentType[]
    );
    const classifiedTypes = new Set<ApplicationDocumentType>(
      (application.classified_document_types ?? []) as ApplicationDocumentType[]
    );
    const typedDocumentType = documentType as ApplicationDocumentType;

    if (requirementLevel === "required") {
      optionalTypes.delete(typedDocumentType);
      classifiedTypes.add(typedDocumentType);
    } else if (requirementLevel === "optional") {
      optionalTypes.add(typedDocumentType);
      classifiedTypes.add(typedDocumentType);
    } else {
      optionalTypes.delete(typedDocumentType);
      classifiedTypes.delete(typedDocumentType);
    }

    const { error } = await supabase
      .from("applications")
      .update({
        optional_document_types: Array.from(optionalTypes),
        classified_document_types: Array.from(classifiedTypes)
      })
      .eq("id", applicationId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    revalidatePath("/applicant/payments");

    return {
      success: true,
      message:
        requirementLevel === "unset"
          ? `${documentTypeLabels[typedDocumentType]} has been reset to Set requirement.`
          : `${documentTypeLabels[typedDocumentType]} is now ${requirementLevel}.`
    };
  });
}

export async function bulkVerifySubmittedDocumentsAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can verify submitted documents." };
    }

    const applicationId = formData.get("applicationId");

    if (typeof applicationId !== "string" || !applicationId) {
      return { success: false, message: "Invalid application ID." };
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, status, optional_document_types, classified_document_types, documents_verified_at")
      .eq("id", applicationId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    if (isDocumentSubmissionLocked(application.status, application.documents_verified_at)) {
      return { success: false, message: "Documents cannot be reviewed after verification is complete." };
    }

    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .eq("application_id", applicationId)
      .eq("organization_id", profile.organization_id);

    if (documentsError) {
      return { success: false, message: documentsError.message };
    }

    const requirementRows = getDocumentRequirementRows(
      documents ?? [],
      (application.optional_document_types ?? []) as ApplicationDocumentType[],
      (application.classified_document_types ?? []) as ApplicationDocumentType[],
      application.status
    );
    const submittedRows = requirementRows.filter((row) => row.document);

    if (submittedRows.length === 0) {
      return { success: false, message: "There are no submitted documents to verify." };
    }

    if (submittedRows.some((row) => !row.isClassified)) {
      return { success: false, message: "Set every submitted document as Required or Not Required first." };
    }

    if (submittedRows.some((row) => row.status === "rejected")) {
      return { success: false, message: "Resolve rejected documents individually before using bulk verification." };
    }

    const pendingDocumentIds = submittedRows
      .filter((row) => row.status === "pending")
      .map((row) => row.document!.id);

    if (pendingDocumentIds.length === 0) {
      return { success: false, message: "All submitted documents have already been reviewed." };
    }

    const reviewedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "verified",
        review_notes: null,
        reviewer_id: profile.id,
        reviewed_at: reviewedAt
      })
      .in("id", pendingDocumentIds)
      .eq("organization_id", profile.organization_id);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/payments");
    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    revalidatePath("/applicant/payments");

    return {
      success: true,
      message: `${pendingDocumentIds.length} submitted document${pendingDocumentIds.length === 1 ? "" : "s"} verified.`
    };
  });
}

export async function reviewDocumentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can review documents." };
    }

    const parsed = await parseFormData(documentReviewSchema, {
      documentId: formData.get("documentId"),
      status: formData.get("status"),
      reviewNotes: formData.get("reviewNotes")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, application_id, organization_id, document_type, file_path")
      .eq("id", parsed.data.documentId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (documentError || !document) {
      return { success: false, message: documentError?.message ?? "Document not found." };
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, status, optional_document_types, classified_document_types, documents_verified_at, inspections(status)")
      .eq("id", document.application_id)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    if (isDocumentSubmissionLocked(application.status, application.documents_verified_at)) {
      return { success: false, message: "Documents cannot be reviewed after verification is complete." };
    }

    const typedDocumentType = document.document_type as ApplicationDocumentType;
    const classifiedTypes = new Set(
      (application.classified_document_types ?? []) as ApplicationDocumentType[]
    );
    const optionalTypes = new Set(
      (application.optional_document_types ?? []) as ApplicationDocumentType[]
    );

    if (!classifiedTypes.has(typedDocumentType)) {
      return { success: false, message: "Set this document as Required or Not Required before reviewing it." };
    }

    if (optionalTypes.has(typedDocumentType)) {
      return { success: false, message: "Documents marked Not Required do not need a valid or invalid review." };
    }

    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from("documents")
      .update({
        status: parsed.data.status,
        review_notes: parsed.data.reviewNotes,
        reviewer_id: profile.id,
        reviewed_at: reviewedAt
      })
      .eq("id", parsed.data.documentId);

    if (error) {
      return { success: false, message: error.message };
    }

    if (parsed.data.status === "rejected") {
      const { error: removeError } = await supabase.storage
        .from("application-documents")
        .remove([document.file_path]);

      if (removeError) {
        console.error("Failed to remove rejected document file:", removeError);
        // Do not return error here, the document status is already updated
      }
    }

    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .eq("application_id", document.application_id)
      .eq("organization_id", profile.organization_id);

    if (documentsError) {
      return { success: false, message: documentsError.message };
    }

    const requirementRows = getDocumentRequirementRows(
      documents ?? [],
      (application.optional_document_types ?? []) as ApplicationDocumentType[],
      (application.classified_document_types ?? []) as ApplicationDocumentType[],
      application.status
    );
    const reviewedRequirement = requirementRows.find((row) => row.type === document.document_type);
    const requiredRows = requirementRows.filter((row) => row.isRequired);
    const allDocumentsVerified = requiredRows.every((row) => row.status === "verified");
    const anyRejected = requiredRows.some((row) => row.status === "rejected");
    const allUploadedDocumentsClassified = requirementRows.every((row) => !row.document || row.isClassified);

    let applicationUpdate: Record<string, unknown> | null = null;

    if (parsed.data.status === "rejected" && reviewedRequirement?.isRequired) {
      applicationUpdate = {
        status: getStatusAfterDocumentReopen(application),
        document_review_note: `Please reupload ${documentTypeLabels[document.document_type as ApplicationDocumentType] ?? "the selected document"}: ${parsed.data.reviewNotes ?? ""}`,
        documents_verified_at: null,
        documents_verified_by: null
      };

      // Send email to notify the user of the required action
      try {
        const adminClient = (await import("@/lib/supabase/server")).createSupabaseAdminClient();
        const { data: applicationData } = await adminClient
          .from("applications")
          .select("applicants(profile_id)")
          .eq("id", document.application_id)
          .single();
        
        const applicantProfileId = (applicationData?.applicants as any)?.profile_id;
        if (applicantProfileId) {
          const { data: userAuth } = await adminClient.auth.admin.getUserById(applicantProfileId);
          if (userAuth?.user?.email) {
            await sendWorkflowEmail(
              userAuth.user.email,
              "Action Required: Document Update Needed - BWD Online",
              `<h3>Action Required</h3>
               <p>A document you submitted (<strong>${documentTypeLabels[document.document_type as ApplicationDocumentType] ?? "the selected document"}</strong>) requires your attention.</p>
               <p><strong>Note from reviewer:</strong> ${parsed.data.reviewNotes}</p>
               <p>Please log in to BWD Online to re-upload the required document.</p>`
            );
          }
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    } else if (allDocumentsVerified && allUploadedDocumentsClassified) {
      applicationUpdate = {
        ...(application.inspections?.some((inspection) => inspection.status === "approved")
          ? { status: "documents_verified" }
          : {}),
        document_review_note: null,
        documents_verified_at: reviewedAt,
        documents_verified_by: profile.id
      };

      try {
        const adminClient = (await import("@/lib/supabase/server")).createSupabaseAdminClient();
        const { data: applicationData } = await adminClient
          .from("applications")
          .select("applicants(profile_id)")
          .eq("id", document.application_id)
          .single();
        
        const applicantProfileId = (applicationData?.applicants as any)?.profile_id;
        if (applicantProfileId) {
          const { data: userAuth } = await adminClient.auth.admin.getUserById(applicantProfileId);
          if (userAuth?.user?.email) {
            await sendWorkflowEmail(
              userAuth.user.email,
              "Documents Verified - BWD Online",
              `<h3>Documents Verified</h3>
               <p>All of your required documents have been successfully verified!</p>
               <p>Please log in to BWD Online to proceed with your payment or next steps.</p>`
            );
          }
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    } else if (!anyRejected) {
      applicationUpdate = {
        document_review_note: null
      };
    }

    if (applicationUpdate) {
      const { error: applicationError } = await supabase
        .from("applications")
        .update(applicationUpdate)
        .eq("id", document.application_id)
        .eq("organization_id", profile.organization_id);

      if (applicationError) {
        return { success: false, message: applicationError.message };
      }
    }

    revalidatePath("/admin");
    revalidatePath("/applicant");
    revalidatePath("/applicant/documents");
    return { success: true, message: "Document review saved." };
  });
}

export async function completeDocumentVerificationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Unauthorized." };
    }

    const applicationId = formData.get("applicationId");

    if (typeof applicationId !== "string" || !applicationId) {
      return { success: false, message: "Invalid application ID." };
    }

    // Verify application exists and belongs to the admin's organization
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, organization_id, applicant_id, status, full_name, document_submission_mode, optional_document_types, classified_document_types, document_review_note, documents_verified_at, documents_verified_by, inspections(status)")
      .eq("id", applicationId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (applicationError || !application) {
      return { success: false, message: applicationError?.message ?? "Application not found." };
    }

    if (isDocumentSubmissionLocked(application.status, application.documents_verified_at)) {
      return { success: false, message: "Document verification is already complete." };
    }

    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .eq("application_id", applicationId)
      .eq("organization_id", profile.organization_id);

    if (documentsError) {
      return { success: false, message: documentsError.message };
    }

    if (application.document_submission_mode !== "office") {
      const requiredRows = getDocumentRequirementRows(
        documents ?? [],
        (application.optional_document_types ?? []) as ApplicationDocumentType[],
        (application.classified_document_types ?? []) as ApplicationDocumentType[],
        application.status
      );

      if (requiredRows.some((row) => row.document && !row.isClassified)) {
        return { success: false, message: "Set every uploaded document as Required or Not Required before completing verification." };
      }

      if (requiredRows.some((row) => row.isRequired && (!row.document || row.status !== "verified"))) {
        return { success: false, message: "Verify every required document before completing verification." };
      }
    }

    const isOfficeSubmission = application.document_submission_mode === "office";
    const hasApprovedInspection = application.inspections?.some((inspection) => inspection.status === "approved") ?? false;
    const verifiedAt = new Date().toISOString();
    const verificationUpdate = {
      ...(hasApprovedInspection ? { status: "documents_verified" as const } : {}),
      document_review_note: null,
      documents_verified_at: verifiedAt,
      documents_verified_by: profile.id,
      ...(isOfficeSubmission
        ? {
            optional_document_types: [] as ApplicationDocumentType[],
            classified_document_types: [...applicationDocumentTypes]
          }
        : {})
    };

    const { error: updateError } = await supabase
      .from("applications")
      .update(verificationUpdate)
      .eq("id", applicationId)
      .eq("organization_id", profile.organization_id);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    const { error: auditError } = await supabase
      .from("document_verification_audit_logs")
      .insert({
        organization_id: application.organization_id,
        application_id: application.id,
        applicant_id: application.applicant_id,
        applicant_name: application.full_name,
        admin_account_id: profile.id,
        admin_account_name: profile.full_name,
        date_verified: verifiedAt,
        list_of_verified_documents: buildVerifiedDocumentAuditList({
          documents: documents ?? [],
          submissionMode: application.document_submission_mode,
          optionalDocumentTypes: (application.optional_document_types ?? []) as ApplicationDocumentType[],
          classifiedDocumentTypes: (application.classified_document_types ?? []) as ApplicationDocumentType[]
        })
      });

    if (auditError) {
      const { error: rollbackError } = await supabase
        .from("applications")
        .update({
          status: application.status,
          document_review_note: application.document_review_note,
          documents_verified_at: application.documents_verified_at,
          documents_verified_by: application.documents_verified_by,
          optional_document_types: application.optional_document_types,
          classified_document_types: application.classified_document_types
        })
        .eq("id", applicationId)
        .eq("organization_id", profile.organization_id);

      if (rollbackError) {
        console.error("Failed to roll back document verification after audit error:", rollbackError);
      }

      return { success: false, message: auditError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/applicant");
    return {
      success: true,
      message: isOfficeSubmission
        ? "All physical documents were confirmed and verified."
        : "Document verification completed."
    };
  });
}
