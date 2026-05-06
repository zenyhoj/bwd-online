"use client";

import { useActionState } from "react";

import { inviteStaffAction } from "@/actions/admin-access";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StaffInviteForm() {
  const [state, formAction, pending] = useActionState(inviteStaffAction, initialActionState);
  const fieldErrors = state.fieldErrors ?? {};
  const hasError = (name: string) => Boolean(fieldErrors[name]?.[0]);
  const errorText = (name: string) => fieldErrors[name]?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add admin account</CardTitle>
        <CardDescription>Create protected back-office access for additional administrators.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-3 md:items-end">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="staffFullName">Full name</Label>
            <Input
              id="staffFullName"
              name="fullName"
              autoComplete="name"
              aria-invalid={hasError("fullName")}
              className={hasError("fullName") ? "border-destructive focus-visible:ring-destructive" : undefined}
              required
            />
            {hasError("fullName") ? <p className="text-xs text-destructive">{errorText("fullName")}</p> : null}
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="staffEmail">Email</Label>
            <Input
              id="staffEmail"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={hasError("email")}
              className={hasError("email") ? "border-destructive focus-visible:ring-destructive" : undefined}
              required
            />
            {hasError("email") ? <p className="text-xs text-destructive">{errorText("email")}</p> : null}
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="staffRole">Role</Label>
            <select
              id="staffRole"
              name="role"
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${
                hasError("role")
                  ? "border-destructive focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                  : "border-input"
              }`}
              defaultValue="admin"
              aria-invalid={hasError("role")}
              required
            >
              <option value="admin">Admin</option>
            </select>
            {hasError("role") ? <p className="text-xs text-destructive">{errorText("role")}</p> : null}
          </div>
          <div className="md:col-span-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted-foreground">
              Admins receive an email from Supabase to complete account setup.
            </p>
            <Button type="submit" loading={pending}>
              Invite admin
            </Button>
          </div>
          <div className="md:col-span-3">
            <FormMessage state={state} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
