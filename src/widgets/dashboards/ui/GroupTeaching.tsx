"use client";

import { useCallback } from "react";
import { fetchGroupTeaching, type GroupTeaching as Teaching } from "@/entities/dashboard";
import { WeekTimetable } from "@/entities/schedule";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Badge, DataTable, ErrorNotice, Section, type Column } from "@/shared/ui";

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

interface GroupTeachingProps {
  institutionId: string;
  groupId: string;
}

/**
 * One group for whoever oversees the teaching: the Teacher of each subject and
 * the weekly timetable. It is given a count of Students and no roster.
 * Read-only: assigning and scheduling stay with the Institution Admin.
 */
export function GroupTeaching({ institutionId, groupId }: GroupTeachingProps) {
  const { common, dashboard, errors } = useDictionary();
  const text = dashboard.academic.group;
  const locale = useLocale();
  const load = useCallback(() => fetchGroupTeaching(institutionId, groupId), [institutionId, groupId]);
  const group = useResource(load);

  if (!group.data) {
    return group.error ? (
      <ErrorNotice message={errorMessage(errors, group.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  const count = new Intl.NumberFormat(locale);
  const columns: Array<Column<Teaching["courses"][number]>> = [
    {
      header: text.subject,
      cell: (row) => (
        <>
          <span className="font-medium">{row.name}</span> <code className="text-xs text-muted">{row.code}</code>
        </>
      ),
    },
    {
      header: text.teacher,
      cell: (row) => (row.teacher ? fullName(row.teacher) : <Badge tone="coral">{text.noTeacher}</Badge>),
    },
    {
      header: text.weeklyHours,
      cell: (row) => format(dashboard.academic.hours, { hours: count.format(row.weeklyHours) }),
    },
  ];

  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">{group.data.name}</h2>
        <p className="mt-1 text-sm text-muted">
          {format(text.summary, {
            pensum: group.data.pensumName,
            period: group.data.periodName,
            students: count.format(group.data.students),
          })}
        </p>
      </div>
      <Section title={text.coursesTitle}>
        <DataTable
          caption={text.coursesTitle}
          columns={columns}
          rows={group.data.courses}
          getKey={(row) => row.subjectId}
          emptyText={text.coursesEmpty}
        />
      </Section>
      <Section title={text.scheduleTitle}>
        <WeekTimetable
          schedule={group.data.schedule}
          emptyText={text.scheduleEmpty}
          labels={{ room: text.room, noTeacher: text.noTeacher }}
        />
      </Section>
    </>
  );
}
