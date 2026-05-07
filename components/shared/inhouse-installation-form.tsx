"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateInhouseInstallationAction } from "@/actions/accredited-plumbers";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AccreditedPlumber } from "@/types";

type InhouseInstallationFormProps = {
  applicationId: string;
  plumbers: AccreditedPlumber[];
  currentPlumberId?: string | null;
  currentCompletedAt?: string | null;
  currentProofImageUrl?: string | null;
  currentSignedAt?: string | null;
  isCompleted?: boolean;
  variant?: "applicant" | "admin";
};

export function InhouseInstallationForm({
  applicationId,
  plumbers,
  currentPlumberId,
  currentCompletedAt,
  currentProofImageUrl,
  currentSignedAt,
  isCompleted = false,
  variant = "applicant"
}: InhouseInstallationFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateInhouseInstallationAction, initialActionState);
  const completionDateValue = currentCompletedAt ? currentCompletedAt.slice(0, 10) : "";
  const signedDateValue = currentSignedAt ? currentSignedAt.slice(0, 10) : "";
  const formResetKey = `${applicationId}:${currentPlumberId ?? ""}:${completionDateValue}:${signedDateValue}:${currentProofImageUrl ?? ""}:${isCompleted ? "done" : "pending"}`;
  const isReadOnly = variant === "admin" && isCompleted;
  const isApplicant = variant === "applicant";

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
        <form key={formResetKey} action={formAction} className="grid gap-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="completed" value="true" />

          <div className="space-y-2">
            <Label htmlFor={`accreditedPlumberId-${applicationId}`}>Accredited plumber</Label>
            <select
              id={`accreditedPlumberId-${applicationId}`}
              name="accreditedPlumberId"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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

          {isApplicant ? (
            <>
              <div className="space-y-2">
                <Label htmlFor={`completedAt-${applicationId}`}>Date of completion</Label>
                <input
                  id={`completedAt-${applicationId}`}
                  name="completedAt"
                  type="date"
                  defaultValue={completionDateValue}
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`proofImage-${applicationId}`}>Photo proof of the plumber</Label>
                <input
                  id={`proofImage-${applicationId}`}
                  name="proofImage"
                  type="file"
                  accept="image/*"
                  required={!currentProofImageUrl}
                  className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a selfie with the plumber or a photo showing the plumber doing the in-house plumbing work.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`signedAt-${applicationId}`}>Attendance sheet signed date</Label>
              <input
                id={`signedAt-${applicationId}`}
                name="signedAt"
                type="date"
                defaultValue={signedDateValue}
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Use the date the plumber signed the attendance sheet at the BWD office as the admin-side proof.
              </p>
            </div>
          )}

          {currentProofImageUrl ? (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-sm font-medium">Current applicant proof</p>
              <img
                src={currentProofImageUrl}
                alt="Applicant proof of in-house plumbing"
                className="max-h-56 rounded-md border border-border/60 object-cover"
              />
              <Link href={currentProofImageUrl} target="_blank" className="text-sm text-primary hover:underline">
                Open full image
              </Link>
            </div>
          ) : null}

          {variant === "admin" && currentSignedAt ? (
            <p className="text-sm text-muted-foreground">Current signed date on file: {signedDateValue}</p>
          ) : null}

          <div className="space-y-4">
            {variant === "applicant" && isCompleted ? (
              <p className="text-sm text-muted-foreground">
                This application is already marked complete. You can still update the plumber, completion date, or proof image if needed.
              </p>
            ) : null}
            {variant === "admin" && isCompleted ? (
              <p className="text-sm text-muted-foreground">This application is already marked complete.</p>
            ) : null}
            <FormMessage state={state} />
            <Button type="submit" disabled={isReadOnly || pending} className="w-full sm:w-auto">
              {isReadOnly ? "Completed" : isCompleted ? "Save changes" : "Mark complete"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
