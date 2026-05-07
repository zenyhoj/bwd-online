"use client";

import { useActionState } from "react";

import { updateDocumentWorkflowNoteAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DocumentWorkflowNoteFormProps = {
  applicationId: string;
  reviewNote?: string | null;
  submissionMode?: string | null;
};

export function DocumentWorkflowNoteForm({
  applicationId,
  reviewNote,
  submissionMode
}: DocumentWorkflowNoteFormProps) {
  const [state, formAction, pending] = useActionState(updateDocumentWorkflowNoteAction, initialActionState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">Document verification note</p>
          <p className="text-sm text-muted-foreground">
            Add instructions for missing or incorrect documents. The applicant will see this note.
          </p>
        </div>
        <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
          Submission mode: {submissionMode === "office" ? "Bring to office" : "Online upload"}
        </span>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`document-review-note-${applicationId}`}>Note</Label>
        <textarea
          id={`document-review-note-${applicationId}`}
          name="reviewNote"
          defaultValue={reviewNote ?? ""}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" loading={pending}>
        Save note
      </Button>
    </form>
  );
}
