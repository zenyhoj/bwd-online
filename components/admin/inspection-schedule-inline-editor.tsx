"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import { rescheduleInspectionAction } from "@/actions/inspections";
import { initialActionState } from "@/actions/state";
import { BusinessDateTimeInput } from "@/components/admin/business-datetime-input";
import { Button } from "@/components/ui/button";

type InspectionScheduleInlineEditorProps = {
  inspectionId: string;
  scheduledAt: string | null;
};

function toLocalDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function InspectionScheduleInlineEditor({
  inspectionId,
  scheduledAt
}: InspectionScheduleInlineEditorProps) {
  const initialValue = useMemo(() => toLocalDateTime(scheduledAt), [scheduledAt]);
  const [value, setValue] = useState(initialValue);
  const [state, formAction, pending] = useActionState(rescheduleInspectionAction, initialActionState);
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const [messageIsSuccess, setMessageIsSuccess] = useState(false);
  const hasChanged = value !== initialValue;

  useEffect(() => {
    if (!state.message) {
      return;
    }

    setVisibleMessage(state.message);
    setMessageIsSuccess(Boolean(state.success));

    const timeoutId = window.setTimeout(() => {
      setVisibleMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [state.message, state.success]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="inspectionId" value={inspectionId} />
      <div className="flex items-center gap-2">
        <BusinessDateTimeInput
          name="scheduledAt"
          id={`inline-scheduled-${inspectionId}`}
          value={value}
          onValueChange={setValue}
          compact
          required
        />
        {hasChanged ? (
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" aria-label="Update schedule" title="Update schedule" loading={pending}>
            <Check className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {visibleMessage ? (
        <p className={`text-xs ${messageIsSuccess ? "text-emerald-700" : "text-destructive"}`}>{visibleMessage}</p>
      ) : null}
    </form>
  );
}
