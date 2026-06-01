"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
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
      // Success
      router.refresh(); // This will reload the layout and set applicantNavMode = "converted"
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden relative max-w-2xl">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <LinkIcon className="h-24 w-24" />
      </div>
      <CardHeader>
        <CardTitle className="text-xl">Already have an existing water connection?</CardTitle>
        <CardDescription>
          Link your legacy account to view your monthly water bills.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 12345-678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Exactly as it appears on your bill"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link Account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
