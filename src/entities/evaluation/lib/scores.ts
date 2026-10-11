/** What a score field holds: nothing, a usable number, or text that is not a valid score. */
export type ParsedScore = { kind: "empty" } | { kind: "valid"; value: number } | { kind: "invalid" };

const SCORE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

/** Reads a score as typed, with a comma or a point for decimals, and checks it against the maximum. */
export function parseScore(text: string, maxScore: number): ParsedScore {
  const trimmed = text.trim();
  if (!trimmed) {
    return { kind: "empty" };
  }
  if (!SCORE_PATTERN.test(trimmed)) {
    return { kind: "invalid" };
  }
  const value = Number(trimmed.replace(",", "."));
  return value <= maxScore ? { kind: "valid", value } : { kind: "invalid" };
}

/**
 * A score, weight or average with at most two decimals and the locale's decimal
 * mark. No thousands separator, so `parseScore` reads back what this writes.
 */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

/** The value for a `datetime-local` input showing an ISO date-time in the viewer's time zone. */
export function toDateTimeLocal(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The ISO date-time of a `datetime-local` value, or null when the field is empty or unreadable. */
export function fromDateTimeLocal(value: string): string | null {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/** A due date as the locale writes a date and time, in the viewer's time zone. */
export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
