"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateInhouseInstallationAction } from "@/actions/accredited-plumbers";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { AccreditedPlumber } from "@/types";

type InhouseInstallationFormProps = {
  applicationId: string;
  plumbers: AccreditedPlumber[];
  currentPlumberId?: string | null;
  currentCompletedAt?: string | null;
  isCompleted?: boolean;
  variant?: "applicant" | "admin";
};

export function InhouseInstallationForm({
  applicationId,
  plumbers,
  currentPlumberId,
  currentCompletedAt,
  isCompleted = false,
  variant = "applicant"
}: InhouseInstallationFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateInhouseInstallationAction, initialActionState);
  const selectedPlumber =
    plumbers.find((plumber) => plumber.id === currentPlumberId)?.full_name ??
    (currentPlumberId ? "Assigned plumber" : "Not yet assigned");
  const completionDateValue = currentCompletedAt ? currentCompletedAt.slice(0, 10) : "";
  const isReadOnly = variant === "admin" && isCompleted;

  useEffect(() => {
    if (variant === "applicant" && state.success && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state.redirectTo, state.success, variant]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{variant === "admin" ? "Inhouse installation" : "Mark inhouse installation complete"}</h3>
        {plumbers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accredited plumbers are available yet. Ask the administrator to add one first.
          </p>
        ) : (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="completed" value="true" />
            <div className="space-y-2">
              <Label htmlFor={`accreditedPlumberId-${applicationId}`}>Accredited plumber</Label>
              <select
                id={`accreditedPlumberId-${applicationId}`}
                name="accreditedPlumberId"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                defaultValue={currentPlumberId ?? ""}
                required
                disabled={isReadOnly}
              >
                <option value="">Select accredited plumber</option>
                {plumbers.map((plumber) => (
                  <option key={plumber.id} value={plumber.id}>
                    {plumber.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`completedAt-${applicationId}`}>Date of completion</Label>
              <input
                id={`completedAt-${applicationId}`}
                name="completedAt"
                type="date"
                defaultValue={completionDateValue}
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isReadOnly}
              />
            </div>
            
            <div className="space-y-4">
              {variant === "applicant" && isCompleted ? (
                <p className="text-sm text-muted-foreground">
                  This application is already marked complete. You can still update the plumber or completion date if needed.
                </p>
              ) : null}
              {variant === "admin" && isCompleted ? (
                <p className="text-sm text-muted-foreground">This application is already marked complete.</p>
              ) : null}
              <FormMessage state={state} />
              <Button type="submit" disabled={isReadOnly} loading={pending} className="w-full sm:w-auto">
                {isReadOnly ? "Completed" : isCompleted ? "Save changes" : "Mark complete"}
              </Button>
            </div>
          </form>
        )}
    </div>
  );
}
