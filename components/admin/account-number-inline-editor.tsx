"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";

import { updateAccountNumberByAdminAction } from "@/actions/inspections";
import { initialActionState } from "@/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AccountNumberInlineEditorProps = {
  applicationId: string;
  inspectionId?: string | null;
  accountNumber?: string | null;
};

export function AccountNumberInlineEditor({
  applicationId,
  inspectionId,
  accountNumber
}: AccountNumberInlineEditorProps) {
  const currentAccNum = accountNumber ?? "";
  const [value, setValue] = useState(currentAccNum);
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateAccountNumberByAdminAction, initialActionState);
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const [messageIsSuccess, setMessageIsSuccess] = useState(false);

  const hasChanged = value !== currentAccNum;

  useEffect(() => {
    if (!state.message) {
      return;
    }

    setVisibleMessage(state.message);
    setMessageIsSuccess(Boolean(state.success));

    if (state.success) {
      setIsEditing(false);
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleMessage(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [state.message, state.success]);

  if (!isEditing) {
    return (
      <div className="group flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">
          {currentAccNum || "Not assigned yet"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setIsEditing(true)}
          title="Edit account number"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        {visibleMessage ? (
          <span className={`text-xs ${messageIsSuccess ? "text-emerald-700" : "text-destructive"}`}>
            {visibleMessage}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5 mt-1">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="inspectionId" value={inspectionId ?? ""} />
      <div className="flex items-center gap-2 max-w-xs">
        <Input
          name="accountNumber"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm font-mono"
          placeholder="0441-12-031"
          pattern="\d{4}-\d{2}-\d{3}"
          title="Account number must be in XXXX-XX-XXX format (e.g. 0441-12-031)"
          required
        />
        <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!hasChanged} loading={pending} title="Save account number">
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => {
            setIsEditing(false);
            setValue(currentAccNum);
          }}
        >
          Cancel
        </Button>
      </div>
      {visibleMessage ? (
        <p className={`text-xs ${messageIsSuccess ? "text-emerald-700" : "text-destructive"}`}>
          {visibleMessage}
        </p>
      ) : null}
    </form>
  );
}
