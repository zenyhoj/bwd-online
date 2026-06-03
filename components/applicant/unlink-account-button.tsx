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
      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 px-2 text-xs"
      title="Unlink Account"
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Unlink className="h-3 w-3 mr-1" />}
      Unlink
    </Button>
  );
}
