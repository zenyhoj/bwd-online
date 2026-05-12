"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { purgeCompletedApplicationDocumentsAction } from "@/actions/maintenance";
import { Button } from "@/components/ui/button";

export function DocumentPurgeButton({ className }: { className?: string }) {
  const [isPurging, setIsPurging] = useState(false);

  const handlePurge = async () => {
    if (
      !confirm(
        "Are you sure you want to purge all physical document files for COMPLETED applications? This action cannot be undone and will permanently delete the files from the storage bucket to free up space. Have you downloaded a backup first?"
      )
    ) {
      return;
    }

    setIsPurging(true);
    try {
      const result = await purgeCompletedApplicationDocumentsAction();
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("An unexpected error occurred while purging documents.");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <button className={className} onClick={handlePurge} disabled={isPurging}>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center transition-colors text-muted-foreground group-hover:text-foreground">
        <Trash2 className="h-4 w-4 shrink-0" />
      </span>
      <span className="flex-1 text-left">{isPurging ? "Purging..." : "Purge Storage"}</span>
    </button>
  );
}
