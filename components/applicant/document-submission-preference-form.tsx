"use client";

import { useActionState } from "react";

import { setDocumentSubmissionModeAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";

type DocumentSubmissionPreferenceFormProps = {
  applicationId: string;
  submissionMode: string;
};

export function DocumentSubmissionPreferenceForm({
  applicationId,
  submissionMode
}: DocumentSubmissionPreferenceFormProps) {
  const [state, officeAction, officePending] = useActionState(setDocumentSubmissionModeAction, initialActionState);
  const [, onlineAction, onlinePending] = useActionState(setDocumentSubmissionModeAction, initialActionState);

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div>
        <p className="font-medium">Having trouble uploading?</p>
        <p className="text-sm text-muted-foreground">
          If connectivity is unstable, let BWD know that you will bring the documents to the office instead.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={officeAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="submissionMode" value="office" />
          <Button type="submit" variant={submissionMode === "office" ? "secondary" : "outline"} disabled={officePending}>
            Bring documents to office
          </Button>
        </form>
        <form action={onlineAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="submissionMode" value="online" />
          <Button type="submit" variant={submissionMode === "online" ? "secondary" : "outline"} disabled={onlinePending}>
            Continue online upload
          </Button>
        </form>
      </div>

      {submissionMode === "office" ? (
        <p className="text-sm text-muted-foreground">
          BWD has been informed that you will bring the documentary requirements to the office.
        </p>
      ) : null}

      <FormMessage state={state} />
    </div>
  );
}
