import { applicationDocumentTypes, documentTypeLabels } from "@/lib/constants";
import type { Application, Document, DocumentStatus, Payment } from "@/types";
import type { ApplicationDocumentType } from "@/lib/constants";

export const requiredDocumentTypes = applicationDocumentTypes;

type ApplicationDocumentWorkflowInput = Partial<
  Pick<Application, "document_submission_mode" | "optional_document_types" | "document_review_note" | "status">
> | null | undefined;

export type DocumentRequirementRow = {
  type: ApplicationDocumentType;
  label: string;
  document: Document | null;
  isRequired: boolean;
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
  optionalDocumentTypes: readonly string[] = []
): DocumentRequirementRow[] {
  const optionalTypes = new Set(optionalDocumentTypes);

  return requiredDocumentTypes.map((type) => {
    const latestDocument =
      [...documents]
        .filter((document) => document.document_type === type)
        .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())[0] ??
      null;

    return {
      type,
      label: documentTypeLabels[type],
      document: latestDocument,
      isRequired: !optionalTypes.has(type),
      status: latestDocument?.status ?? "missing",
      reviewNote: latestDocument?.review_notes ?? null
    } satisfies DocumentRequirementRow;
  });
}

export function isOfficeDocumentSubmission(application: ApplicationDocumentWorkflowInput) {
  return application?.document_submission_mode === "office";
}

export function areDocumentsReadyForPayment(application: ApplicationDocumentWorkflowInput) {
  // Office document submissions still need to be verified by the admin
  // so we wait for the documents_verified status.

  const readyStatuses = [
    "documents_verified",
    "payment_scheduled",
    "approved"
  ];

  return application?.status ? readyStatuses.includes(application.status) : false;
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

  const allRequiredDocumentsUploaded = getDocumentRequirementRows(
    documents,
    application?.optional_document_types ?? []
  )
    .filter((row) => row.isRequired)
    .every((row) => Boolean(row.document));

  return allRequiredDocumentsUploaded
    ? { allowed: true, reason: null }
    : { allowed: false, reason: "online_documents_incomplete" };
}
