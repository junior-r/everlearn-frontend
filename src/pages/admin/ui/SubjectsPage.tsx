"use client";

import { useCallback, useState } from "react";
import { fetchSubjects, type Subject } from "@/entities/subject";
import { CreateSubjectForm, DeleteSubjectButton } from "@/features/subjects/manage-subjects";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { DataTable, ErrorNotice, type Column } from "@/shared/ui";
import { AdminPage, Section, WithActiveInstitution } from "@/widgets/admin-shell";

function Subjects({ institutionId }: { institutionId: string }) {
  const { admin, errors } = useDictionary();
  const text = admin.subjects;
  const load = useCallback(() => fetchSubjects(institutionId), [institutionId]);
  const subjects = useResource(load);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const columns: Array<Column<Subject>> = [
    { header: text.code, cell: (row) => <code>{row.code}</code> },
    { header: text.name, cell: (row) => row.name },
    { header: text.description, cell: (row) => row.description ?? "" },
    {
      header: admin.common.actions,
      cell: (row) => (
        <DeleteSubjectButton
          subject={row}
          onError={setDeleteError}
          onDeleted={() => {
            setDeleteError(null);
            subjects.reload();
          }}
        />
      ),
    },
  ];

  return (
    <>
      <ErrorNotice message={errorMessage(errors, subjects.error ?? deleteError)} />
      <DataTable
        caption={text.title}
        columns={columns}
        rows={subjects.data ?? []}
        getKey={(row) => row.id}
        emptyText={text.empty}
      />
      <Section title={text.newTitle} panel>
        <CreateSubjectForm institutionId={institutionId} onCreated={subjects.reload} />
      </Section>
    </>
  );
}

export function SubjectsPage() {
  const { admin } = useDictionary();
  return (
    <AdminPage title={admin.subjects.title} subtitle={admin.subjects.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <Subjects key={institutionId} institutionId={institutionId} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
