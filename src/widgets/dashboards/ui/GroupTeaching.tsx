"use client";

import { useCallback } from "react";
import { fetchGroup, type GroupCourse } from "@/entities/group";
import { fetchGroupSchedule, WeekTimetable } from "@/entities/schedule";
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
 * the weekly timetable. Read-only: assigning and scheduling stay with the
 * Institution Admin.
 */
export function GroupTeaching({ institutionId, groupId }: GroupTeachingProps) {
  const { common, dashboard, errors } = useDictionary();
  const text = dashboard.academic.group;
  const locale = useLocale();
  const loadGroup = useCallback(() => fetchGroup(institutionId, groupId), [institutionId, groupId]);
  const loadSchedule = useCallback(() => fetchGroupSchedule(institutionId, groupId), [institutionId, groupId]);
  const group = useResource(loadGroup);
  const schedule = useResource(loadSchedule);

  if (!group.data || !schedule.data) {
    const error = group.error ?? schedule.error;
    return error ? (
      <ErrorNotice message={errorMessage(errors, error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  const count = new Intl.NumberFormat(locale);
  const columns: Array<Column<GroupCourse>> = [
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
            pensum: group.data.pensum.name,
            period: group.data.period.name,
            students: count.format(group.data.studentCount),
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
          schedule={schedule.data.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startMinute: slot.startMinute,
            endMinute: slot.endMinute,
            subjectName: slot.subject.name,
            teacherName: slot.teacher && fullName(slot.teacher),
            room: slot.room,
          }))}
          emptyText={text.scheduleEmpty}
          labels={{ room: text.room, noTeacher: text.noTeacher }}
        />
      </Section>
    </>
  );
}
