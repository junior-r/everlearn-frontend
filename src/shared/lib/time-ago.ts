const STEPS: Array<[unit: Intl.RelativeTimeFormatUnit, seconds: number]> = [
  ["day", 86_400],
  ["hour", 3600],
  ["minute", 60],
];
const WEEK_SECONDS = 7 * 86_400;

/**
 * How long ago something happened, in the reader's language ("hace 5 minutos").
 * After a week the date itself says more than a count of days.
 */
export function timeAgo(iso: string, locale: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds >= WEEK_SECONDS) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(then);
  }
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of STEPS) {
    if (seconds >= size) {
      return relative.format(-Math.floor(seconds / size), unit);
    }
  }
  return relative.format(0, "minute");
}
