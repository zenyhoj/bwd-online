"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleHome } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import type { ActionState, AppRole } from "@/types";

function parseHashParams(hash: string) {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(value);
}

export function AcceptInviteForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [invitedName, setInvitedName] = useState("");
  const [state, setState] = useState<ActionState>({ success: false, message: "" });

  useEffect(() => {
    let active = true;

    async function initializeInviteSession() {
      const params = parseHashParams(window.location.hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const tokenType = params.get("type");

      if (!accessToken || !refreshToken || tokenType !== "invite") {
        if (active) {
          setState({
            success: false,
            message: "This invitation link is invalid or has already been used."
          });
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (!active) {
        return;
      }

      if (error || !data.user) {
        setState({
          success: false,
          message: error?.message ?? "Unable to validate this invitation link."
        });
        setLoading(false);
        return;
      }

      setInvitedEmail(data.user.email ?? "");
      setInvitedName(String(data.user.user_metadata?.full_name ?? ""));
      window.history.replaceState({}, document.title, "/accept-invite");
      setLoading(false);
    }

    void initializeInviteSession();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSubmit(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setState({ success: false, message: "Password must be at least 8 characters long." });
      return;
    }

    if (password !== confirmPassword) {
      setState({ success: false, message: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    setState({ success: false, message: "" });

    const { data: updatedUser, error } = await supabase.auth.updateUser({ password });

    if (error) {
      setSubmitting(false);
      setState({ success: false, message: error.message });
      return;
    }

    const invitedRole = updatedUser.user?.user_metadata?.role;

    if (invitedRole && typeof invitedRole === "string" && invitedRole in roleHome) {
      router.replace(roleHome[invitedRole as AppRole]);
      router.refresh();
      return;
    }

    const roleResponse = await fetch("/api/auth/role", {
      method: "GET",
      cache: "no-store"
    });

    if (!roleResponse.ok) {
      setSubmitting(false);
      setState({
        success: true,
        message: "Password set successfully. You can now sign in with your invited account.",
        redirectTo: "/login"
      });
      return;
    }

    const payload = (await roleResponse.json()) as { role: AppRole };
    router.replace(roleHome[payload.role] ?? "/login");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>Set your password to activate your back-office account.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-10 rounded-md bg-muted/70" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-10 rounded-md bg-muted/70" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-10 rounded-md bg-muted/70" />
            </div>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitedName">Invited account</Label>
              <Input id="invitedName" value={invitedName} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitedEmail">Email</Label>
              <Input id="invitedEmail" value={invitedEmail} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <FormMessage state={state} />
            <Button type="submit" className="w-full" loading={submitting}>
              Set password and continue
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
