"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleHome } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import type { ActionState, AppRole } from "@/types";

export function UpdatePasswordForm() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ success: false, message: "" });
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setState({ success: false, message: "" });

    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setPending(false);
      setState({ success: false, message: "Passwords do not match." });
      return;
    }

    if (password.length < 6) {
      setPending(false);
      setState({ success: false, message: "Password must be at least 6 characters." });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setPending(false);
      setState({ success: false, message: error.message });
      return;
    }

    setState({ success: true, message: "Password updated successfully! Redirecting..." });

    // Fetch user role to redirect appropriately
    const roleResponse = await fetch("/api/auth/role", {
      method: "GET",
      cache: "no-store",
    });

    if (!roleResponse.ok) {
      // If role fetch fails, fallback to login
      await supabase.auth.signOut();
      window.location.assign("/login");
      return;
    }

    const payload = (await roleResponse.json()) as { role: AppRole };
    const role = payload.role;
    
    // Short delay so they can see the success message
    setTimeout(() => {
      window.location.assign(roleHome[role] ?? "/login");
    }, 1500);
  }

  return (
    <Card className="mx-auto w-full border-none shadow-none hover:shadow-none bg-transparent">
      <CardContent className="p-0">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                data-lpignore="true"
                required
                className="h-11 pr-12"
              />
              <button
                type="button"
                className="absolute right-0 top-0 flex h-full items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              data-lpignore="true"
              required
              className="h-11"
            />
          </div>
          <FormMessage state={state} />
          <Button type="submit" className="w-full shadow-none" loading={pending}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
