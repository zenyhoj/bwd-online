"use client";

import { useActionState, useEffect, useState } from "react";

import { initialActionState } from "@/actions/state";
import { scheduleWaterMeterAction } from "@/actions/water-meter";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WaterMeterSchedulerFormProps = {
  applicationId: string;
  scheduledAt?: string | null;
  canSchedule?: boolean;
  minDateOverride?: string | null;
};

export function WaterMeterSchedulerForm({ applicationId, scheduledAt, canSchedule = true, minDateOverride }: WaterMeterSchedulerFormProps) {
  const [state, formAction, pending] = useActionState(scheduleWaterMeterAction, initialActionState);
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    if (minDateOverride) {
      setMinDate(new Date(new Date(minDateOverride).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else {
      setMinDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    }
  }, [minDateOverride]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">{scheduledAt ? "Manage water meter installation" : "Schedule water meter installation"}</h3>
        <p className="text-sm text-muted-foreground">
          {scheduledAt
            ? "A schedule has been set. You can update the date and time below."
            : "Set the date and time for the physical installation of the water meter."}
        </p>
      </div>

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        {minDate ? <input type="hidden" name="minDate" value={minDate} /> : null}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`scheduledAt-${applicationId}`}>Installation date and time</Label>
          <Input
            id={`scheduledAt-${applicationId}`}
            name="scheduledAt"
            type="datetime-local"
            min={minDate || undefined}
            defaultValue={
              scheduledAt
                ? new Date(new Date(scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                : minDate
            }
            required
            disabled={!canSchedule}
            className="h-11"
          />
        </div>

        {!canSchedule ? (
          <div className="md:col-span-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-sm text-muted-foreground">
            Water meter installation can be scheduled after the office payment is confirmed.
          </div>
        ) : null}

        <div className="md:col-span-2">
          <FormMessage state={state} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={!canSchedule} loading={pending} className="w-full sm:w-auto">
            {scheduledAt ? "Update schedule" : "Save schedule"}
          </Button>
        </div>
      </form>
    </div>
  );
}
