import { applicationDocumentTypes, documentTypeLabels } from "@/lib/constants";
import type { Application, Document, DocumentStatus } from "@/types";
import type { ApplicationDocumentType } from "@/lib/constants";

export const requiredDocumentTypes = applicationDocumentTypes;

type ApplicationDocumentWorkflowInput = Partial<
  Pick<Application, "document_submission_mode" | "document_review_note" | "status">
> | null | undefined;

export type DocumentRequirementRow = {
  type: ApplicationDocumentType;
  label: string;
  document: Document | null;
  status: DocumentStatus | "missing";
  reviewNote: string | null;
};

export function getDocumentRequirementRows(documents: Document[]): DocumentRequirementRow[] {
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
