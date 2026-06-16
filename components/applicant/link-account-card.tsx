"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Link as LinkIcon, AlertCircle, CreditCard } from "lucide-react";
import { linkLegacyAccountAction } from "@/actions/link-account";
import { useRouter } from "next-nprogress-bar";

export function LinkAccountCard() {
  const router = useRouter();
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !accountName) {
      setError("Please fill out both fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await linkLegacyAccountAction(accountNumber, accountName);

    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
    } else {
      setAccountNumber("");
      setAccountName("");
      setIsSubmitting(false);
      router.refresh();
    }
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 shadow-sm">
      <div className="absolute inset-y-0 right-0 hidden w-1 bg-primary sm:block" />
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-xl leading-tight">Link an existing water connection</CardTitle>
          <CardDescription className="max-w-2xl">
            Add a legacy account number and account name to show its monthly bills in this page.
          </CardDescription>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
          <LinkIcon className="h-5 w-5" />
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account Number
              </Label>
              <div className="relative">
                <CreditCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="0441-12-022"
                  className="h-12 rounded-xl pl-11"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account Name
              </Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Exactly as it appears on your bill"
                className="h-12 rounded-xl"
                autoComplete="name"
              />
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Use the account number with dashes and the account name printed on your latest water bill.
          </div>
        </CardContent>
        <div className="border-t border-border/70 bg-muted/10 px-6 py-4">
          <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl font-semibold sm:w-auto sm:min-w-40">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link account
          </Button>
        </div>
      </form>
    </Card>
  );
}
