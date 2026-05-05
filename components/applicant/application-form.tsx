"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createApplicationAction } from "@/actions/applications";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLASSIFICATION_OPTIONS } from "@/lib/fee-schedule";
import type { Database } from "@/types";

type Applicant = Database["public"]["Tables"]["applicants"]["Row"];

type ApplicationFormProps = {
  applicantId: string;
  applicant: Applicant | null;
};

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
        {value ?? <span className="text-muted-foreground/60 italic">Not provided</span>}
      </p>
    </div>
  );
}

export function ApplicationForm({ applicantId, applicant }: ApplicationFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createApplicationAction, initialActionState);
  const fieldErrors = state.fieldErrors ?? {};
  const errorText = (name: string) => fieldErrors[name]?.[0];
  const hasError = (name: string) => Boolean(errorText(name));

  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state.success, state.redirectTo, router]);

  // Parse name parts from full_name (stored as "LastName, FirstName MI")
  const fullName = applicant?.full_name ?? "";
  const [namePart, ...rest] = fullName.split(",");
  const lastName = namePart?.trim() ?? "";
  const firstAndMI = rest.join(",").trim();
  const firstNameParts = firstAndMI.split(" ").filter(Boolean);
  const middleInitial = firstNameParts.length > 1 ? firstNameParts[firstNameParts.length - 1].replace(".", "") : "";
  const firstName = firstNameParts.slice(0, middleInitial ? -1 : undefined).join(" ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application details</CardTitle>
        <CardDescription>
          Your registered information is pre-filled. Just enter the number of users to submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Read-only applicant info display */}
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Applicant information (from registration)
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Full name" value={applicant?.full_name} />
            <InfoRow label="Sex" value={applicant?.gender} />
            <InfoRow label="Age" value={applicant?.age} />
            <InfoRow label="Cellphone" value={applicant?.cellphone_number} />
            <InfoRow label="Address" value={applicant?.address} />
          </div>
        </div>

        {/* Hidden fields carrying applicant data to the action */}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="applicantId" value={applicantId} />
          <input type="hidden" name="lastName" value={lastName} />
          <input type="hidden" name="firstName" value={firstName || lastName} />
          <input type="hidden" name="middleInitial" value={middleInitial} />
          <input type="hidden" name="sex" value={applicant?.gender ?? "Male"} />
          <input type="hidden" name="age" value={applicant?.age ?? 1} />
          <input type="hidden" name="address" value={applicant?.address ?? ""} />
          <input type="hidden" name="cellphoneNumber" value={applicant?.cellphone_number ?? ""} />

          {/* Classification */}
          <div className="space-y-2">
            <Label htmlFor="classification">
              Connection classification <span className="text-destructive">*</span>
            </Label>
            <select
              id="classification"
              name="classification"
              required
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select classification...</option>
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {hasError("classification") ? (
              <p className="text-xs text-destructive">{errorText("classification")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Determines the application fee. Residential/Commercial C: ₱3,000 · Commercial A&B: ₱4,000 · Industrial/Bulk: ₱5,000
              </p>
            )}
          </div>

          {/* Number of users */}
          <div className="space-y-2">
            <Label htmlFor="numberOfUsers">
              Number of users <span className="text-destructive">*</span>
            </Label>
            <Input
              id="numberOfUsers"
              name="numberOfUsers"
              type="number"
              min={1}
              max={100}
              required
              placeholder="How many people will use this connection?"
              aria-invalid={hasError("numberOfUsers")}
              className={hasError("numberOfUsers") ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {hasError("numberOfUsers") ? (
              <p className="text-xs text-destructive">{errorText("numberOfUsers")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Enter the total number of people who will use this water connection.</p>
            )}
          </div>

          <FormMessage state={state} />

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Submitting..." : "Submit application"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
