"use client";

import { BooksIcon, CalendarCheckIcon, HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import {
  fetchMyWards,
  fetchWardOverview,
  groupByDay,
  type AttendanceEntry,
  type Ward,
  type WardOverview as Overview,
} from "@/entities/guardian";
import { DAYS, formatTime } from "@/entities/schedule";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { toneFor } from "@/shared/lib/tone";
import { useResource } from "@/shared/lib/use-resource";
import { Avatar, Badge, BarChart, ErrorNotice, Section, StatCard, StatGrid, type BadgeTone } from "@/shared/ui";

const WEEK = [...DAYS, "SUNDAY"] as const;
const STATUS_TONE: Record<AttendanceEntry["status"], BadgeTone> = {
  PRESENT: "mint",
  LATE: "sun",
  ABSENT: "coral",
  EXCUSED: "sky",
};

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;
const emptyBox = "rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted";

function WardDetails({ overview }: { overview: Overview }) {
  const { days, guardian: text, evaluations } = useDictionary();
  const locale = useLocale();
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const { attendance } = overview;
  const week = groupByDay(overview.schedule, WEEK);
  const typeLabel = (type: string) =>
    Object.hasOwn(evaluations.types, type) ? evaluations.types[type as keyof typeof evaluations.types] : type;

  return (
    <>
      <StatGrid label={text.summary}>
        <StatCard label={text.courses} value={String(overview.courses.length)} icon={BooksIcon} tone="sky" />
        <StatCard
          label={text.attendanceRate}
          value={attendance.rate === null ? "—" : `${number(attendance.rate)}%`}
          hint={attendance.rate === null ? text.noAttendance : text.attendanceHint}
          icon={CalendarCheckIcon}
          tone="mint"
        />
        <StatCard
          label={text.upcoming}
          value={String(overview.upcoming.length)}
          hint={text.upcomingHint}
          icon={HourglassMediumIcon}
          tone="sun"
        />
      </StatGrid>

      <BarChart
        title={text.averagesTitle}
        hint={text.averagesHint}
        emptyText={text.averagesEmpty}
        max={100}
        bars={overview.courses.map((course) => ({
          label: course.subjectName,
          value: course.average ?? 0,
          display: course.average === null ? text.noAverage : `${number(course.average)}%`,
          tone: toneFor(course.subjectCode),
        }))}
      />

      <Section title={text.scheduleTitle}>
        {week.length === 0 ? (
          <p className={emptyBox}>{text.scheduleEmpty}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {week.map(({ day, classes }) => (
              <section
                key={day}
                aria-label={days[day]}
                className="rounded-2xl border border-line bg-surface p-4 shadow-card"
              >
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
                          {[entry.teacherName, entry.room && format(text.room, { room: entry.room })]
                            .filter(Boolean)
                            .join(" · ") || text.noTeacher}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Section>

      <Section title={text.upcomingTitle}>
        {overview.upcoming.length === 0 ? (
          <p className={emptyBox}>{text.upcomingEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {overview.upcoming.map((evaluation) => (
              <li
                key={evaluation.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line bg-surface px-4 py-3 text-sm"
              >
                <span className="font-medium">{evaluation.title}</span>
                <Badge tone="neutral">{typeLabel(evaluation.type)}</Badge>
                <span className="text-muted">{evaluation.subjectName}</span>
                <span className="ml-auto text-muted">{dateTime.format(new Date(evaluation.dueAt))}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={text.attendanceTitle}>
        {attendance.recent.length === 0 ? (
          <p className={emptyBox}>{text.attendanceEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attendance.recent.map((entry) => (
              <li
                key={`${entry.date}:${entry.subjectName}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm"
              >
                <span className="w-28 text-muted">{date.format(new Date(entry.date))}</span>
                <span className="font-medium">{entry.subjectName}</span>
                <span className="ml-auto">
                  <Badge tone={STATUS_TONE[entry.status]}>{text.status[entry.status]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function WardPanel({ institutionId, ward }: { institutionId: string; ward: Ward }) {
  const { common, errors } = useDictionary();
  const load = useCallback(
    () => fetchWardOverview(institutionId, ward.membershipId),
    [institutionId, ward.membershipId],
  );
  const overview = useResource(load);
  if (!overview.data) {
    return overview.error ? (
      <ErrorNotice message={errorMessage(errors, overview.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  return <WardDetails overview={overview.data} />;
}

/**
 * A Guardian's portal: the Students they answer for and, for the one chosen,
 * the weekly schedule, averages, upcoming evaluations and attendance. Every
 * figure comes from the backend, which shows only the Guardian's own wards.
 */
export function GuardianPortal({ institutionId }: { institutionId: string }) {
  const { common, errors, guardian: text } = useDictionary();
  const load = useCallback(() => fetchMyWards(institutionId), [institutionId]);
  const wards = useResource(load);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const chosen = wards.data?.find((ward) => ward.membershipId === chosenId) ?? wards.data?.[0];

  if (!wards.data) {
    return wards.error ? (
      <ErrorNotice message={errorMessage(errors, wards.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  if (!chosen) {
    return <p className={emptyBox}>{text.noWards}</p>;
  }
  return (
    <>
      <div role="tablist" aria-label={text.wards} className="flex flex-wrap gap-2">
        {wards.data.map((ward) => {
          const isChosen = ward.membershipId === chosen.membershipId;
          return (
            <button
              key={ward.membershipId}
              type="button"
              role="tab"
              aria-selected={isChosen}
              onClick={() => setChosenId(ward.membershipId)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                isChosen ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/50",
              )}
            >
              <Avatar name={fullName(ward)} />
              <span>
                <span className="block text-sm font-semibold">{fullName(ward)}</span>
                <span className="block text-xs text-muted">
                  {ward.groups.length > 0
                    ? format(text.group, { name: ward.groups.map((group) => group.name).join(", ") })
                    : text.noGroup}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        aria-label={fullName(chosen)}
        // A panel per ward, so one Student's figures are never shown under another's name
        key={chosen.membershipId}
        className="flex flex-col gap-8"
      >
        <WardPanel institutionId={institutionId} ward={chosen} />
      </div>
    </>
  );
}
