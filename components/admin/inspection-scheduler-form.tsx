"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { rescheduleInspectionAction, scheduleInspectionAction } from "@/actions/inspections";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import type { InspectorRecord } from "@/types";

type ExistingInspection = {
  id: string;
  status?: string | null;
  scheduled_at?: string | null;
  inspector_name?: string | null;
};

type InspectionSchedulerFormProps = {
  applicationId: string;
  inspectors: InspectorRecord[];
  existingInspection?: ExistingInspection | null;
};

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function InspectionSchedulerForm({
  applicationId,
  inspectors,
  existingInspection
}: InspectionSchedulerFormProps) {
  const [scheduleState, scheduleAction, schedulePending] = useActionState(scheduleInspectionAction, initialActionState);
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(rescheduleInspectionAction, initialActionState);
  const [minSchedule, setMinSchedule] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    setMinSchedule(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    if (rescheduleState.success) {
      setShowReschedule(false);
    }
  }, [rescheduleState.success]);

  if (inspectors.length === 0) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Schedule inspection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No inspectors are available yet. Add an inspector first before scheduling this application.
          </p>
          <Button asChild>
            <Link href="/admin/inspectors">Add inspector</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (existingInspection) {
    return (
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="space-y-3 border-b border-border/60 bg-muted/[0.04] pb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">Inspection scheduled</CardTitle>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Review the appointment details below and reschedule if the visit needs to move.
              </p>
            </div>
            <div className="self-start lg:shrink-0">
              <StatusBadge status={existingInspection.status ?? "scheduled"} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Inspector</p>
              <p className="mt-2 text-xl font-semibold leading-snug">{existingInspection.inspector_name ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Scheduled at</p>
              <p className="mt-2 text-xl font-semibold leading-snug">{formatDateTime(existingInspection.scheduled_at ?? null)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm sm:col-span-2 xl:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <div className="mt-3">
                <StatusBadge status={existingInspection.status ?? "scheduled"} />
              </div>
            </div>
          </div>

          {existingInspection.status !== "approved" ? (
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-base font-semibold">Need to change the appointment?</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Open the reschedule form to pick a new inspection date and time.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={showReschedule ? "secondary" : "outline"}
                  className="w-full lg:w-auto"
                  onClick={() => setShowReschedule((value) => !value)}
                >
                  {showReschedule ? "Hide form" : "Reschedule"}
                </Button>
              </div>

              {showReschedule ? (
                <form action={rescheduleAction} className="space-y-4 border-t border-border/60 pt-4">
                  <input type="hidden" name="inspectionId" value={existingInspection.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`reschedule-${existingInspection.id}`}>New date and time</Label>
                    <Input
                      id={`reschedule-${existingInspection.id}`}
                      name="scheduledAt"
                      type="datetime-local"
                      min={minSchedule || undefined}
                      defaultValue={toDateTimeLocalValue(existingInspection.scheduled_at)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={() => setShowReschedule(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={reschedulePending} className="w-full sm:w-auto">
                      {reschedulePending ? "Saving..." : "Confirm reschedule"}
                    </Button>
                  </div>
                  <FormMessage state={rescheduleState} />
                </form>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Schedule inspection</CardTitle>
        <p className="text-sm text-muted-foreground">
          Inspection scheduling follows a first finished, first served basis based on the earliest completed in-house plumbing record.
        </p>
      </CardHeader>
      <CardContent>
        <form action={scheduleAction} className="flex flex-col gap-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="space-y-2">
            <Label htmlFor={`inspector-${applicationId}`}>Inspector</Label>
            <select
              id={`inspector-${applicationId}`}
              name="inspectorId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select inspector</option>
              {inspectors.map((inspector) => (
                <option key={inspector.id} value={inspector.id}>
                  {inspector.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`scheduled-${applicationId}`}>Scheduled time</Label>
            <Input
              id={`scheduled-${applicationId}`}
              name="scheduledAt"
              type="datetime-local"
              min={minSchedule || undefined}
              required
            />
            <p className="text-xs text-muted-foreground">Monday - Friday, 8:00 AM - 5:00 PM only.</p>
          </div>
          <Button type="submit" disabled={schedulePending} className="mt-2 w-full sm:w-auto">
            {schedulePending ? "Saving..." : "Schedule"}
          </Button>
          <FormMessage state={scheduleState} />
        </form>
      </CardContent>
    </Card>
  );
}
