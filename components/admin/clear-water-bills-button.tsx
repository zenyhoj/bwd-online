"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { clearWaterBillsAction } from "@/actions/water-bills";
import { showToast } from "@/components/ui/toaster";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function ClearWaterBillsButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleClear = async () => {
    setIsClearing(true);
    showToast({ message: "Clearing water bills..." });

    try {
      const result = await clearWaterBillsAction();
      
      if (result.success) {
        showToast({ message: result.message, variant: "success" });
        setOpen(false);
        setConfirmText("");
        router.refresh();
      } else {
        showToast({ message: result.message, variant: "destructive" });
      }
    } catch (error) {
      showToast({ message: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsClearing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setConfirmText("");
    }
  };

  const isConfirmed = confirmText.trim().toUpperCase() === "CLEAR";

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-full font-medium shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
          Clear All Bills
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all water bills
            from our servers.
            <span className="block mt-4 font-medium text-foreground">
              Please type <strong className="text-destructive font-semibold">CLEAR</strong> to confirm:
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-2">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type CLEAR here"
            className="w-full text-center rounded-xl h-10 px-4"
            disabled={isClearing}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              if (isConfirmed) {
                handleClear();
              }
            }} 
            disabled={!isConfirmed || isClearing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isClearing ? "Clearing..." : "Yes, clear bills"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
