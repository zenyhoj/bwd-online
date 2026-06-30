"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BUSINESS_END_HOUR,
  BUSINESS_SCHEDULE_LABEL,
  BUSINESS_START_HOUR,
  validateBusinessSchedule
} from "@/lib/business-hours";
import { cn } from "@/lib/utils";

type BusinessDateTimeInputProps = {
  id: string;
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  minDateTime?: string;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  unrestrictedDates?: boolean;
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric"
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateTimeLocalValue(dateKey: string, time: string) {
  return dateKey && time ? `${dateKey}T${time}` : "";
}

function parseDateTimeLocal(value?: string) {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  return match ? { dateKey: match[1], time: match[2] } : null;
}

function getTimeSlots() {
  const slots: string[] = [];

  for (let hour = BUSINESS_START_HOUR; hour <= BUSINESS_END_HOUR; hour += 1) {
    slots.push(`${pad(hour)}:00`);

    if (hour < BUSINESS_END_HOUR) {
      slots.push(`${pad(hour)}:30`);
    }
  }

  return slots;
}

function getMonthGrid(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstGridDate = new Date(year, month, 1 - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    return date;
  });
}

function isAllowedWeekday(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 4;
}

function isBeforeMinDate(dateKey: string, minDateTime?: string) {
  const min = parseDateTimeLocal(minDateTime);
  return Boolean(min && dateKey < min.dateKey);
}

function hasAvailableTime(dateKey: string, minDateTime?: string) {
  const min = parseDateTimeLocal(minDateTime);

  if (!min || dateKey !== min.dateKey) {
    return true;
  }

  return getTimeSlots().some((slot) => slot >= min.time);
}

function getDateLabel(dateKey: string) {
  if (!dateKey) {
    return "Choose a date";
  }

  return DATE_FORMATTER.format(new Date(`${dateKey}T00:00:00`));
}

export function BusinessDateTimeInput({
  id,
  name,
  value: controlledValue,
  defaultValue,
  onValueChange,
  minDateTime,
  disabled = false,
  required = false,
  compact = false,
  unrestrictedDates = false
}: BusinessDateTimeInputProps) {
  const parsedDefault = parseDateTimeLocal(controlledValue ?? defaultValue);
  const [selectedDate, setSelectedDate] = useState(parsedDefault?.dateKey ?? "");
  const [selectedTime, setSelectedTime] = useState(parsedDefault?.time ?? "");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const baseDate = parsedDefault?.dateKey ?? parseDateTimeLocal(minDateTime)?.dateKey;
    return baseDate ? new Date(`${baseDate}T00:00:00`) : new Date();
  });
  const value = controlledValue ?? toDateTimeLocalValue(selectedDate, selectedTime);
  const parsedValue = parseDateTimeLocal(value);
  const activeDate = parsedValue?.dateKey ?? selectedDate;
  const activeTime = parsedValue?.time ?? selectedTime;
  const validation = unrestrictedDates
    ? { valid: value ? Boolean(parseDateTimeLocal(value)) : !required, message: "Invalid date format." }
    : value
      ? validateBusinessSchedule(value)
      : { valid: !required };
  const isMissingRequiredTime = required && Boolean(activeDate) && !activeTime;
  const timeSlots = useMemo(() => getTimeSlots(), []);
  const availableTimeSlots = useMemo(() => {
    if (!activeDate) {
      return timeSlots;
    }

    const min = unrestrictedDates ? null : parseDateTimeLocal(minDateTime);
    if (!min || activeDate !== min.dateKey) {
      return timeSlots;
    }

    return timeSlots.filter((slot) => slot >= min.time);
  }, [activeDate, minDateTime, timeSlots]);
  const calendarDays = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);

  function selectDate(date: Date) {
    const dateKey = toDateKey(date);
    const min = unrestrictedDates ? null : parseDateTimeLocal(minDateTime);
    const retainedTime = dateKey === activeDate ? activeTime : "";
    const nextTime = retainedTime && min?.dateKey === dateKey && retainedTime < min.time ? "" : retainedTime;
    const nextValue = toDateTimeLocalValue(dateKey, nextTime);

    setSelectedDate(dateKey);
    setSelectedTime(nextTime);

    onValueChange?.(nextValue);
  }

  function selectTime(time: string) {
    const nextValue = toDateTimeLocalValue(activeDate, time);

    setSelectedTime(time);

    onValueChange?.(nextValue);
  }

  return (
    <div className={cn("w-full space-y-3", compact ? "max-w-[24rem]" : "max-w-[31rem]", disabled && "opacity-60")}>
      <input
        id={id}
        name={name}
        value={validation.valid ? value : ""}
        readOnly
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-[15rem_8rem]" : "sm:grid-cols-[18rem_10rem]")}>
        <div className="rounded-lg border border-input bg-background p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled}
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-semibold">{MONTH_FORMATTER.format(visibleMonth)}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled}
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 justify-items-center gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {DAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 justify-items-center gap-1">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = activeDate === dateKey;
              const isDisabled =
                disabled ||
                !isCurrentMonth ||
                (!unrestrictedDates && !isAllowedWeekday(date)) ||
                (!unrestrictedDates && isBeforeMinDate(dateKey, minDateTime)) ||
                (!unrestrictedDates && !hasAvailableTime(dateKey, minDateTime));

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(date)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isDisabled && "cursor-not-allowed text-muted-foreground/35 hover:bg-transparent",
                    !isCurrentMonth && isDisabled && "opacity-0"
                  )}
                  aria-label={getDateLabel(dateKey)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-input bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Time</p>
            <select
              value={activeTime}
              disabled={disabled || !activeDate}
              required={required}
              aria-invalid={isMissingRequiredTime || (!validation.valid && Boolean(value))}
              onChange={(event) => selectTime(event.target.value)}
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              <option value="">Select time</option>
              {availableTimeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            <p className="font-medium text-foreground">{activeDate ? getDateLabel(activeDate) : "No date selected"}</p>
            {unrestrictedDates ? null : <p>{BUSINESS_SCHEDULE_LABEL}</p>}
            {isMissingRequiredTime ? <p className="mt-1 text-destructive">Select a time to complete the schedule.</p> : null}
            {!validation.valid && value ? <p className="mt-1 text-destructive">{validation.message}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
