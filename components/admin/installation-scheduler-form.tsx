"use client";

import { useActionState, useEffect, useState } from "react";

import { Edit2 } from "lucide-react";

import { scheduleInhouseInstallationAction } from "@/actions/accredited-plumbers";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

type InstallationSchedulerFormProps = {
  applicationId: string;
  scheduledAt?: string | null;
  canSchedule?: boolean;
  isCompleted?: boolean;
};

export function InstallationSchedulerForm({
  applicationId,
  scheduledAt = null,
  canSchedule = false,
  isCompleted = false
}: InstallationSchedulerFormProps) {
  const [state, formAction, pending] = useActionState(scheduleInhouseInstallationAction, initialActionState);
  const [maxDate, setMaxDate] = useState("");
  const [isEditing, setIsEditing] = useState(!scheduledAt);

  useEffect(() => {
    setMaxDate(new Date().toISOString().slice(0, 10));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Installation date</h3>
        <p className="text-sm text-muted-foreground">
          Installation stays queued after payment. Set the installation date once work is completed.
        </p>
      </div>
      <div className="space-y-4">
        {scheduledAt ? (
          <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 p-3 text-sm text-muted-foreground">
            <div>
              Recorded installation date: <span className="font-medium text-foreground">{formatDateTime(scheduledAt)}</span>
            </div>
            {!isEditing && !isCompleted && canSchedule ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setIsEditing(true)}
                title="Edit date"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ) : null}
        
        {isEditing ? (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="applicationId" value={applicationId} />
            <div className="space-y-2">
              <Label htmlFor={`installation-scheduled-at-${applicationId}`}>Installation date</Label>
              <Input
                id={`installation-scheduled-at-${applicationId}`}
                name="scheduledAt"
                type="date"
                max={maxDate || undefined}
                defaultValue={scheduledAt ? new Date(scheduledAt).toISOString().split("T")[0] : ""}
                required
                disabled={!canSchedule || isCompleted}
                className="h-11 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="space-y-4">
              {!canSchedule && !isCompleted ? (
                <p className="text-sm text-muted-foreground">
                  Installation can be recorded after payment is marked as paid.
                </p>
              ) : null}
              {isCompleted ? (
                <p className="text-sm text-muted-foreground">This installation is already marked complete.</p>
              ) : null}
              <FormMessage state={state} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!canSchedule || isCompleted} loading={pending} className="w-full sm:w-auto">
                  {isCompleted ? "Completed" : scheduledAt ? "Update confirmed date" : "Confirm date"}
                </Button>
                {scheduledAt && !pending ? (
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
