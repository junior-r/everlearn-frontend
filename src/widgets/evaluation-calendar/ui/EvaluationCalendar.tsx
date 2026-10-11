"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useId, useMemo, useState } from "react";
import {
  dayKey,
  evaluationTypeTone,
  fetchDueEvaluations,
  formatDateTime,
  groupByDay,
  monthGrid,
  monthOf,
  monthRange,
  shiftMonth,
  type CalendarEntry,
} from "@/entities/evaluation";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { toneFor, toneSoft, toneSolid, type Tone } from "@/shared/lib/tone";
import { useResource } from "@/shared/lib/use-resource";
import { Badge, Button, ErrorNotice } from "@/shared/ui";

/** More than this in one day and the rest are counted instead of listed. */
const MAX_CHIPS_PER_DAY = 3;

/** The soft background of a chip, from the `sm` breakpoint up; written out so Tailwind sees the classes. */
const toneSoftFromSm: Record<Tone, string> = {
  sun: "sm:bg-sun-soft sm:text-sun-ink",
  coral: "sm:bg-coral-soft sm:text-coral-ink",
  mint: "sm:bg-mint-soft sm:text-mint-ink",
  sky: "sm:bg-sky-soft sm:text-sky-ink",
  grape: "sm:bg-grape-soft sm:text-grape-ink",
  pink: "sm:bg-pink-soft sm:text-pink-ink",
};

const dueDate = (entry: CalendarEntry) => new Date(entry.dueAt);

interface DayCellProps {
  day: Date;
  /** The day belongs to the previous or the next month. */
  isOutside: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
}

function DayCell({ day, isOutside, isToday, entries }: DayCellProps) {
  const hidden = entries.length - MAX_CHIPS_PER_DAY;
  return (
    <td className={cn("h-20 border-t border-l border-line p-1 align-top first:border-l-0 sm:h-28 sm:p-1.5", isOutside && "pattern-hatch text-muted")}>
      <time
        dateTime={dayKey(day)}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full font-mono text-xs tabular-nums",
          isToday && "bg-brand font-semibold text-on-brand",
        )}
      >
        {day.getDate()}
      </time>
      {entries.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1 sm:flex-col">
          {entries.slice(0, MAX_CHIPS_PER_DAY).map((entry) => {
            const tone = toneFor(entry.subject.code);
            return (
              <li
                key={entry.id}
                title={`${entry.title} · ${entry.subject.name}`}
                className={cn("flex items-center gap-1 rounded-md sm:px-1.5 sm:py-0.5", toneSoftFromSm[tone])}
              >
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", toneSolid[tone])} />
                {/* On a phone the cell only fits the dot; the list below the grid carries the text */}
                <span className="sr-only truncate text-xs font-medium sm:not-sr-only">{entry.title}</span>
              </li>
            );
          })}
          {hidden > 0 && <li className="text-xs text-muted">+{hidden}</li>}
        </ul>
      )}
    </td>
  );
}

/**
 * A month of evaluation due dates across everything the member teaches and
 * attends: a grid to see the month at a glance and a list with the details.
 */
export function EvaluationCalendar({ institutionId }: { institutionId: string }) {
  const { errors, evaluations } = useDictionary();
  const text = evaluations.calendar;
  const locale = useLocale();
  const agendaId = useId();
  const [month, setMonth] = useState(() => monthOf(new Date()));
  const weeks = useMemo(() => monthGrid(month), [month]);
  const load = useCallback(() => {
    // The whole grid, so the days of neighbouring months it shows are filled too
    const lastDay = weeks[weeks.length - 1][6];
    const to = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1);
    return fetchDueEvaluations(institutionId, weeks[0][0], to);
  }, [institutionId, weeks]);
  const due = useResource(load);
  const byDay = useMemo(() => groupByDay(due.data ?? [], dueDate), [due.data]);
  const { from, to } = monthRange(month);
  const inMonth = (due.data ?? []).filter((entry) => dueDate(entry) >= from && dueDate(entry) < to);
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(from);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const today = dayKey(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 aria-live="polite" className="mr-auto text-xl font-semibold first-letter:uppercase">
          {monthName}
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setMonth(monthOf(new Date()))}>
          {text.today}
        </Button>
        <Button size="sm" variant="secondary" aria-label={text.previous} onClick={() => setMonth(shiftMonth(month, -1))}>
          <CaretLeftIcon aria-hidden weight="bold" className="size-4" />
        </Button>
        <Button size="sm" variant="secondary" aria-label={text.next} onClick={() => setMonth(shiftMonth(month, 1))}>
          <CaretRightIcon aria-hidden weight="bold" className="size-4" />
        </Button>
      </div>
      <ErrorNotice message={errorMessage(errors, due.error)} />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">{format(text.caption, { month: monthName })}</caption>
          <thead className="bg-surface-muted text-xs text-muted">
            <tr>
              {weeks[0].map((day) => (
                <th key={day.getDay()} scope="col" className="px-1.5 py-2 text-center font-medium first-letter:uppercase">
                  {weekday.format(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={dayKey(week[0])}>
                {week.map((day) => (
                  <DayCell
                    key={dayKey(day)}
                    day={day}
                    isOutside={day.getMonth() !== month.month}
                    isToday={dayKey(day) === today}
                    entries={byDay.get(dayKey(day)) ?? []}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-labelledby={agendaId} className="flex flex-col gap-3">
        <h3 id={agendaId} className="flex items-center gap-2.5 text-lg font-semibold">
          <span aria-hidden className="h-5 w-1.5 rounded-full bg-sun" />
          {format(text.agenda, { month: monthName })}
        </h3>
        {due.data !== null && inMonth.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted">{text.empty}</p>
        )}
        <ul className="flex flex-col gap-2">
          {inMonth.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span aria-hidden className={cn("h-10 w-1.5 rounded-full", toneSolid[toneFor(entry.subject.code)])} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {entry.title}
                  <Badge tone={evaluationTypeTone[entry.type]}>{evaluations.types[entry.type]}</Badge>
                  {!entry.isPublished && <Badge tone="neutral">{text.draft}</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {format(text.course, { subject: entry.subject.name, group: entry.groupName })}
                </p>
              </div>
              <time dateTime={entry.dueAt} className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", toneSoft.sky)}>
                {formatDateTime(entry.dueAt, locale)}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
