"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";

import { updateApplicantAddressByAdminAction } from "@/actions/applicants";
import { initialActionState } from "@/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApplicantAddressInlineEditorProps = {
  applicantId: string;
  address: string;
};

export function ApplicantAddressInlineEditor({
  applicantId,
  address
}: ApplicantAddressInlineEditorProps) {
  const [value, setValue] = useState(address || "");
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateApplicantAddressByAdminAction, initialActionState);
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const [messageIsSuccess, setMessageIsSuccess] = useState(false);

  const hasChanged = value !== address;

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
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [state.message, state.success]);

  if (!isEditing) {
    return (
      <div className="group flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{address || "No address provided"}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setIsEditing(true)}
          title="Edit address"
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
      <input type="hidden" name="applicantId" value={applicantId} />
      <div className="flex items-center gap-2 max-w-md">
        <Input
          name="address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm"
          placeholder="Enter complete address"
          required
        />
        <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!hasChanged} loading={pending} title="Save address">
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => {
          setIsEditing(false);
          setValue(address);
        }}>
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
