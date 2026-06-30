export const BUSINESS_SCHEDULE_LABEL = "Monday - Thursday, 7:00 AM - 6:00 PM only.";
export const BUSINESS_START_HOUR = 7;
export const BUSINESS_END_HOUR = 18;

function parseDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute)
  };
}

export function toManilaDate(value: string) {
  const normalized = value.length === 16 ? `${value}:00+08:00` : `${value}+08:00`;
  return new Date(normalized);
}

export function toManilaISOString(value: string) {
  return toManilaDate(value).toISOString();
}

/**
 * Validates if a given datetime string falls within admin office hours:
 * - Monday to Thursday
 * - Between 07:00 AM and 06:00 PM
 * Assumes the input is intended for the UTC+8 (Asia/Manila) timezone.
 */
export function validateBusinessSchedule(scheduledAtStr: string): { valid: boolean; message?: string } {
  if (!scheduledAtStr) {
    return { valid: false, message: "Schedule date and time are required." };
  }

  const parsed = parseDateTimeLocal(scheduledAtStr);

  if (!parsed) {
    return { valid: false, message: "Invalid date format." };
  }

  // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  if (
    date.getFullYear() !== parsed.year ||
    date.getMonth() !== parsed.month - 1 ||
    date.getDate() !== parsed.day
  ) {
    return { valid: false, message: "Invalid date format." };
  }

  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
    return { valid: false, message: "Schedules are only allowed from Monday to Thursday." };
  }

  if (parsed.hour < BUSINESS_START_HOUR) {
    return { valid: false, message: "Appointments cannot be scheduled before 7:00 AM." };
  }

  if (parsed.hour > BUSINESS_END_HOUR || (parsed.hour === BUSINESS_END_HOUR && parsed.minute > 0)) {
    return { valid: false, message: "Appointments cannot be scheduled after 6:00 PM." };
  }

  return { valid: true };
}
