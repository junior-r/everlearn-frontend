"use client";

import {
  ArrowRightIcon,
  CalendarCheckIcon,
  ChalkboardTeacherIcon,
  IdentificationCardIcon,
  StudentIcon,
  UsersFourIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useCallback } from "react";
import { fetchInstitutionDashboard } from "@/entities/dashboard";
import { errorMessage, format, localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { BarChart, ErrorNotice, StatCard, StatGrid } from "@/shared/ui";
import { countFormatter, percentFormatter } from "../lib/format";

/** One institution at a glance, for its Institution Admin. */
export function InstitutionDashboard({ institutionId }: { institutionId: string }) {
  const { common, dashboard, errors } = useDictionary();
  const text = dashboard.institution;
  const locale = useLocale();
  const count = countFormatter(locale);
  const percent = percentFormatter(locale);
  const load = useCallback(() => fetchInstitutionDashboard(institutionId), [institutionId]);
  const figures = useResource(load);
  const data = figures.data;

  if (!data) {
    return figures.error ? (
      <ErrorNotice message={errorMessage(errors, figures.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {data.pendingReviews > 0 && (
        <Link
          href={localizedPath(locale, "/admin/reviews")}
          className="group flex items-center gap-3 rounded-2xl border border-sun bg-sun-soft px-4 py-3 text-sm font-medium text-sun-ink transition-colors hover:bg-sun/30 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <IdentificationCardIcon aria-hidden weight="duotone" className="size-5 shrink-0" />
          {data.pendingReviews === 1
            ? text.pendingOne
            : format(text.pendingMany, { count: count(data.pendingReviews) })}
          <ArrowRightIcon
            aria-hidden
            weight="bold"
            className="ml-auto size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
      <StatGrid label={text.summary}>
        <StatCard label={text.activeStudents} value={count(data.activeStudents)} icon={StudentIcon} tone="sky" />
        <StatCard label={text.teachers} value={count(data.teachers)} icon={ChalkboardTeacherIcon} tone="grape" />
        <StatCard
          label={text.activeGroups}
          value={count(data.activeGroups)}
          hint={text.activeGroupsHint}
          icon={UsersFourIcon}
          tone="pink"
        />
        <StatCard
          label={text.attendanceRate}
          // A dash, not a sentence, where the big figure goes; the hint says why
          value={data.attendanceRate === null ? "—" : percent(data.attendanceRate)}
          hint={data.attendanceRate === null ? text.noAttendance : text.attendanceHint}
          icon={CalendarCheckIcon}
          tone="mint"
        />
      </StatGrid>
      <div className="max-w-2xl">
        <BarChart
          title={text.attendanceTitle}
          hint={text.attendanceChartHint}
          emptyText={text.attendanceEmpty}
          bars={[
            { label: text.marks.present, value: data.attendance.present, tone: "mint" as const },
            { label: text.marks.late, value: data.attendance.late, tone: "sun" as const },
            { label: text.marks.absent, value: data.attendance.absent, tone: "coral" as const },
            { label: text.marks.excused, value: data.attendance.excused, tone: "sky" as const },
          ].map((bar) => ({ ...bar, display: count(bar.value) }))}
        />
      </div>
    </div>
  );
}
