"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revokeAccessAction } from "@/actions/admin-access";
import { showToast } from "@/components/ui/toaster";

export function RevokeAccessButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  function onRevoke() {
    if (!window.confirm("Are you sure you want to revoke this user's admin access?")) return;

    startTransition(async () => {
      const res = await revokeAccessAction(userId);
      if (res.success) {
        showToast({ message: res.message, variant: "success" });
      } else {
        showToast({ message: res.message, variant: "destructive" });
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={isPending}
      onClick={onRevoke}
      title="Revoke access"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
