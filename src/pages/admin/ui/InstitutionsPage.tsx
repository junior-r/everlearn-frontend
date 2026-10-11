"use client";

import { useActiveInstitution, type Institution } from "@/entities/institution";
import {
  CreateInstitutionForm,
  ToggleInstitutionButton,
} from "@/features/institutions/manage-institutions";
import { errorMessage, useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { Badge, Button, DataTable, ErrorNotice, type Column } from "@/shared/ui";
import { AdminPage, Section } from "@/widgets/admin-shell";

/** The Platform Admin's home: every institution, how to enter one, and how to create one with its first admin. */
export function InstitutionsPage() {
  const router = useLocalizedRouter();
  const { admin, errors } = useDictionary();
  const text = admin.institutions;
  // The shared list is the source of truth, so a new institution can be entered right away
  const { institutions, active, error, reload, select } = useActiveInstitution();

  function manage(institution: Institution) {
    select(institution.id);
    router.replace("/admin/members");
  }

  const columns: Array<Column<Institution>> = [
    { header: text.name, cell: (row) => <span className="font-medium">{row.name}</span> },
    { header: text.slug, cell: (row) => <code>{row.slug}</code> },
    { header: text.timezone, cell: (row) => row.timezone },
    {
      header: text.status,
      cell: (row) => (
        <Badge tone={row.isActive ? "mint" : "neutral"}>
          {row.isActive ? admin.common.active : admin.common.inactive}
        </Badge>
      ),
    },
    {
      header: admin.common.actions,
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            aria-pressed={row.id === active?.id}
            onClick={() => manage(row)}
            aria-label={`${text.manage}: ${row.name}`}
          >
            {text.manage}
          </Button>
          <ToggleInstitutionButton institution={row} onChanged={reload} />
        </div>
      ),
    },
  ];

  return (
    <AdminPage title={text.title} subtitle={text.subtitle}>
      <ErrorNotice message={errorMessage(errors, error)} />
      <DataTable
        caption={text.title}
        columns={columns}
        rows={institutions}
        getKey={(row) => row.id}
        emptyText={text.empty}
      />
      <Section title={text.newTitle} panel>
        <CreateInstitutionForm onCreated={reload} />
      </Section>
    </AdminPage>
  );
}
