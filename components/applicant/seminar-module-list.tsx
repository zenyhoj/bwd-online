"use client";

import { useActionState } from "react";

import { Download } from "lucide-react";

import { updateSeminarProgressAction } from "@/actions/seminar";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicantSeminarProgress, SeminarItem } from "@/types";

type SeminarModuleListProps = {
  items: SeminarItem[];
  progress: ApplicantSeminarProgress[];
  applicantId: string;
};

type SeminarItemCardProps = {
  item: SeminarItem;
  index: number;
  completed: boolean;
  isLastPendingItem: boolean;
  applicantId: string;
};

function SeminarMedia({ item }: { item: SeminarItem }) {
  if (item.media_type === "image" && item.media_url) {
    return (
      <img
        src={item.media_url}
        alt={item.title}
        className="w-full h-auto rounded-xl ring-1 ring-border/80"
      />
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

export function SeminarModuleList({ items, progress, applicantId }: SeminarModuleListProps) {
  const completedIds = new Set(progress.filter((entry) => entry.completed).map((entry) => entry.seminar_item_id));
  const remainingCount = items.filter((item) => !completedIds.has(item.id)).length;
  const allCompleted = items.length > 0 && remainingCount === 0;

  return (
    <div className="grid gap-5">
      {items.map((item, index) => {
        const completed = completedIds.has(item.id);

        return (
          <SeminarItemCard
            key={item.id}
            item={item}
            index={index}
            completed={completed}
            isLastPendingItem={!completed && remainingCount === 1}
            applicantId={applicantId}
          />
        );
      })}
      {allCompleted ? (
        <Card className="border-0 bg-[linear-gradient(135deg,rgba(47,160,183,0.14),rgba(255,179,26,0.22))]">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Seminar finished</p>
              <p className="text-sm text-foreground/80">
                Your next step is to submit your application.
              </p>
            </div>
            <Button asChild className="min-w-[240px]">
              <a href={`/applicant/applications/new?applicant=${applicantId}`}>Proceed to application</a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SeminarItemCard({ item, index, completed, isLastPendingItem, applicantId }: SeminarItemCardProps) {
  const [state, formAction, pending] = useActionState(updateSeminarProgressAction, initialActionState);
  const justFinishedSeries = isLastPendingItem && state.success;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Seminar {index + 1}</p>
          <CardTitle className="text-xl">{item.title}</CardTitle>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
          {completed ? "Completed" : "Pending"}
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
        <SeminarMedia item={item} />
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="applicantId" value={applicantId} />
          <input type="hidden" name="seminarItemId" value={item.id} />
          <input type="hidden" name="completed" value="true" />
          <Button type="submit" disabled={completed} loading={pending}>
            {completed ? "Completed" : "Mark as completed"}
          </Button>
          <div className="min-w-[240px] flex-1">
            <FormMessage state={state} />
          </div>
        </form>
        {justFinishedSeries ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4">
            <p className="text-sm font-medium text-emerald-900">
              You finished the full seminar series. Continue now to submit your application.
            </p>
            <Button asChild className="mt-3">
              <a href={`/applicant/applications/new?applicant=${applicantId}`}>Proceed to application</a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
