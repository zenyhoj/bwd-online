"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type QueueFiltersProps = {
  initialQ?: string;
  initialWorkflow?: string;
  workflowStages: readonly { key: string; title: string }[];
};

export function QueueFilters({ initialQ = "", initialWorkflow = "all", workflowStages }: QueueFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [workflow, setWorkflow] = useState(initialWorkflow);

  // Synchronize internal state with URL if changed externally
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    setWorkflow(initialWorkflow);
  }, [initialWorkflow]);

  // Debounced update function
  useEffect(() => {
    const handler = setTimeout(() => {
      if (q === initialQ) return;
      updateUrl(q, workflow);
    }, 400);

    return () => clearTimeout(handler);
  }, [q]);

  function updateUrl(newQ: string, newWorkflow: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    
    if (newQ) {
      params.set("q", newQ);
    } else {
      params.delete("q");
    }

    if (newWorkflow !== "all") {
      params.set("workflow", newWorkflow);
    } else {
      params.delete("workflow");
    }

    // Reset to page 1 on search
    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleWorkflowChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setWorkflow(val);
    updateUrl(q, val);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search applicant name..."
          className="flex h-11 w-full rounded-full border border-border bg-background pl-11 pr-6 py-2 text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>
      
      <select
        value={workflow}
        onChange={handleWorkflowChange}
        className="flex h-11 w-full rounded-full border border-border bg-background px-6 py-2 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20 outline-none"
      >
        <option value="all">All workflow stages</option>
        {workflowStages.map((stage) => (
          <option key={stage.key} value={stage.key}>
            {stage.title}
          </option>
        ))}
      </select>

      <Button 
        onClick={() => updateUrl(q, workflow)} 
        disabled={isPending}
      >
        {isPending ? "Filtering..." : "Apply filters"}
      </Button>
    </div>
  );
}
