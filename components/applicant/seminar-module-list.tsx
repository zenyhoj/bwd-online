"use client";

import { useState, useEffect, useActionState, useOptimistic } from "react";
import { Download, ChevronLeft, ChevronRight, CheckCircle2, Lock } from "lucide-react";

import { updateSeminarProgressAction } from "@/actions/seminar";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { AccreditedPlumbersTable } from "./accredited-plumbers-table";
import { DocumentSubmissionChoice } from "./document-submission-choice";
import { getSeminarImageUrls } from "@/lib/seminar-media";
import { cn } from "@/lib/utils";
import type { ApplicantSeminarProgress, SeminarItem } from "@/types";

type SeminarModuleListProps = {
  items: SeminarItem[];
  progress: ApplicantSeminarProgress[];
  applicantId: string;
  completionCta?: {
    href: string;
    label: string;
    description: string;
  } | null;
  documentChoiceHrefs?: {
    online: string;
    office: string;
  } | null;
};

type SeminarItemCardProps = {
  item: SeminarItem;
  index: number;
  completed: boolean;
  isLastPendingItem: boolean;
  isFinalItem: boolean;
  isLocked: boolean;
  allCompleted: boolean;
  applicantId: string;
  completionCta?: {
    href: string;
    label: string;
    description: string;
  } | null;
  documentChoiceHrefs?: {
    online: string;
    office: string;
  } | null;
  onCompleted: (itemId: string) => void;
};

function SeminarMedia({ item }: { item: SeminarItem }) {
  const imageUrls = getSeminarImageUrls(item);

  if (imageUrls.length === 1) {
    return (
      <img
        src={imageUrls[0]}
        alt={item.title}
        className="w-full h-auto rounded-xl ring-1 ring-border/80"
      />
    );
  }

  if (imageUrls.length > 1) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {imageUrls.map((url, index) => (
          <img
            key={`${item.id}-${index}`}
            src={url}
            alt={`${item.title} image ${index + 1}`}
            className="h-auto w-full rounded-xl ring-1 ring-border/80"
          />
        ))}
      </div>
    );
  }

  if (item.media_type === "video" && item.media_url) {
    return (
      <div className="overflow-hidden rounded-xl ring-1 ring-border/80">
        <iframe
          src={item.media_url}
          title={item.title}
          className="h-72 w-full bg-secondary/20"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (item.media_type === "pdf" && item.media_url) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/20 p-4">
        <div className="space-y-1">
          <p className="font-medium">Seminar Document</p>
          <p className="text-xs text-muted-foreground">Download the PDF document to review the material.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={item.media_url} target="_blank" rel="noopener noreferrer" download>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
      </div>
    );
  }

  return null;
}

export function SeminarModuleList({
  items,
  progress,
  applicantId,
  completionCta,
  documentChoiceHrefs
}: SeminarModuleListProps) {
  const completedIds = new Set(progress.filter((entry) => entry.completed).map((entry) => entry.seminar_item_id));

  // Use optimistic state for completed IDs to respond instantly to clicks
  const [optimisticCompletedIds, addOptimisticCompletedId] = useOptimistic(
    completedIds,
    (state, itemIdToMarkComplete: string) => {
      const next = new Set(state);
      next.add(itemIdToMarkComplete);
      return next;
    }
  );

  const remainingCount = items.filter((item) => !optimisticCompletedIds.has(item.id)).length;
  const allCompleted = items.length > 0 && remainingCount === 0;

  // Find the first uncompleted item index to set as initial active index
  const firstUncompletedIndex = items.findIndex((item) => !optimisticCompletedIds.has(item.id));
  const initialIndex = allCompleted ? items.length - 1 : Math.max(0, firstUncompletedIndex);
  
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Auto-advance if the current item was just completed
  useEffect(() => {
    const currentItem = items[activeIndex];
    if (optimisticCompletedIds.has(currentItem.id) && activeIndex < items.length - 1 && !allCompleted) {
      // Small delay for satisfaction
      const timer = setTimeout(() => {
        // Only advance if the next one is actually the one we SHOULD be on
        const nextUncompleted = items.findIndex((item) => !optimisticCompletedIds.has(item.id));
        if (nextUncompleted !== -1) {
          setActiveIndex(nextUncompleted);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [optimisticCompletedIds, allCompleted, activeIndex, items]);

  const activeItem = items[activeIndex];
  const isCompleted = optimisticCompletedIds.has(activeItem.id);
  const isLocked = !isCompleted && items.slice(0, activeIndex).some(item => !optimisticCompletedIds.has(item.id));

  return (
    <div className="space-y-8">
      {/* Chevron Stepper */}
      <div className="flex flex-nowrap items-end justify-start gap-y-6 mb-4 px-2 pb-14 pt-4 overflow-x-auto max-w-full snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {items.map((item, idx) => {
          const itemCompleted = optimisticCompletedIds.has(item.id);
          const current = idx === activeIndex;
          const locked = !itemCompleted && items.slice(0, idx).some(prev => !optimisticCompletedIds.has(prev.id));

          const GRADIENTS = [
            "from-rose-400 to-rose-500",
            "from-amber-300 to-amber-500",
            "from-emerald-400 to-emerald-500",
            "from-blue-400 to-blue-600",
            "from-purple-400 to-purple-500",
            "from-orange-400 to-orange-500",
            "from-cyan-400 to-cyan-500",
            "from-pink-400 to-pink-500",
            "from-lime-400 to-lime-500",
          ];
          const gradient = GRADIENTS[idx % GRADIENTS.length];

          return (
            <div key={idx} className="group relative flex flex-col items-center shrink-0 snap-center">
              {/* Checkmark above */}
              <div className={cn(
                "h-8 flex items-end justify-center transition-all duration-300",
                itemCompleted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
              )}>
                {itemCompleted && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 drop-shadow-sm scale-90 mb-1">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>

              {/* Grey Enhanced Tooltip (Below) */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-y-1 transition-all duration-300 pointer-events-none z-30 scale-95 group-hover:scale-100 mt-2">
                <div className="relative bg-[#f1f3f5] text-[#495057] text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.08)] font-light border border-[#dee2e6]">
                  {item.title}
                  {/* Arrow pointing UP */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#f1f3f5] rotate-45 border-l border-t border-[#dee2e6]" />
                </div>
              </div>

              <button
                onClick={() => setActiveIndex(idx)}
                disabled={locked && !itemCompleted}
                className={cn(
                  "relative h-12 flex items-center justify-center transition-all duration-300 px-6 min-w-[80px]",
                  current
                    ? `bg-gradient-to-b ${gradient} from-50% to-50% text-white z-20 scale-105 shadow-xl shadow-primary/20`
                    : itemCompleted
                      ? `bg-gradient-to-b ${gradient} from-50% to-50% text-white/90 z-10 hover:brightness-110`
                      : "bg-gradient-to-b from-muted from-50% to-muted-foreground/15 to-50% text-muted-foreground hover:brightness-95"
                )}
                style={{
                  clipPath: idx === 0 
                    ? "polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%)"
                    : "polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)",
                  marginLeft: idx === 0 ? "0" : "-7px",
                  borderRadius: idx === 0 ? "8px 0 0 8px" : "0" // Slight rounding for the flat left edge
                }}
              >
                <div className="flex items-center justify-center font-bold italic transition-transform duration-300 group-hover:scale-110">
                  {locked && !itemCompleted ? (
                    <Lock className="h-3.5 w-3.5 opacity-60" />
                  ) : current ? (
                    <span className="text-sm drop-shadow-sm">{idx + 1}</span>
                  ) : (
                    // Empty space to maintain width if completed and active is wider
                    <span className="text-sm opacity-0">{idx + 1}</span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <SeminarItemCard
          key={activeItem.id}
          item={activeItem}
          index={activeIndex}
          completed={isCompleted}
          isLastPendingItem={!isCompleted && remainingCount === 1}
          isFinalItem={activeIndex === items.length - 1}
          isLocked={isLocked}
          allCompleted={allCompleted}
          applicantId={applicantId}
          completionCta={completionCta}
          documentChoiceHrefs={documentChoiceHrefs}
          onCompleted={addOptimisticCompletedId}
        />
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          variant="outline"
          onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="w-32"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="hidden sm:block text-sm font-medium text-muted-foreground">
          Module {activeIndex + 1} of {items.length}
        </div>

        <Button
          variant={isCompleted || activeIndex < items.length - 1 ? "outline" : "default"}
          onClick={() => setActiveIndex(Math.min(items.length - 1, activeIndex + 1))}
          disabled={activeIndex === items.length - 1 || (!isCompleted && !allCompleted)}
          className="w-32"
        >
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SeminarItemCard({
  item,
  index,
  completed,
  isLastPendingItem,
  isFinalItem,
  isLocked,
  allCompleted,
  applicantId,
  completionCta,
  documentChoiceHrefs,
  onCompleted
}: SeminarItemCardProps) {
  const [state, formAction, pending] = useActionState(updateSeminarProgressAction, initialActionState);
  const justFinishedSeries = isLastPendingItem && (state.success || completed);
  const showSeriesCompletionCTA = justFinishedSeries || (allCompleted && completed && isFinalItem);
  const statusLabel = completed ? "Completed" : isLocked ? "Locked" : "Pending";

  const handleFormAction = (formData: FormData) => {
    onCompleted(item.id);
    formAction(formData);
  };

  return (
    <Card className={cn("transition-all duration-300 shadow-xl border-border/40 overflow-hidden", isLocked && "border-dashed border-muted-foreground/40 bg-muted/20 opacity-80")}>
      <CardHeader className="relative border-b border-border/50 bg-muted/5 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <span className="rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Module {index + 1}
              </span>
              {completed && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              )}
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">{item.title}</CardTitle>
          </div>
          {isLocked && (
             <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 ring-1 ring-inset ring-amber-700/10">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <RichTextContent 
          value={item.description} 
          className="text-[1.02rem] leading-7 text-foreground/85" 
          replacements={{
            "{{PLUMBERS_LIST}}": <AccreditedPlumbersTable />
          }}
        />
        <SeminarMedia item={item} />
        <form action={handleFormAction} className="flex flex-wrap items-center gap-3 pt-4">
          <input type="hidden" name="applicantId" value={applicantId} />
          <input type="hidden" name="seminarItemId" value={item.id} />
          <input type="hidden" name="completed" value="true" />
          <Button 
            type="submit" 
            disabled={completed || isLocked} 
            loading={pending}
            size="lg"
            className={cn("min-w-[180px] font-bold shadow-lg transition-all", !completed && !isLocked && "hover:scale-105 active:scale-95")}
          >
            {completed ? "Completed" : isLocked ? "Previous module required" : "Mark as completed"}
          </Button>
          <div className="min-w-[240px] flex-1">
            <FormMessage state={state} />
          </div>
        </form>
        {isLocked ? (
          <p className="text-sm text-muted-foreground">
            This seminar unlocks after you complete the previous seminar item.
          </p>
        ) : null}
        {showSeriesCompletionCTA ? (
          <div className="rounded-2xl border border-primary/25 bg-[linear-gradient(135deg,rgba(47,160,183,0.10),rgba(251,188,3,0.18))] p-4 shadow-sm">
            {documentChoiceHrefs ? (
              <DocumentSubmissionChoice
                variant="links"
                onlineHref={documentChoiceHrefs.online}
                officeHref={documentChoiceHrefs.office}
                title="Seminar finished — choose your document path"
              />
            ) : (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">Seminar finished</p>
                  <p className="text-sm text-foreground/80">
                    {completionCta?.description ?? "Your next step is to proceed with the application form."}
                  </p>
                </div>
                <Button asChild className="min-w-[220px]">
                  <a href={completionCta?.href ?? `/applicant/applications/new?applicant=${applicantId}`}>
                    {completionCta?.label ?? "Proceed to application"}
                  </a>
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
