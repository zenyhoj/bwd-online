"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";

import { updateApplicantAction } from "@/actions/applicants";
import { BARANGAYS } from "@/lib/constants";
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

const PURPOSE_LABELS = {
  new_service: "New Service",
  reconnection: "Reconnection",
  change_name: "Change Name",
  others: "Others"
} as const;

function parseApplicantName(fullName: string | null | undefined) {
  const value = fullName ?? "";
  const [namePart, ...rest] = value.split(",");
  const lastName = namePart?.trim() ?? "";
  const firstAndMI = rest.join(",").trim();
  const firstNameParts = firstAndMI.split(" ").filter(Boolean);
  const middleInitial = firstNameParts.length > 1 ? firstNameParts[firstNameParts.length - 1].replace(".", "") : "";
  const firstName = firstNameParts.slice(0, middleInitial ? -1 : undefined).join(" ");

  return {
    firstName,
    lastName,
    middleInitial
  };
}

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

function ApplicantEditForm({
  applicantId,
  applicant,
  onDone
}: {
  applicantId: string;
  applicant: Applicant | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateApplicantAction, initialActionState);
  const { firstName, lastName, middleInitial } = parseApplicantName(applicant?.full_name);

  const addressStr = applicant?.address ?? "";
  let defaultSpecificAddress = addressStr;
  let defaultBarangay = "";
  if (addressStr.endsWith(", Buenavista, Agusan del Norte")) {
    const parts = addressStr.replace(", Buenavista, Agusan del Norte", "").split(", ");
    if (parts.length >= 2) {
      defaultBarangay = parts.pop() || "";
      defaultSpecificAddress = parts.join(", ");
    }
  }

  useEffect(() => {
    if (state.success) {
      onDone();
    }
  }, [onDone, state.success]);

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">Edit applicant information</p>
        <p className="text-sm text-muted-foreground">
          Update the saved registration details before submitting the application.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="applicantId" value={applicantId} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="editFirstName">First name</Label>
            <Input id="editFirstName" name="firstName" defaultValue={firstName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editLastName">Last name</Label>
            <Input id="editLastName" name="lastName" defaultValue={lastName} required />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="editMiddleInitial">Middle initial</Label>
            <Input id="editMiddleInitial" name="middleInitial" defaultValue={middleInitial} maxLength={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editSex">Sex</Label>
            <select
              id="editSex"
              name="sex"
              defaultValue={applicant?.gender ?? "Male"}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="editAge">Age</Label>
            <Input id="editAge" name="age" type="number" min={1} max={120} defaultValue={applicant?.age ?? undefined} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editCellphoneNumber">Cellphone</Label>
            <Input id="editCellphoneNumber" name="cellphoneNumber" defaultValue={applicant?.cellphone_number ?? ""} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="editEmailAddress">Email Address</Label>
            <Input id="editEmailAddress" name="emailAddress" type="email" defaultValue={applicant?.email_address ?? ""} required />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="editSpecificAddress">Specific Address</Label>
            <Input id="editSpecificAddress" name="specificAddress" defaultValue={defaultSpecificAddress} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editBarangay">Barangay</Label>
            <select
              id="editBarangay"
              name="barangay"
              required
              defaultValue={defaultBarangay}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>Select Barangay</option>
              {BARANGAYS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="editNumberOfUsers">Number of users</Label>
            <Input
              id="editNumberOfUsers"
              name="numberOfUsers"
              type="number"
              min={1}
              max={100}
              defaultValue={applicant?.number_of_users ?? undefined}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editPurposeOfSeminar">Purpose of seminar</Label>
            <select
              id="editPurposeOfSeminar"
              name="purposeOfSeminar"
              defaultValue={applicant?.purpose_of_seminar ?? "new_service"}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="new_service">New Service</option>
              <option value="reconnection">Reconnection</option>
              <option value="change_name">Change Name</option>
              <option value="others">Others</option>
            </select>
          </div>
        </div>

        <FormMessage state={state} />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Save applicant information
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ApplicationForm({ applicantId, applicant }: ApplicationFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createApplicationAction, initialActionState);
  const [isEditingApplicant, setIsEditingApplicant] = useState(false);
  const fieldErrors = state.fieldErrors ?? {};
  const errorText = (name: string) => fieldErrors[name]?.[0];
  const hasError = (name: string) => Boolean(errorText(name));

  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [router, state.redirectTo, state.success]);

  const { firstName, lastName, middleInitial } = parseApplicantName(applicant?.full_name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application details</CardTitle>
        <CardDescription>
          Your registered information is pre-filled. Review the saved number of users, then complete the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Applicant information (from registration)
              </p>
              <p className="text-sm text-muted-foreground">
                Review the saved details below. If anything is wrong, update it before submitting the application.
              </p>
            </div>
            <Button
              type="button"
              variant={isEditingApplicant ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsEditingApplicant((current) => !current)}
              className="h-auto min-w-[220px] justify-start rounded-xl border-primary/20 px-4 py-3 text-left shadow-sm hover:border-primary/35 hover:bg-primary/[0.06]"
            >
              <span className="inline-flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PencilLine className="h-4 w-4" />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-semibold text-foreground">
                    {isEditingApplicant ? "Close editor" : "Edit applicant information"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isEditingApplicant ? "Return to read-only view" : "Correct name, address, phone, and more"}
                  </span>
                </span>
              </span>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Full name" value={applicant?.full_name} />
            <InfoRow label="Sex" value={applicant?.gender} />
            <InfoRow label="Age" value={applicant?.age} />
            <InfoRow label="Cellphone" value={applicant?.cellphone_number} />
            <InfoRow label="Email" value={applicant?.email_address} />
            <div className="md:col-span-2">
              <InfoRow label="Address" value={applicant?.address} />
            </div>
          </div>

          {isEditingApplicant ? (
            <ApplicantEditForm applicantId={applicantId} applicant={applicant} onDone={() => setIsEditingApplicant(false)} />
          ) : null}
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="applicantId" value={applicantId} />
          <input type="hidden" name="lastName" value={lastName} />
          <input type="hidden" name="firstName" value={firstName || lastName} />
          <input type="hidden" name="middleInitial" value={middleInitial} />
          <input type="hidden" name="sex" value={applicant?.gender ?? "Male"} />
          <input type="hidden" name="age" value={applicant?.age ?? 1} />
          <input type="hidden" name="address" value={applicant?.address ?? ""} />
          <input type="hidden" name="cellphoneNumber" value={applicant?.cellphone_number ?? ""} />

          <div className="grid gap-4 md:grid-cols-2">
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
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {hasError("classification") ? (
                <p className="text-xs text-destructive">{errorText("classification")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Determines the application fee. Residential/Government: P3,000 · Commercial: P4,000 · Industrial: P5,000
                </p>
              )}
            </div>

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
                defaultValue={applicant?.number_of_users ?? undefined}
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
          </div>



          <FormMessage state={state} />

          <Button type="submit" loading={pending} className="w-full sm:w-auto">
            Submit application
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
