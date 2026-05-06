"use client";

import { useActionState, useEffect } from "react";

import { markWaterMeterInstalledAction } from "@/actions/water-meter";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";

type WaterMeterCompletionFormProps = {
  applicationId: string;
  scheduledAt: string;
};

const initialState = { success: false, message: "" };

export function WaterMeterCompletionForm({ applicationId, scheduledAt }: WaterMeterCompletionFormProps) {
  const [state, formAction, pending] = useActionState(markWaterMeterInstalledAction, initialState);

  useEffect(() => {
    if (state.success) {
      // You can add a toast or similar notification here if you like
    }
  }, [state]);

  const scheduledDate = new Date(scheduledAt);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="applicationId" value={applicationId} />

      <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
        <p className="text-sm font-medium">Installation Scheduled For:</p>
        <p className="text-lg font-semibold text-primary">
          {scheduledDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {scheduledDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Verify that the installation was successfully performed by the BWD personnel before marking it as complete.
        </p>
      </div>

      <FormMessage state={state} />

      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        Mark Installation as Complete
      </Button>
    </form>
  );
}
