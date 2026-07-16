import { applicationDocumentTypes, documentTypeLabels } from "@/lib/constants";
import type { Application, Document, DocumentStatus, Payment } from "@/types";
import type { ApplicationDocumentType } from "@/lib/constants";

export const requiredDocumentTypes = applicationDocumentTypes;

const documentSubmissionLockedStatuses = new Set([
  "documents_verified",
  "payment_scheduled",
  "approved",
  "converted"
]);

export function isDocumentSubmissionLocked(status: string, documentsVerifiedAt?: string | null) {
  return Boolean(documentsVerifiedAt) || documentSubmissionLockedStatuses.has(status);
}

type ApplicationDocumentWorkflowInput = Partial<
  Pick<Application, "document_submission_mode" | "optional_document_types" | "classified_document_types" | "document_review_note" | "documents_verified_at" | "status">
> | null | undefined;

export type DocumentRequirementRow = {
  type: ApplicationDocumentType;
  label: string;
  document: Document | null;
  isRequired: boolean;
  isClassified: boolean;
  status: DocumentStatus | "missing";
  reviewNote: string | null;
};

export type WacoPrintEligibilityReason =
  | "online_documents_incomplete"
  | "office_documents_unverified"
  | null;

export type WacoPrintEligibility = {
  allowed: boolean;
  reason: WacoPrintEligibilityReason;
};

export function getDocumentRequirementRows(
  documents: Document[],
  optionalDocumentTypes: readonly string[] = [],
  classifiedDocumentTypes: readonly string[] = [],
  applicationStatus?: string
): DocumentRequirementRow[] {
  const optionalTypes = new Set(optionalDocumentTypes);
  const classifiedTypes = new Set(classifiedDocumentTypes);
  const legacyVerifiedTypes = isDocumentSubmissionLocked(applicationStatus ?? "")
    ? new Set(
        documents
          .filter((document) => document.status === "verified")
          .map((document) => document.document_type)
      )
    : new Set<string>();

  return requiredDocumentTypes.map((type) => {
    const isClassified = classifiedTypes.has(type) || legacyVerifiedTypes.has(type);
    const latestDocument =
      [...documents]
        .filter((document) => document.document_type === type)
        .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())[0] ??
      null;

    return {
      type,
      label: documentTypeLabels[type],
      document: latestDocument,
      isRequired: isClassified && !optionalTypes.has(type),
      isClassified,
      status: latestDocument?.status ?? "missing",
      reviewNote: latestDocument?.review_notes ?? null
    } satisfies DocumentRequirementRow;
  });
}

export function isOfficeDocumentSubmission(application: ApplicationDocumentWorkflowInput) {
  return application?.document_submission_mode === "office";
}

export function areDocumentsReadyForPayment(application: ApplicationDocumentWorkflowInput) {
  const readyStatuses = [
    "documents_verified",
    "payment_scheduled",
    "approved",
    "converted"
  ];

  return Boolean(application?.documents_verified_at) || Boolean(application?.status && readyStatuses.includes(application.status));
}

export function getWacoPrintEligibility({
  application,
  documents,
  payments = []
}: {
  application: ApplicationDocumentWorkflowInput;
  documents: Document[];
  payments?: Array<Pick<Payment, "status">>;
}): WacoPrintEligibility {
  if (payments.some((payment) => payment.status === "paid")) {
    return { allowed: true, reason: null };
  }

  if (isOfficeDocumentSubmission(application)) {
    return areDocumentsReadyForPayment(application)
      ? { allowed: true, reason: null }
      : { allowed: false, reason: "office_documents_unverified" };
  }

  return areDocumentsReadyForPayment(application)
    ? { allowed: true, reason: null }
    : { allowed: false, reason: "online_documents_incomplete" };
}
