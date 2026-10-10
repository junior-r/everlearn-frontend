"use client";

import { useEffect } from "react";
import { useActiveInstitution, type Institution } from "@/entities/institution";
import { useSession } from "@/entities/session";
import {
  CreateInstitutionForm,
  ToggleInstitutionButton,
} from "@/features/institutions/manage-institutions";
import { errorMessage, useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { DataTable, ErrorNotice, type Column } from "@/shared/ui";
import { AdminPage } from "@/widgets/admin-shell";

export function InstitutionsPage() {
  const router = useLocalizedRouter();
  const { user } = useSession();
  const { admin, errors } = useDictionary();
  const text = admin.institutions;
  // The shell's list is the source of truth, so a new institution also appears in the switcher
  const { institutions, error, reload } = useActiveInstitution();
  const isPlatformAdmin = user?.isPlatformAdmin === true;

  useEffect(() => {
    if (user && !isPlatformAdmin) {
      router.replace("/admin/members");
    }
  }, [user, isPlatformAdmin, router]);

  if (!isPlatformAdmin) {
    return null;
  }

  const columns: Array<Column<Institution>> = [
    { header: text.name, cell: (row) => row.name },
    { header: text.slug, cell: (row) => <code>{row.slug}</code> },
    { header: text.timezone, cell: (row) => row.timezone },
    {
      header: text.status,
      cell: (row) => (row.isActive ? admin.common.active : admin.common.inactive),
    },
    {
      header: admin.common.actions,
      cell: (row) => <ToggleInstitutionButton institution={row} onChanged={reload} />,
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
      <section className="max-w-md">
        <h2 className="mb-4 text-lg font-semibold">{text.newTitle}</h2>
        <CreateInstitutionForm onCreated={reload} />
      </section>
    </AdminPage>
  );
}
