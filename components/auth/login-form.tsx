"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleHome } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import type { ActionState, AppRole } from "@/types";

export function LoginForm() {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ success: false, message: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setState({ success: false, message: "" });

    const supabase = createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { data: authResult, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !authResult.user) {
      setPending(false);
      setState({ success: false, message: "Invalid email or password." });
      return;
    }

    const roleResponse = await fetch("/api/auth/role", {
      method: "GET",
      cache: "no-store"
    });

    if (!roleResponse.ok) {
      const payload = (await roleResponse.json().catch(() => null)) as { message?: string } | null;
      await supabase.auth.signOut();
      setPending(false);
      setState({
        success: false,
        message: payload?.message ?? "This account is not authorized to access the system."
      });
      return;
    }

    const payload = (await roleResponse.json()) as { role: AppRole };
    const role = payload.role;
    window.location.assign(roleHome[role] ?? "/login");
  }

  return (
    <Card className="mx-auto w-full border-none shadow-none hover:shadow-none bg-transparent">
      <CardContent className="p-0">
        {!mounted ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-12 rounded bg-muted" />
              <div className="h-10 rounded-md bg-muted/70" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-10 rounded-md bg-muted/70" />
            </div>
            <div className="h-10 rounded-md bg-muted/70" />
          </div>
        ) : (
        <form action={handleSubmit} className="space-y-3">
          <div className="space-y-0.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              data-lpignore="true"
              className="h-11"
              required
            />
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
          <FormMessage state={state} />
          <Button type="submit" className="w-full shadow-none" loading={pending}>
            Sign in
          </Button>

          <p className="text-center text-sm text-muted-foreground font-medium pt-1">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline underline-offset-4">
              Register now
            </Link>
          </p>
        </form>
        )}
      </CardContent>
    </Card>
  );
}
