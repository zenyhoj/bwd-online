"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ApplicantSelectionButton({
  href,
  isSelected,
  label
}: {
  href: string;
  isSelected: boolean;
  label?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={isSelected ? "secondary" : "outline"}
      size="sm"
      disabled={isPending || isSelected}
      onClick={() => {
        if (isSelected) return;
        startTransition(() => {
          router.push(href, { scroll: false });
        });
      }}
      className={label ? "" : "min-w-[80px]"}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading
        </>
      ) : isSelected ? (
        label ?? "Selected"
      ) : (
        label ?? "Open"
      )}
    </Button>
  );
}
