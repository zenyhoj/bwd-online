"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteApplicantAndApplicationsAction } from "@/actions/applications";
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
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toaster";

export function DeleteApplicantButton({ applicantId }: { applicantId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("applicantId", applicantId);

      const result = await deleteApplicantAndApplicationsAction(undefined as any, formData);

      if (result?.success) {
        showToast({
          message: result.message,
          variant: "success",
        });
        setOpen(false);
        // The server action redirects to /admin
      } else {
        showToast({
          message: result?.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="font-medium shadow-sm transition-transform hover:scale-105 active:scale-95">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. It will permanently delete this applicant, all of their applications, inspections, payments, uploaded attachments, and seminar progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }} 
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting..." : "Delete Applicant"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
