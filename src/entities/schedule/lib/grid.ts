export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
export type DayOfWeek = (typeof DAYS)[number] | "SUNDAY";

/** A weekly recurring span; minutes count from midnight and the end is exclusive. */
export interface TimeRange {
  dayOfWeek: DayOfWeek;
  startMinute: number;
  endMinute: number;
}

// The weekly grids show one row per hour of the school day
export const FIRST_HOUR = 6;
export const LAST_HOUR = 20;
export const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, index) => FIRST_HOUR + index);

const MINUTES_PER_HOUR = 60;

/** 510 → "08:30". */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** "08:30" → 510; null for anything that is not a time of day. */
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 24 && minutes < MINUTES_PER_HOUR && hours * 60 + minutes <= 24 * 60
    ? hours * MINUTES_PER_HOUR + minutes
    : null;
}

export const cellKey = (day: DayOfWeek, hour: number) => `${day}:${hour}`;

const hourRange = (day: DayOfWeek, hour: number): TimeRange => ({
  dayOfWeek: day,
  startMinute: hour * MINUTES_PER_HOUR,
  endMinute: (hour + 1) * MINUTES_PER_HOUR,
});

const covers = (window: TimeRange, range: TimeRange) =>
  window.dayOfWeek === range.dayOfWeek &&
  window.startMinute <= range.startMinute &&
  range.endMinute <= window.endMinute;

/** The grid cells (whole hours) that availability windows fully cover. */
export function cellsFromWindows(windows: TimeRange[]): Set<string> {
  const cells = new Set<string>();
  for (const day of DAYS) {
    for (const hour of HOURS) {
      if (windows.some((window) => covers(window, hourRange(day, hour)))) {
        cells.add(cellKey(day, hour));
      }
    }
  }
  return cells;
}

/** The selected cells as windows, with consecutive hours of a day joined into one. */
export function windowsFromCells(cells: Set<string>): TimeRange[] {
  const windows: TimeRange[] = [];
  for (const day of DAYS) {
    let open: TimeRange | null = null;
    for (const hour of HOURS) {
      if (!cells.has(cellKey(day, hour))) {
        open = null;
      } else if (open) {
        open.endMinute = (hour + 1) * MINUTES_PER_HOUR;
      } else {
        open = hourRange(day, hour);
        windows.push(open);
      }
    }
  }
  return windows;
}

/** The item occupying any part of a grid cell, if there is one. */
export function findInCell<Item extends TimeRange>(items: Item[], day: DayOfWeek, hour: number): Item | null {
  const cell = hourRange(day, hour);
  return (
    items.find(
      (item) =>
        item.dayOfWeek === day && item.startMinute < cell.endMinute && cell.startMinute < item.endMinute,
    ) ?? null
  );
}

/** Whether a cell is the first one an item appears in, where its label and actions are shown. */
export function startsInCell(item: TimeRange, hour: number): boolean {
  return Math.max(Math.floor(item.startMinute / MINUTES_PER_HOUR), FIRST_HOUR) === hour;
}
