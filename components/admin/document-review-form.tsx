"use client";

import { useActionState } from "react";

import { reviewDocumentAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { getDocumentDownloadHref } from "@/lib/document-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Document } from "@/types";

type DocumentReviewFormProps = {
  document: Document;
};

export function DocumentReviewForm({ document }: DocumentReviewFormProps) {
  const [state, formAction, pending] = useActionState(reviewDocumentAction, initialActionState);

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border p-4">
      <input type="hidden" name="documentId" value={document.id} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">{document.file_name}</p>
          <a
            href={getDocumentDownloadHref(document.id)}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            View file
          </a>
        </div>
        <select
          name="status"
          defaultValue={document.status === "pending" ? "verified" : document.status}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="verified">Verify</option>
          <option value="rejected">Reject</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`reviewNotes-${document.id}`}>Review notes</Label>
        <Input id={`reviewNotes-${document.id}`} name="reviewNotes" required />
      </div>
      <FormMessage state={state} />
      <Button type="submit" loading={pending}>
        Save review
      </Button>
    </form>
  );
}
