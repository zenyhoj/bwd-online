"use client";

import { useActionState } from "react";

import { reenableDocumentValidationAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AdditionalDocumentsFormProps = {
  applicationId: string;
  reviewNote?: string | null;
};

export function AdditionalDocumentsForm({ applicationId, reviewNote }: AdditionalDocumentsFormProps) {
  const [state, formAction, pending] = useActionState(reenableDocumentValidationAction, initialActionState);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <p className="font-medium text-amber-950">Re-enable document validation</p>
        <p className="text-sm text-amber-900/80">
          Use this when documents were already marked complete, but the manual office check finds a lacking
          requirement. Existing valid uploads stay verified while the applicant gets upload access again.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`additional-document-note-${applicationId}`}>Missing document instructions</Label>
        <textarea
          id={`additional-document-note-${applicationId}`}
          name="reviewNote"
          defaultValue={reviewNote ?? ""}
          placeholder="Example: Please upload your updated barangay clearance and latest proof of billing."
          className="min-h-24 w-full rounded-md border border-amber-200 bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" loading={pending} variant="outline" className="border-amber-300 bg-background">
        Re-enable validation
      </Button>
    </form>
  );
}
