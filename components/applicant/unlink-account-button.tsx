"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Unlink } from "lucide-react";
import { unlinkAccountAction } from "@/actions/unlink-account";

export function UnlinkAccountButton({ concessionaireId }: { concessionaireId: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleUnlink = async () => {
    if (!window.confirm("Are you sure you want to unlink this account? You will no longer be able to view its water bills.")) {
      return;
    }

    setIsPending(true);
    try {
      const result = await unlinkAccountAction(concessionaireId);
      if (result.success) {
        alert(result.message);
      } else {
        alert("Error: " + result.message);
      }
    } catch (error: any) {
      alert("Error: Failed to unlink account");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleUnlink} 
      disabled={isPending}
      className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      title="Unlink Account"
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Unlink className="h-3 w-3 mr-1" />}
      Unlink
    </Button>
  );
}
