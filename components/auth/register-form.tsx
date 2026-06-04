"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { registerAction } from "@/actions/auth";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function downloadCredentials(email: string, password: string, fullName: string) {
  const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  const content = [
    "BWD Online - Account Credentials",
    "=================================",
    "",
    `Name     : ${fullName}`,
    `Email    : ${email}`,
    `Password : ${password}`,
    "",
    `Saved on : ${now}`,
    "",
    "Keep this file in a safe place.",
    "Do not share it with anyone.",
    "",
    "Login at: " + window.location.origin + "/login"
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bwd-credentials.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialActionState);
  const [mounted, setMounted] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [savedCredentials, setSavedCredentials] = useState<{ email: string; password: string; fullName: string } | null>(null);
  // Capture values at submit time before the form clears
  const pendingCredentials = useRef<{ email: string; fullName: string } | null>(null);

  const passwordMismatch = confirmTouched && confirmValue !== passwordValue;
  const fieldErrors = state.fieldErrors ?? {};
  const errorText = (name: string) => fieldErrors[name]?.[0];
  const hasError = (name: string) => Boolean(errorText(name));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (state.success && pendingCredentials.current) {
      setSavedCredentials({
        email: pendingCredentials.current.email,
        password: passwordValue,
        fullName: pendingCredentials.current.fullName
      });
    }
  }, [state.success, passwordValue]);

  function handleSubmit(formData: FormData) {
    if (passwordValue !== confirmValue) return;
    pendingCredentials.current = {
      email: String(formData.get("email") ?? ""),
      fullName: String(formData.get("fullName") ?? "")
    };
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Card className="mx-auto w-full border-none shadow-none hover:shadow-none bg-transparent">
      <CardContent className="p-0">
        {!mounted ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-10 rounded-md bg-muted/70" />
              </div>
            ))}
            <div className="h-10 rounded-md bg-muted/70" />
          </div>
        ) : state.success ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Account created successfully!</p>
              <p className="mt-1 text-emerald-700">
                You can now{" "}
                <Link href="/login" className="font-medium underline underline-offset-4">
                  sign in
                </Link>{" "}
                with your email and password.
              </p>
            </div>

            {savedCredentials && (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-medium">Save your credentials</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Download a copy of your login details so you don&apos;t forget them. Keep it somewhere safe.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() =>
                    downloadCredentials(
                      savedCredentials.email,
                      savedCredentials.password,
                      savedCredentials.fullName
                    )
                  }
                >
                  Download credentials (.txt)
                </Button>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  This file contains your email and password. Do not share it with anyone.
                </p>
              </div>
            )}

            <Button asChild className="w-full">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-2">
            <div className="space-y-0.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
                placeholder="e.g. Juan Dela Cruz"
                aria-invalid={hasError("fullName")}
                className={`h-11 ${hasError("fullName") ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {hasError("fullName") ? <p className="text-xs text-destructive">{errorText("fullName")}</p> : null}
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={hasError("email")}
                className={`h-11 ${hasError("email") ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {hasError("email") ? (
                <p className="text-xs text-destructive">{errorText("email")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Please provide an active and working email address for password resets and updates.</p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  aria-invalid={hasError("password")}
                  className={`h-11 pr-12 ${hasError("password") ? "border-destructive focus-visible:ring-destructive" : ""}`}
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
              {hasError("password") ? (
                <p className="text-xs text-destructive">{errorText("password")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmValue}
                  onChange={(e) => setConfirmValue(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  aria-invalid={passwordMismatch}
                  className={`h-11 pr-12 ${passwordMismatch ? "border-destructive focus-visible:ring-destructive" : ""}`}
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
              {passwordMismatch ? (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              ) : null}
            </div>

            <div>
              <label
                className={`flex items-start gap-3 rounded-md border p-2 text-sm ${
                  hasError("acceptPrivacyNotice") ? "border-destructive" : "border-border/80"
                }`}
              >
                <input
                  id="acceptPrivacyNotice"
                  name="acceptPrivacyNotice"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  aria-invalid={hasError("acceptPrivacyNotice")}
                  required
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  I confirm this information belongs to the actual user or authorized applicant, and I understand how
                  personal data will be processed under the Data Privacy Act of 2012.
                </span>
              </label>
              {hasError("acceptPrivacyNotice") ? (
                <p className="mt-1 text-xs text-destructive">{errorText("acceptPrivacyNotice")}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                See our{" "}
                <Link href="/privacy-notice" className="underline underline-offset-4">
                  identity and data privacy notice
                </Link>
                .
              </p>
            </div>

            <FormMessage state={state} />

            <Button type="submit" className="w-full shadow-none" disabled={passwordMismatch || !confirmValue} loading={pending}>
              Create account
            </Button>

            <p className="text-center text-sm text-muted-foreground font-medium pt-1">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
