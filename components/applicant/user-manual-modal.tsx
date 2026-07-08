"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UserManualModalProps = {
  markdownContent: string;
};

export function UserManualModal({ markdownContent }: UserManualModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the manual
    const hasSeenManual = localStorage.getItem("has_seen_manual");
    if (!hasSeenManual) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem("has_seen_manual", "true");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/[0.04]">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-semibold">User Manual</DialogTitle>
              <DialogDescription>
                Welcome to BWD Online! Here is a guide to help you get started.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none pb-6">
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-border/60 bg-muted/[0.02] flex justify-end">
          <Button onClick={handleClose}>
            I understand, get started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
