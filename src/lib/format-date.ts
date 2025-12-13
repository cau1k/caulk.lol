function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;

  // Date-only strings parse as UTC in JS (timezone shifts).
  // Force local time for YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(`${input}T00:00:00`);

  return new Date(input);
}

export function formatDate(date: string | Date) {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date) {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "";

  const datePart = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${datePart} at ${timePart}`;
}

export function formatRelativeTime(date: string | Date, now = new Date()) {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "";

  const diffMs = d.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMs < MINUTE) return rtf.format(Math.round(diffMs / 1_000), "second");
  if (absMs < HOUR) return rtf.format(Math.round(diffMs / MINUTE), "minute");
  if (absMs < DAY) return rtf.format(Math.round(diffMs / HOUR), "hour");
  if (absMs < WEEK) return rtf.format(Math.round(diffMs / DAY), "day");
  if (absMs < MONTH) return rtf.format(Math.round(diffMs / WEEK), "week");
  if (absMs < YEAR) return rtf.format(Math.round(diffMs / MONTH), "month");
  return rtf.format(Math.round(diffMs / YEAR), "year");
}
