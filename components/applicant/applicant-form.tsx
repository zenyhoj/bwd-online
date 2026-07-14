"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User } from "lucide-react";

import { createApplicantAction } from "@/actions/applicants";
import { BARANGAYS } from "@/lib/constants";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function ApplicantForm() {
  const [state, formAction, pending] = useActionState(createApplicantAction, initialActionState);
  const router = useRouter();

  useEffect(() => {
    if (state?.success && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state?.redirectTo, state?.success]);

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/[0.04] pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </span>
              Applicant Details
            </CardTitle>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Enter the applicant's personal information exactly as it should appear in the seminar and application records.
            </p>
          </div>
          <div className="whitespace-nowrap rounded-full border border-border/70 bg-background px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Required fields first
          </div>
        </div>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-8 p-5 sm:p-6">
          <section className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Basic identity</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with the applicant's name, age, and sex.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input id="firstName" name="firstName" required placeholder="e.g. Juan" className="h-11" />
                <FieldHint>Use the applicant's given name.</FieldHint>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input id="lastName" name="lastName" required placeholder="e.g. Dela Cruz" className="h-11" />
                <FieldHint>Enter the family name or surname.</FieldHint>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="middleInitial">Middle Initial</Label>
                <Input id="middleInitial" name="middleInitial" placeholder="e.g. M" maxLength={3} className="h-11" />
                <FieldHint>Optional. You can leave this blank if not applicable.</FieldHint>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">Sex <span className="text-destructive">*</span></Label>
                <select
                  id="sex"
                  name="sex"
                  required
                  defaultValue="Male"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <FieldHint>Select the applicant's recorded sex.</FieldHint>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
                <Input id="age" name="age" type="number" required min="1" max="120" placeholder="e.g. 30" className="h-11" />
                <FieldHint>Numbers only.</FieldHint>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cellphoneNumber">Cellphone Number <span className="text-destructive">*</span></Label>
                <Input
                  id="cellphoneNumber"
                  name="cellphoneNumber"
                  required
                  placeholder="e.g. 09123456789"
                  inputMode="tel"
                  className="h-11"
                />
                <FieldHint>Use an active number for updates and scheduling notices.</FieldHint>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="emailAddress">Email Address <span className="text-destructive">*</span></Label>
                <Input
                  id="emailAddress"
                  name="emailAddress"
                  type="email"
                  required
                  placeholder="e.g. juan@example.com"
                  className="h-11"
                />
                <FieldHint>Provide a valid email address.</FieldHint>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Address, connection size, and seminar purpose</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete the location details, expected connection use, and seminar intent before saving the record.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="specificAddress">Specific Address <span className="text-destructive">*</span></Label>
                <Input id="specificAddress" name="specificAddress" required placeholder="St./Purok/Sitio" className="h-11" />
                <FieldHint>Include street, purok, or sitio.</FieldHint>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barangay">Barangay <span className="text-destructive">*</span></Label>
                <select
                  id="barangay"
                  name="barangay"
                  required
                  defaultValue=""
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select Barangay</option>
                  {BARANGAYS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <FieldHint>Must be within Buenavista, Agusan del Norte.</FieldHint>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="purposeOfSeminar">Purpose of Seminar <span className="text-destructive">*</span></Label>
                <select
                  id="purposeOfSeminar"
                  name="purposeOfSeminar"
                  required
                  defaultValue="new_service"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="new_service">New Service</option>
                  <option value="reconnection">Reconnection</option>
                  <option value="change_name">Change Name</option>
                  <option value="others">Others</option>
                </select>
                <FieldHint>Choose the main reason the applicant is attending the seminar.</FieldHint>
              </div>
            </div>
          </section>

          <FormMessage state={state} />
        </CardContent>

        <CardFooter className="flex flex-col border-t border-border/60 bg-muted/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground sm:max-w-[60%]">
            Save this record first so the applicant can continue directly into the seminar modules, then finish the application after completing the seminar.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="w-full whitespace-nowrap text-xs font-bold sm:w-auto sm:text-sm">
              Cancel
            </Button>
            <Button type="submit" size="lg" loading={pending} className="w-full whitespace-nowrap text-xs font-bold sm:w-auto sm:text-sm">
              Save and Continue
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
