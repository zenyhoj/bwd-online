"use client";

import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
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
  maxDateTime?: string;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  unrestrictedDates?: boolean;
  allowDateJump?: boolean;
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2020, month, 1))
);
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

function isAfterMaxDate(dateKey: string, maxDateTime?: string) {
  const max = parseDateTimeLocal(maxDateTime);
  return Boolean(max && dateKey > max.dateKey);
}

function hasAvailableTime(dateKey: string, minDateTime?: string, maxDateTime?: string) {
  const min = parseDateTimeLocal(minDateTime);
  const max = parseDateTimeLocal(maxDateTime);

  return getTimeSlots().some((slot) => {
    if (min && dateKey === min.dateKey && slot < min.time) return false;
    if (max && dateKey === max.dateKey && slot > max.time) return false;
    return true;
  });
}

function getDateLabel(dateKey: string) {
  if (!dateKey) {
    return "Choose a date";
  }

  return DATE_FORMATTER.format(new Date(`${dateKey}T00:00:00`));
}

function formatTimeSlot(time: string) {
  if (!time) {
    return "Not selected";
  }

  const [hourValue, minute] = time.split(":").map(Number);
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;

  return `${hour}:${pad(minute)} ${period}`;
}

export function BusinessDateTimeInput({
  id,
  name,
  value: controlledValue,
  defaultValue,
  onValueChange,
  minDateTime,
  maxDateTime,
  disabled = false,
  required = false,
  compact = false,
  unrestrictedDates = false,
  allowDateJump = false
}: BusinessDateTimeInputProps) {
  const parsedDefault = parseDateTimeLocal(controlledValue ?? defaultValue);
  const [selectedDate, setSelectedDate] = useState(parsedDefault?.dateKey ?? "");
  const [selectedTime, setSelectedTime] = useState(parsedDefault?.time ?? "");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const baseDate = parsedDefault?.dateKey ?? parseDateTimeLocal(minDateTime)?.dateKey ?? parseDateTimeLocal(maxDateTime)?.dateKey;
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
  const isComplete = Boolean(activeDate && activeTime && validation.valid);
  const todayKey = toDateKey(new Date());
  const yearOptions = useMemo(
    () => Array.from({ length: 21 }, (_, index) => visibleMonth.getFullYear() - 10 + index),
    [visibleMonth]
  );
  const timeSlots = useMemo(() => getTimeSlots(), []);
  const availableTimeSlots = useMemo(() => {
    if (!activeDate) {
      return timeSlots;
    }

    const min = parseDateTimeLocal(minDateTime);
    const max = parseDateTimeLocal(maxDateTime);

    return timeSlots.filter((slot) => {
      if (min && activeDate === min.dateKey && slot < min.time) return false;
      if (max && activeDate === max.dateKey && slot > max.time) return false;
      return true;
    });
  }, [activeDate, maxDateTime, minDateTime, timeSlots]);
  const calendarDays = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);

  function selectDate(date: Date) {
    const dateKey = toDateKey(date);
    const min = parseDateTimeLocal(minDateTime);
    const max = parseDateTimeLocal(maxDateTime);
    const retainedTime = dateKey === activeDate ? activeTime : "";
    const nextTime =
      retainedTime &&
      ((min?.dateKey === dateKey && retainedTime < min.time) || (max?.dateKey === dateKey && retainedTime > max.time))
        ? ""
        : retainedTime;
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

  function changeVisibleMonth(month: number) {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), month, 1));
  }

  function changeVisibleYear(year: number) {
    setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
  }

  return (
    <div className={cn("w-full", compact ? "max-w-[24rem]" : "max-w-[33rem]", disabled && "opacity-60")}>
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
      <div
        className={cn(
          "grid overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm",
          compact ? "sm:grid-cols-[15rem_9rem]" : "sm:grid-cols-[18rem_15rem]"
        )}
      >
        <div className="border-b border-border/70 bg-muted/20 p-3 sm:border-b-0 sm:border-r">
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
            {allowDateJump && !compact ? (
              <div className="flex items-center gap-1.5">
                <select
                  value={visibleMonth.getMonth()}
                  disabled={disabled}
                  onChange={(event) => changeVisibleMonth(Number(event.target.value))}
                  aria-label="Calendar month"
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {MONTH_LABELS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={visibleMonth.getFullYear()}
                  disabled={disabled}
                  onChange={(event) => changeVisibleYear(Number(event.target.value))}
                  aria-label="Calendar year"
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm font-semibold">{MONTH_FORMATTER.format(visibleMonth)}</p>
            )}
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
              const isToday = dateKey === todayKey;
              const isDisabled =
                disabled ||
                !isCurrentMonth ||
                (!unrestrictedDates && !isAllowedWeekday(date)) ||
                isBeforeMinDate(dateKey, minDateTime) ||
                isAfterMaxDate(dateKey, maxDateTime) ||
                !hasAvailableTime(dateKey, minDateTime, maxDateTime);

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
                    isToday && !isSelected && "ring-1 ring-primary/50",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isDisabled && "cursor-not-allowed text-muted-foreground/35 hover:bg-transparent",
                    !isCurrentMonth && isDisabled && "opacity-0"
                  )}
                  aria-label={getDateLabel(dateKey)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          {allowDateJump && !compact ? (
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
              <p className="text-[11px] text-muted-foreground">Select an available weekday</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled}
                onClick={() => setVisibleMonth(new Date())}
              >
                Today
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex min-h-full flex-col bg-background">
          <div className="border-b border-border/70 p-4">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  isComplete ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
                )}
              >
                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Appointment</p>
                <p className="mt-1 text-sm font-semibold leading-5">
                  {isComplete ? "Ready to schedule" : activeDate ? "Choose a time" : "Choose a date"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Date</p>
              <p className="mt-1 text-sm font-medium leading-5">{activeDate ? getDateLabel(activeDate) : "Not selected"}</p>
            </div>
            <div>
              <label htmlFor={`${id}-time`} className="text-xs font-medium text-muted-foreground">
                Time
              </label>
              <select
                id={`${id}-time`}
                value={activeTime}
                disabled={disabled || !activeDate}
                required={required}
                aria-invalid={isMissingRequiredTime || (!validation.valid && Boolean(value))}
                onChange={(event) => selectTime(event.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted/40"
              >
                <option value="">Select time</option>
                {availableTimeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTimeSlot(slot)}
                  </option>
                ))}
              </select>
              {isMissingRequiredTime ? <p className="mt-1.5 text-xs text-destructive">Select a time to continue.</p> : null}
            </div>
          </div>
          <div className="mt-auto border-t border-border/70 bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">
            {unrestrictedDates ? null : (
              <div className="flex gap-2">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Available schedule</p>
                  <p>{BUSINESS_SCHEDULE_LABEL}</p>
                </div>
              </div>
            )}
            {!validation.valid && value ? <p className="mt-1 text-destructive">{validation.message}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
