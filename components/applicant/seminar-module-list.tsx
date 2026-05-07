"use client";

import { useActionState } from "react";

import { Download } from "lucide-react";

import { updateSeminarProgressAction } from "@/actions/seminar";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
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

export function SeminarModuleList({ items, progress, applicantId, completionCta }: SeminarModuleListProps) {
  const completedIds = new Set(progress.filter((entry) => entry.completed).map((entry) => entry.seminar_item_id));
  const remainingCount = items.filter((item) => !completedIds.has(item.id)).length;
  const allCompleted = items.length > 0 && remainingCount === 0;
  let hasEncounteredPendingItem = false;

  return (
    <div className="grid gap-5">
      {items.map((item, index) => {
        const completed = completedIds.has(item.id);
        const isLocked = !completed && hasEncounteredPendingItem;

        if (!completed && !hasEncounteredPendingItem) {
          hasEncounteredPendingItem = true;
        }

        return (
          <SeminarItemCard
            key={item.id}
            item={item}
            index={index}
            completed={completed}
            isLastPendingItem={!completed && remainingCount === 1}
            isFinalItem={index === items.length - 1}
            isLocked={isLocked}
            allCompleted={allCompleted}
            applicantId={applicantId}
            completionCta={completionCta}
          />
        );
      })}
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
  completionCta
}: SeminarItemCardProps) {
  const [state, formAction, pending] = useActionState(updateSeminarProgressAction, initialActionState);
  const justFinishedSeries = isLastPendingItem && state.success;
  const showSeriesCompletionCTA = justFinishedSeries || (allCompleted && completed && isFinalItem);
  const statusLabel = completed ? "Completed" : isLocked ? "Locked" : "Pending";

  return (
    <Card className={cn(isLocked && "border-dashed border-muted-foreground/40 bg-muted/20")}>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Seminar {index + 1}</p>
          <CardTitle className="text-xl">{item.title}</CardTitle>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
          {statusLabel}
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <RichTextContent value={item.description} className="text-[1.02rem] leading-7 text-foreground/85" />
        <SeminarMedia item={item} />
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="applicantId" value={applicantId} />
          <input type="hidden" name="seminarItemId" value={item.id} />
          <input type="hidden" name="completed" value="true" />
          <Button type="submit" disabled={completed || isLocked} loading={pending}>
            {completed ? "Completed" : isLocked ? "Complete previous seminar first" : "Mark as completed"}
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
