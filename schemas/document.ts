import { z } from "zod";

export const documentUploadTypeSchema = z.enum([
  "owner_valid_id",
  "representative_authorization_letter",
  "representative_valid_id",
  "organization_spa",
  "lot_title",
  "tax_declaration",
  "deed_of_sale",
  "lot_owner_authorization",
  "lot_owner_valid_id",
  "water_permit_receipt"
]);

export const documentUploadSchema = z.object({
  applicationId: z.string().uuid(),
  documentType: documentUploadTypeSchema
});

export const documentReviewSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
  reviewNotes: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
    z.string().trim().min(3).nullable()
  )
}).superRefine((value, context) => {
  if (value.status === "rejected" && !value.reviewNotes) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reviewNotes"],
      message: "Add a note so the applicant knows what to reupload."
    });
  }
});

export const documentSubmissionModeSchema = z.object({
  applicationId: z.string().uuid(),
  submissionMode: z.enum(["online", "office"])
});

export const documentWorkflowNoteSchema = z.object({
  applicationId: z.string().uuid(),
  reviewNote: z.string().trim().min(3)
});
