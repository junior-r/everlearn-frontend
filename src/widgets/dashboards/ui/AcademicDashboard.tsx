"use client";

import {
  CalendarCheckIcon,
  ChalkboardTeacherIcon,
  StudentIcon,
  UsersFourIcon,
  WarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useCallback } from "react";
import {
  fetchAcademicOverview,
  fetchInstitutionDashboard,
  type GroupOverview,
  type PensumOverview,
} from "@/entities/dashboard";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { TONES } from "@/shared/lib/tone";
import { useResource } from "@/shared/lib/use-resource";
import { Badge, BarChart, DataTable, ErrorNotice, Section, StatCard, StatGrid, type Column } from "@/shared/ui";
import { countFormatter, percentFormatter } from "../lib/format";

/** Teachers shown in the chart; the rest have fewer hours than these. */
const BUSIEST_TEACHERS = 8;

/**
 * The teaching of an institution at a glance, for a Principal: the groups of
 * the running period, each Teacher's weekly load, and the pensums. Read-only:
 * changing any of it stays with the Institution Admin.
 */
export function AcademicDashboard({ institutionId }: { institutionId: string }) {
  const { common, dashboard, errors } = useDictionary();
  const text = dashboard.academic;
  const locale = useLocale();
  const count = countFormatter(locale);
  const percent = percentFormatter(locale);
  const hours = (value: number) =>
    format(text.hours, { hours: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value) });
  const loadFigures = useCallback(() => fetchInstitutionDashboard(institutionId), [institutionId]);
  const loadAcademic = useCallback(() => fetchAcademicOverview(institutionId), [institutionId]);
  const figures = useResource(loadFigures);
  const academic = useResource(loadAcademic);

  if (!figures.data || !academic.data) {
    const error = figures.error ?? academic.error;
    return error ? (
      <ErrorNotice message={errorMessage(errors, error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  const { groups, pensums, teachers } = academic.data;
  const unassigned = groups.reduce((total, group) => total + group.coursesWithoutTeacher, 0);
  const busiest = [...teachers].sort((a, b) => b.weeklyHours - a.weeklyHours).slice(0, BUSIEST_TEACHERS);

  const groupColumns: Array<Column<GroupOverview>> = [
    { header: text.groups.name, cell: (row) => <span className="font-medium">{row.name}</span> },
    { header: text.groups.pensum, cell: (row) => row.pensumName },
    { header: text.groups.students, cell: (row) => count(row.students) },
    { header: text.groups.courses, cell: (row) => count(row.courses) },
    {
      header: text.groups.withoutTeacher,
      cell: (row) =>
        row.coursesWithoutTeacher > 0 ? (
          <Badge tone="coral">{count(row.coursesWithoutTeacher)}</Badge>
        ) : (
          <span className="text-muted">{count(0)}</span>
        ),
    },
    { header: text.groups.weeklyHours, cell: (row) => hours(row.weeklyHours) },
  ];
  const pensumColumns: Array<Column<PensumOverview>> = [
    { header: text.pensums.code, cell: (row) => <code>{row.code}</code> },
    { header: text.pensums.name, cell: (row) => <span className="font-medium">{row.name}</span> },
    { header: text.pensums.subjects, cell: (row) => count(row.subjects) },
    { header: text.pensums.activeGroups, cell: (row) => count(row.activeGroups) },
  ];

  return (
    <>
      <StatGrid label={text.summary}>
        <StatCard
          label={text.activeGroups}
          value={count(figures.data.activeGroups)}
          hint={text.activeGroupsHint}
          icon={UsersFourIcon}
          tone="pink"
        />
        <StatCard label={text.students} value={count(figures.data.activeStudents)} icon={StudentIcon} tone="sky" />
        <StatCard label={text.teachers} value={count(figures.data.teachers)} icon={ChalkboardTeacherIcon} tone="grape" />
        <StatCard
          label={text.attendanceRate}
          value={figures.data.attendanceRate === null ? "—" : percent(figures.data.attendanceRate)}
          hint={figures.data.attendanceRate === null ? text.noAttendance : text.attendanceHint}
          icon={CalendarCheckIcon}
          tone="mint"
        />
        <StatCard
          label={text.unassigned}
          value={count(unassigned)}
          hint={text.unassignedHint}
          icon={WarningIcon}
          tone="coral"
        />
      </StatGrid>

      <Section title={text.groups.title}>
        <DataTable
          caption={text.groups.title}
          columns={groupColumns}
          rows={groups}
          getKey={(row) => row.id}
          emptyText={text.groups.empty}
        />
      </Section>

      <div className="max-w-3xl">
        <BarChart
          title={text.load.title}
          hint={text.load.hint}
          emptyText={text.load.empty}
          bars={busiest.map((teacher, index) => ({
            label: `${teacher.name} · ${format(text.load.courses, { count: count(teacher.courses) })}`,
            value: teacher.weeklyHours,
            display: hours(teacher.weeklyHours),
            tone: TONES[index % TONES.length],
          }))}
        />
      </div>

      <Section title={text.pensums.title}>
        <DataTable
          caption={text.pensums.title}
          columns={pensumColumns}
          rows={pensums}
          getKey={(row) => row.id}
          emptyText={text.pensums.empty}
        />
      </Section>
    </>
  );
}
