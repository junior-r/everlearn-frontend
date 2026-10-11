/** A month of a year; `month` counts from 0 like `Date`. */
export interface YearMonth {
  year: number;
  month: number;
}

const DAYS_PER_WEEK = 7;

export const monthOf = (date: Date): YearMonth => ({ year: date.getFullYear(), month: date.getMonth() });

/** The month `offset` months away, rolling over years. */
export function shiftMonth({ year, month }: YearMonth, offset: number): YearMonth {
  return monthOf(new Date(year, month + offset, 1));
}

/** A day in the viewer's time zone as "YYYY-MM-DD", to group and compare by day. */
export function dayKey(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The weeks a month calendar shows, Monday first: whole weeks, so the first and
 * last may hold days of the neighbouring months.
 */
export function monthGrid({ year, month }: YearMonth): Date[][] {
  const first = new Date(year, month, 1);
  // getDay() counts from Sunday; a week here starts on Monday
  const leading = (first.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((leading + daysInMonth) / DAYS_PER_WEEK);
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: DAYS_PER_WEEK }, (_, day) => new Date(year, month, 1 - leading + week * DAYS_PER_WEEK + day)),
  );
}

/** From the first instant of a month to the first instant of the next. */
export function monthRange({ year, month }: YearMonth): { from: Date; to: Date } {
  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 1) };
}

/** Groups items by the day their date falls on, keeping their order within a day. */
export function groupByDay<Item>(items: Item[], dateOf: (item: Item) => Date): Map<string, Item[]> {
  const days = new Map<string, Item[]>();
  for (const item of items) {
    const key = dayKey(dateOf(item));
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return days;
}
