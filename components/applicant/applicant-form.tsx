"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Save, User } from "lucide-react";

import { createApplicantAction } from "@/actions/applicants";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApplicantForm() {
  const [state, formAction, pending] = useActionState(createApplicantAction, initialActionState);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/applicant");
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Applicant Details
        </CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
              <Input id="firstName" name="firstName" required placeholder="e.g. Juan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
              <Input id="lastName" name="lastName" required placeholder="e.g. Dela Cruz" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="middleInitial">Middle Initial</Label>
              <Input id="middleInitial" name="middleInitial" placeholder="e.g. M" maxLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sex <span className="text-destructive">*</span></Label>
              <select
                id="sex"
                name="sex"
                required
                defaultValue="Male"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
              <Input id="age" name="age" type="number" required min="1" max="120" placeholder="e.g. 30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cellphoneNumber">Cellphone Number <span className="text-destructive">*</span></Label>
              <Input id="cellphoneNumber" name="cellphoneNumber" required placeholder="e.g. 09123456789" inputMode="tel" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
              <Input id="address" name="address" required placeholder="Enter full address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purposeOfSeminar">Purpose of Seminar <span className="text-destructive">*</span></Label>
              <select
                id="purposeOfSeminar"
                name="purposeOfSeminar"
                required
                defaultValue="new_service"
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
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-4 border-border/50">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={pending}>
            <Save className="mr-2 h-4 w-4" />
            Create Applicant
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
