"use client";

import Link from "next/link";
import { Building2, CheckCircle2, CloudUpload, LockKeyhole } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";

import { setDocumentSubmissionModeAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { cn } from "@/lib/utils";

export type DocumentSubmissionMode = "online" | "office";

type DocumentSubmissionChoiceProps = {
  variant: "links" | "radio" | "action";
  selectedMode?: DocumentSubmissionMode | null;
  onlineHref?: string;
  officeHref?: string;
  applicationId?: string;
  inputName?: string;
  locked?: boolean;
  error?: string;
  compact?: boolean;
  title?: string;
  description?: string;
};

const OPTIONS: Array<{
  mode: DocumentSubmissionMode;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof CloudUpload;
}> = [
  {
    mode: "online",
    eyebrow: "Online",
    title: "Upload online",
    description: "Upload PDF, JPG, or PNG files after completing the seminar and track their review online.",
    icon: CloudUpload
  },
  {
    mode: "office",
    eyebrow: "At the BWD office",
    title: "Submit physical documents",
    description: "Bring the required physical documents to the BWD office for staff verification.",
    icon: Building2
  }
];

export function DocumentSubmissionChoice({
  variant,
  selectedMode = null,
  onlineHref,
  officeHref,
  applicationId,
  inputName = "documentSubmissionMode",
  locked = false,
  error,
  compact = false,
  title = "Choose how you'll submit your documents",
  description = "Choose how you will submit your documents. You can submit them as soon as the seminar is complete, even while your inspection is not yet scheduled."
}: DocumentSubmissionChoiceProps) {
  const [state, formAction, pending] = useActionState(setDocumentSubmissionModeAction, initialActionState);
  const [radioValue, setRadioValue] = useState<DocumentSubmissionMode | null>(selectedMode);
  const headingId = useId();

  useEffect(() => {
    setRadioValue(selectedMode);
  }, [selectedMode]);

  const activeMode = variant === "radio" ? radioValue : selectedMode;

  function renderCard(mode: DocumentSubmissionMode) {
    const option = OPTIONS.find((entry) => entry.mode === mode)!;
    const Icon = option.icon;
    const isSelected = activeMode === mode;
    const isOnline = mode === "online";
    const cardClassName = cn(
      "group relative flex h-full min-h-[190px] w-full flex-col rounded-2xl border-2 p-5 text-left transition-all duration-200",
      "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      isSelected
        ? isOnline
          ? "border-[#2FA0B7] bg-[#2FA0B7]/10 shadow-sm"
          : "border-[#FBBC03] bg-[#FBBC03]/10 shadow-sm"
        : "border-border/80 bg-background hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md",
      locked && !isSelected && "opacity-55"
    );

    const content = (
      <>
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              isOnline ? "bg-[#2FA0B7]/15 text-[#237F92]" : "bg-[#FBBC03]/20 text-[#8A6500]"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          {isSelected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Selected
            </span>
          ) : null}
        </div>
        <div className="mt-5 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{option.eyebrow}</p>
          <p className="mt-1.5 font-heading text-lg font-semibold text-foreground">{option.title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3 text-xs font-semibold text-foreground">
          {locked ? <LockKeyhole className="h-3.5 w-3.5" /> : null}
          {locked
            ? isSelected
              ? "Submission method locked"
              : "Unavailable"
            : isSelected
              ? "Current choice"
              : variant === "action"
                ? "Switch to this method"
                : "Choose this method"}
        </div>
      </>
    );

    if (variant === "links") {
      const href = mode === "online" ? onlineHref : officeHref;
      return (
        <Link key={mode} href={href ?? "#"} className={cardClassName} aria-label={`Choose ${option.title.toLowerCase()}`}>
          {content}
        </Link>
      );
    }

    if (variant === "radio") {
      return (
        <label key={mode} className={cn(cardClassName, "cursor-pointer")}>
          <input
            type="radio"
            name={inputName}
            value={mode}
            checked={radioValue === mode}
            onChange={() => setRadioValue(mode)}
            required
            className="sr-only"
          />
          {content}
        </label>
      );
    }

    return (
      <form key={mode} action={formAction} className="h-full">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="submissionMode" value={mode} />
        <button
          type="submit"
          disabled={pending || locked || isSelected}
          className={cn(cardClassName, !locked && !isSelected && "cursor-pointer")}
          aria-label={isSelected ? `${option.title} is selected` : `Switch to ${option.title.toLowerCase()}`}
        >
          {content}
        </button>
      </form>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby={headingId}>
      <div className="space-y-1.5">
        <h3 id={headingId} className="font-heading text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className={cn("grid gap-4", compact ? "md:grid-cols-2" : "sm:grid-cols-2")}>
        {renderCard("online")}
        {renderCard("office")}
      </div>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {locked ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" />
          This choice can no longer be changed because document verification is complete.
        </p>
      ) : null}
      {variant === "action" ? <FormMessage state={state} /> : null}
    </section>
  );
}
