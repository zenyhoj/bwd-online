"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { rescheduleInspectionAction, scheduleInspectionAction } from "@/actions/inspections";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
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

  // Close reschedule panel on success
  useEffect(() => {
    if (rescheduleState.success) setShowReschedule(false);
  }, [rescheduleState.success]);

  if (inspectors.length === 0) {
    return (
      <Card>
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

  // Already has a scheduled inspection — show read-only summary + reschedule option
  if (existingInspection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inspection scheduled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Inspector</p>
              <p className="mt-1 font-medium">{existingInspection.inspector_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled at</p>
              <p className="mt-1 font-medium">{formatDateTime(existingInspection.scheduled_at ?? null)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={existingInspection.status ?? "scheduled"} />
              </div>
            </div>
          </div>

          {existingInspection.status !== "approved" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReschedule((v) => !v)}
              >
                {showReschedule ? "Cancel" : "Reschedule"}
              </Button>

              {showReschedule && (
                <form action={rescheduleAction} className="grid gap-3 pt-2 md:grid-cols-[1fr_auto] md:items-end">
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
                    />
                  </div>
                  <Button type="submit" disabled={reschedulePending}>
                    {reschedulePending ? "Saving..." : "Confirm reschedule"}
                  </Button>
                  <div className="md:col-span-2">
                    <FormMessage state={rescheduleState} />
                  </div>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // No inspection yet — show the schedule form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule inspection</CardTitle>
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
            <p className="text-xs text-muted-foreground">Monday – Friday, 8:00 AM – 5:00 PM only.</p>
          </div>
          <Button type="submit" disabled={schedulePending} className="mt-2">
            {schedulePending ? "Saving..." : "Schedule"}
          </Button>
          <FormMessage state={scheduleState} />
        </form>
      </CardContent>
    </Card>
  );
}
