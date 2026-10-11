"use client";

import { useCallback, useState } from "react";
import { fetchPensums, type Pensum } from "@/entities/pensum";
import { fetchSubjects } from "@/entities/subject";
import { CreatePensumForm, PensumSubjectsEditor } from "@/features/pensums/manage-pensums";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Button, DataTable, ErrorNotice, type Column } from "@/shared/ui";
import { AdminPage, Section, WithActiveInstitution } from "@/widgets/admin-shell";

function Pensums({ institutionId }: { institutionId: string }) {
  const { admin, errors } = useDictionary();
  const text = admin.pensums;
  const loadPensums = useCallback(() => fetchPensums(institutionId), [institutionId]);
  const loadSubjects = useCallback(() => fetchSubjects(institutionId), [institutionId]);
  const pensums = useResource(loadPensums);
  const subjects = useResource(loadSubjects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pensums.data?.find((pensum) => pensum.id === selectedId) ?? null;

  const columns: Array<Column<Pensum>> = [
    { header: text.code, cell: (row) => <code>{row.code}</code> },
    { header: text.name, cell: (row) => row.name },
    { header: text.version, cell: (row) => row.version },
    { header: text.subjectCount, cell: (row) => row.subjects.length },
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

  return (
    <>
      <ErrorNotice message={errorMessage(errors, pensums.error ?? subjects.error)} />
      <DataTable
        caption={text.title}
        columns={columns}
        rows={pensums.data ?? []}
        getKey={(row) => row.id}
        emptyText={text.empty}
      />
      {selected && (
        <Section title={format(text.subjectsTitle, { name: selected.name })}>
          <PensumSubjectsEditor
            pensum={selected}
            subjects={subjects.data ?? []}
            onChanged={pensums.reload}
          />
        </Section>
      )}
      <Section title={text.newTitle} panel>
        <CreatePensumForm institutionId={institutionId} onCreated={pensums.reload} />
      </Section>
    </>
  );
}

export function PensumsPage() {
  const { admin } = useDictionary();
  return (
    <AdminPage title={admin.pensums.title} subtitle={admin.pensums.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <Pensums key={institutionId} institutionId={institutionId} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
