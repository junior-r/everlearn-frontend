"use client";

import { useCallback, useMemo, useState } from "react";
import {
  fetchGroup,
  fetchGroups,
  fetchPeriods,
  type AcademicPeriod,
  type GroupSummary,
} from "@/entities/group";
import { fetchMembers } from "@/entities/member";
import { fetchPensums } from "@/entities/pensum";
import {
  CreateGroupForm,
  CreatePeriodForm,
  GroupCoursesEditor,
  GroupStudentsEditor,
} from "@/features/groups/manage-groups";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Button, DataTable, ErrorNotice, type Column } from "@/shared/ui";
import { AdminPage, Section, WithActiveInstitution } from "@/widgets/admin-shell";

function Groups({ institutionId }: { institutionId: string }) {
  const { admin, common, errors } = useDictionary();
  const text = admin.groups;
  const periods = useResource(useCallback(() => fetchPeriods(institutionId), [institutionId]));
  const pensums = useResource(useCallback(() => fetchPensums(institutionId), [institutionId]));
  const members = useResource(useCallback(() => fetchMembers(institutionId), [institutionId]));
  const groups = useResource(useCallback(() => fetchGroups(institutionId), [institutionId]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loadSelected = useMemo(
    () => (selectedId ? () => fetchGroup(institutionId, selectedId) : null),
    [institutionId, selectedId],
  );
  const selected = useResource(loadSelected);

  function refresh() {
    selected.reload();
    // The list shows each group's student count
    groups.reload();
  }

  const periodColumns: Array<Column<AcademicPeriod>> = [
    { header: text.periodName, cell: (row) => row.name },
    { header: text.startDate, cell: (row) => row.startDate },
    { header: text.endDate, cell: (row) => row.endDate },
  ];
  const groupColumns: Array<Column<GroupSummary>> = [
    { header: text.name, cell: (row) => row.name },
    { header: text.level, cell: (row) => row.level },
    { header: text.pensum, cell: (row) => `${row.pensum.code} v${row.pensum.version}` },
    { header: text.period, cell: (row) => row.period.name },
    {
      header: text.students,
      cell: (row) => (row.capacity ? `${row.studentCount} / ${row.capacity}` : row.studentCount),
    },
    {
      header: admin.common.actions,
      cell: (row) => (
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={row.id === selectedId}
          onClick={() => setSelectedId(row.id)}
          aria-label={`${text.manage}: ${row.name}`}
        >
          {text.manage}
        </Button>
      ),
    },
  ];

  const loadError = periods.error ?? pensums.error ?? members.error ?? groups.error ?? selected.error;
  return (
    <>
      <ErrorNotice message={errorMessage(errors, loadError)} />

      <DataTable
        caption={text.title}
        columns={groupColumns}
        rows={groups.data ?? []}
        getKey={(row) => row.id}
        emptyText={text.empty}
      />

      {selectedId && !selected.data && selected.isLoading && (
        <p className="text-sm text-muted">{common.loading}</p>
      )}
      {selected.data && (
        <>
          <Section title={format(text.coursesTitle, { name: selected.data.name })}>
            <GroupCoursesEditor
              group={selected.data}
              members={members.data ?? []}
              onChanged={refresh}
            />
          </Section>
          <Section title={format(text.studentsTitle, { name: selected.data.name })}>
            <GroupStudentsEditor
              group={selected.data}
              members={members.data ?? []}
              onChanged={refresh}
            />
          </Section>
        </>
      )}

      <Section title={text.newTitle} panel>
        <CreateGroupForm
          institutionId={institutionId}
          pensums={pensums.data ?? []}
          periods={periods.data ?? []}
          onCreated={(group) => {
            groups.reload();
            setSelectedId(group.id);
          }}
        />
      </Section>

      <Section title={text.periodsTitle}>
        <DataTable
          caption={text.periodsTitle}
          columns={periodColumns}
          rows={periods.data ?? []}
          getKey={(row) => row.id}
          emptyText={text.noPeriods}
        />
        <div className="max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <CreatePeriodForm institutionId={institutionId} onCreated={periods.reload} />
        </div>
      </Section>
    </>
  );
}

export function GroupsPage() {
  const { admin } = useDictionary();
  return (
    <AdminPage title={admin.groups.title} subtitle={admin.groups.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <Groups key={institutionId} institutionId={institutionId} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
