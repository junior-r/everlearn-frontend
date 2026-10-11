"use client";

import { BooksIcon, NotePencilIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback } from "react";
import { fetchTeacherDashboard, type StudentAtRisk } from "@/entities/dashboard";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import type { Tone } from "@/shared/lib/tone";
import { useResource } from "@/shared/lib/use-resource";
import { Avatar, ColumnChart, DataTable, ErrorNotice, Section, StatCard, StatGrid, type Column } from "@/shared/ui";
import { countFormatter, percentFormatter } from "../lib/format";

// One tone per band, from the lowest grades to the highest
const BAND_TONES: Tone[] = ["coral", "sun", "sky", "grape", "mint"];

/** A Teacher's own courses at a glance: what is left to publish, who is at risk, and how grades spread. */
export function TeacherDashboard({ institutionId }: { institutionId: string }) {
  const { common, dashboard, errors } = useDictionary();
  const text = dashboard.teacher;
  const locale = useLocale();
  const count = countFormatter(locale);
  const percent = percentFormatter(locale);
  const load = useCallback(() => fetchTeacherDashboard(institutionId), [institutionId]);
  const figures = useResource(load);
  const data = figures.data;

  if (!data) {
    return figures.error ? (
      <ErrorNotice message={errorMessage(errors, figures.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  const columns: Array<Column<StudentAtRisk>> = [
    {
      header: text.columns.student,
      cell: (row) => (
        <span className="flex items-center gap-2.5 font-medium">
          <Avatar name={row.name} />
          {row.name}
        </span>
      ),
    },
    { header: text.columns.group, cell: (row) => row.group },
    {
      header: text.columns.attendance,
      cell: (row) => <span className="font-mono font-semibold text-danger tabular-nums">{percent(row.attendancePercent)}</span>,
    },
    {
      header: text.columns.classes,
      cell: (row) =>
        format(text.classes, { attended: count(row.attendedClasses), counted: count(row.countedClasses) }),
    },
  ];
  return (
    <>
      <StatGrid label={text.summary}>
        <StatCard label={text.activeCourses} value={count(data.activeCourses)} icon={BooksIcon} tone="sky" />
        <StatCard
          label={text.draftEvaluations}
          value={count(data.draftEvaluations)}
          hint={text.draftHint}
          icon={NotePencilIcon}
          tone="sun"
        />
        <StatCard
          label={text.atRisk}
          value={count(data.studentsAtRisk.length)}
          hint={text.atRiskHint}
          icon={WarningIcon}
          tone="coral"
        />
      </StatGrid>
      <ColumnChart
        title={text.distributionTitle}
        hint={format(text.distributionHint, { count: count(data.gradedAverages) })}
        emptyText={text.distributionEmpty}
        bars={data.gradeDistribution.map((band, index) => ({
          label: format(text.band, { from: String(band.from), to: String(band.to) }),
          value: band.students,
          display: count(band.students),
          tone: BAND_TONES[index % BAND_TONES.length],
        }))}
      />
      <Section title={text.atRiskTitle}>
        <DataTable
          caption={text.atRiskTitle}
          columns={columns}
          rows={data.studentsAtRisk}
          getKey={(row) => `${row.group}:${row.name}`}
          emptyText={text.atRiskEmpty}
        />
      </Section>
    </>
  );
}
