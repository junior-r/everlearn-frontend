"use client";

import { format, useDictionary } from "@/shared/i18n";
import { DAYS, formatTime } from "../lib/grid";
import { groupByDay, type WeekClass } from "../lib/week";

const WEEK = [...DAYS, "SUNDAY"] as const;

interface WeekTimetableProps {
  schedule: readonly WeekClass[];
  /** Shown instead of the timetable when the week has no classes. */
  emptyText: string;
  /** `room` takes `{room}`; `noTeacher` stands in when a class has neither Teacher nor room. */
  labels: { room: string; noTeacher: string };
}

/** A week of classes, read-only: one card per day that has any, earliest class first. */
export function WeekTimetable({ schedule, emptyText, labels }: WeekTimetableProps) {
  const { days } = useDictionary();
  const week = groupByDay(schedule, WEEK);
  if (week.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted">{emptyText}</p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {week.map(({ day, classes }) => (
        <section key={day} aria-label={days[day]} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <h3 className="font-semibold">{days[day]}</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {classes.map((entry) => (
              <li key={`${entry.startMinute}:${entry.subjectName}`} className="flex gap-3 text-sm">
                <span className="w-24 shrink-0 font-mono text-xs leading-5 text-muted tabular-nums">
                  {formatTime(entry.startMinute)}–{formatTime(entry.endMinute)}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{entry.subjectName}</span>
                  <span className="block text-xs text-muted">
                    {[entry.teacherName, entry.room && format(labels.room, { room: entry.room })]
                      .filter(Boolean)
                      .join(" · ") || labels.noTeacher}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
