"use client";

import { useActionState, useState } from "react";

import { reviewDocumentAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { DocumentPreview } from "@/components/shared/document-preview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Document } from "@/types";

type DocumentReviewFormProps = {
  document: Document;
  showPreview?: boolean;
};

export function DocumentReviewForm({ document, showPreview = true }: DocumentReviewFormProps) {
  const [state, formAction, pending] = useActionState(reviewDocumentAction, initialActionState);
  const [status, setStatus] = useState(document.status === "pending" ? "verified" : document.status);
  const isRejected = status === "rejected";

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border p-4">
      <input type="hidden" name="documentId" value={document.id} />
      {showPreview ? (
        <div className="space-y-3">
          <DocumentPreview document={document} compact />
        </div>
      ) : null}
      <input type="hidden" name="status" value={status} />
      <div className="space-y-2">
        <Label>Document check</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStatus("verified")}
            className={cn(
              "flex min-h-[72px] flex-col rounded-lg border px-4 py-3 text-left transition-colors",
              status === "verified"
                ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                : "border-input bg-background hover:bg-accent/10"
            )}
            aria-pressed={status === "verified"}
          >
            <span className="text-sm font-semibold">Valid</span>
            <span className="text-sm text-muted-foreground">Approve this upload and keep the workflow moving.</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("rejected")}
            className={cn(
              "flex min-h-[72px] flex-col rounded-lg border px-4 py-3 text-left transition-colors",
              status === "rejected"
                ? "border-destructive bg-destructive/10 text-foreground"
                : "border-input bg-background hover:bg-accent/10"
            )}
            aria-pressed={status === "rejected"}
          >
            <span className="text-sm font-semibold">Invalid</span>
            <span className="text-sm text-muted-foreground">Ask the applicant to reupload or complete this document.</span>
          </button>
        </div>
      </div>
      {isRejected ? (
        <div className="space-y-2">
          <Label htmlFor={`reviewNotes-${document.id}`}>Reason for invalid document</Label>
          <Textarea
            id={`reviewNotes-${document.id}`}
            name="reviewNotes"
            defaultValue={document.review_notes ?? ""}
            placeholder="Explain what is incorrect, missing, or needs to be reuploaded."
            required
          />
        </div>
      ) : (
        <input type="hidden" name="reviewNotes" value="" />
      )}
      <FormMessage state={state} />
      <Button type="submit" loading={pending}>
        Save review
      </Button>
    </form>
  );
}
