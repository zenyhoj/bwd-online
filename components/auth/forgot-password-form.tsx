"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { ActionState } from "@/types";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ success: false, message: "" });
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setState({ success: false, message: "" });

    const supabase = createClient();
    const email = String(formData.get("email") ?? "");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setPending(false);

    if (error) {
      setState({ success: false, message: error.message });
      return;
    }

    setSubmitted(true);
    setState({ success: true, message: "Check your email for the password reset link." });
  }

  if (submitted) {
    return (
      <Card className="mx-auto w-full border-none shadow-none hover:shadow-none bg-transparent">
        <CardContent className="p-0 text-center space-y-4">
          <div className="rounded-md bg-primary/10 p-4">
            <h3 className="text-sm font-medium text-primary mb-2">Check your inbox</h3>
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to your email. Click the link to securely create a new password.
            </p>
          </div>
          <Link href="/login" className="inline-flex items-center text-sm font-medium text-primary hover:underline underline-offset-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full border-none shadow-none hover:shadow-none bg-transparent">
      <CardContent className="p-0">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              className="h-11"
              required
            />
          </div>
          <FormMessage state={state} />
          <Button type="submit" className="w-full shadow-none" loading={pending}>
            Send reset link
          </Button>

          <div className="text-center pt-2">
            <Link href="/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
