/** One class of a week, as a timetable shows it. */
export interface WeekClass {
  dayOfWeek: string;
  /** Minutes from midnight, exclusive end. */
  startMinute: number;
  endMinute: number;
  subjectName: string;
  teacherName: string | null;
  room: string | null;
}

/** A week's classes as a timetable reads: one entry per day that has any, in `days` order, earliest first. */
export function groupByDay<Day extends string, Entry extends WeekClass>(
  schedule: readonly Entry[],
  days: readonly Day[],
): Array<{ day: Day; classes: Entry[] }> {
  return days
    .map((day) => ({
      day,
      classes: schedule
        .filter((entry) => entry.dayOfWeek === day)
        .sort((a, b) => a.startMinute - b.startMinute || a.subjectName.localeCompare(b.subjectName)),
    }))
    .filter(({ classes }) => classes.length > 0);
}
