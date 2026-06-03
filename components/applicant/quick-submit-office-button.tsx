"use client";

import { useActionState } from "react";
import { setDocumentSubmissionModeAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { Button } from "@/components/ui/button";

type QuickSubmitOfficeButtonProps = {
  applicationId: string;
  submissionMode?: string;
};

export function QuickSubmitOfficeButton({ applicationId, submissionMode }: QuickSubmitOfficeButtonProps) {
  const [, officeAction, officePending] = useActionState(setDocumentSubmissionModeAction, initialActionState);

  const isOffice = submissionMode === "office";
  const newMode = isOffice ? "online" : "office";

  return (
    <form action={officeAction}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="submissionMode" value={newMode} />
      <Button 
        type="submit" 
        variant={isOffice ? "secondary" : "outline"} 
        disabled={officePending} 
        className={`h-10 w-full text-xs font-bold md:w-auto md:text-sm ${isOffice ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300" : ""}`}
      >
        {officePending 
          ? "Switching..." 
          : isOffice 
            ? "Switch back to online upload" 
            : "Submit in office"}
      </Button>
    </form>
  );
}
