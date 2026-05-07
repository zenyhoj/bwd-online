const MANILA_TIMEZONE = "Asia/Manila";

const manilaDateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric"
});

const manilaDateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

export function formatDateTime(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return manilaDateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return manilaDateFormatter.format(new Date(value));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(value);
}
