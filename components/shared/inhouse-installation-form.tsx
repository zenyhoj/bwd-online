"use client";

import { useActionState } from "react";

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
  isCompleted?: boolean;
  variant?: "applicant" | "admin";
};

export function InhouseInstallationForm({
  applicationId,
  plumbers,
  currentPlumberId,
  isCompleted = false,
  variant = "applicant"
}: InhouseInstallationFormProps) {
  const [state, formAction, pending] = useActionState(updateInhouseInstallationAction, initialActionState);
  const selectedPlumber =
    plumbers.find((plumber) => plumber.id === currentPlumberId)?.full_name ??
    (currentPlumberId ? "Assigned plumber" : "Not yet assigned");

  if (variant === "applicant" && isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inhouse installation completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Accredited plumber</p>
            <p className="mt-2 font-medium">{selectedPlumber}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You already marked this application as complete. No further action is needed from your side.
          </p>
        </CardContent>
      </Card>
    );
  }

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
                disabled={isCompleted}
              >
                <option value="">Select accredited plumber</option>
                {plumbers.map((plumber) => (
                  <option key={plumber.id} value={plumber.id}>
                    {plumber.full_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-4">
              {isCompleted ? (
                <p className="text-sm text-muted-foreground">This application is already marked complete.</p>
              ) : null}
              <FormMessage state={state} />
              <Button type="submit" disabled={isCompleted} loading={pending} className="w-full sm:w-auto">
                {isCompleted ? "Completed" : "Mark complete"}
              </Button>
            </div>
          </form>
        )}
    </div>
  );
}
