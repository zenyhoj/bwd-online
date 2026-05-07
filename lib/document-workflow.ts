import { documentTypeLabels } from "@/lib/constants";
import type { Application, Document, DocumentStatus, DocumentType } from "@/types";

export const requiredDocumentTypes = Object.keys(documentTypeLabels) as DocumentType[];

type ApplicationDocumentWorkflowInput = Partial<
  Pick<Application, "document_submission_mode" | "document_review_note">
> | null | undefined;

export type DocumentRequirementRow = {
  type: DocumentType;
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

export function areDocumentsReadyForPayment(application: ApplicationDocumentWorkflowInput, documents: Document[]) {
  if (isOfficeDocumentSubmission(application)) {
    return true;
  }

  return getDocumentRequirementRows(documents).every((row) => row.status === "verified");
}
