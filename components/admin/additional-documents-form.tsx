"use client";

import { useActionState } from "react";
import { FileWarning, RotateCcw } from "lucide-react";

import { reenableDocumentValidationAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AdditionalDocumentsFormProps = {
  applicationId: string;
  reviewNote?: string | null;
};

export function AdditionalDocumentsForm({ applicationId, reviewNote }: AdditionalDocumentsFormProps) {
  const [state, formAction, pending] = useActionState(reenableDocumentValidationAction, initialActionState);

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-2xl border border-amber-500/25 bg-background shadow-sm"
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="flex items-start gap-3 border-b border-amber-500/15 bg-amber-500/[0.06] px-4 py-4 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <FileWarning className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-base font-semibold text-foreground">Re-enable document validation</p>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Reopen uploads when an office check finds a missing requirement after verification. Existing valid
            documents remain verified.
          </p>
        </div>
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-2">
          <Label htmlFor={`additional-document-note-${applicationId}`} className="text-sm font-medium text-foreground">
            Instructions for the applicant
          </Label>
          <Textarea
            id={`additional-document-note-${applicationId}`}
            name="reviewNote"
            defaultValue={reviewNote ?? ""}
            placeholder="Example: Please upload your updated barangay clearance and latest proof of billing."
            className="min-h-24 resize-y border-border/80 bg-muted/10 placeholder:text-muted-foreground/80 focus-visible:ring-amber-500/40"
            required
          />
        </div>
        <FormMessage state={state} />
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted-foreground">
            The applicant will regain upload access after this action.
          </p>
          <Button
            type="submit"
            loading={pending}
            className="w-full bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400 hover:brightness-100 sm:w-auto dark:bg-amber-400 dark:hover:bg-amber-300"
          >
            <RotateCcw className="h-4 w-4" />
            Re-enable validation
          </Button>
        </div>
      </div>
    </form>
  );
}
