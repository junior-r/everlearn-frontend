"use client";

import { useCallback } from "react";
import { fetchMembers, type Member } from "@/entities/member";
import { useSession } from "@/entities/session";
import { RegisterMemberForm } from "@/features/members/register-member";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { DataTable, ErrorNotice, type Column } from "@/shared/ui";
import { AdminPage, WithActiveInstitution } from "@/widgets/admin-shell";

function Members({ institutionId }: { institutionId: string }) {
  const { user } = useSession();
  const { admin, errors, roles, userStatus } = useDictionary();
  const text = admin.members;
  const load = useCallback(() => fetchMembers(institutionId), [institutionId]);
  const members = useResource(load);

  const columns: Array<Column<Member>> = [
    { header: text.name, cell: (row) => `${row.firstName} ${row.lastName}` },
    { header: text.email, cell: (row) => row.email },
    { header: text.role, cell: (row) => roles[row.role] },
    { header: text.status, cell: (row) => userStatus[row.status] },
  ];

  return (
    <>
      <ErrorNotice message={errorMessage(errors, members.error)} />
      <DataTable
        caption={text.title}
        columns={columns}
        rows={members.data ?? []}
        getKey={(row) => row.membershipId}
        emptyText={text.empty}
      />
      <section className="max-w-md">
        <h2 className="mb-4 text-lg font-semibold">{text.newTitle}</h2>
        <RegisterMemberForm
          institutionId={institutionId}
          canAppointAdmins={user?.isPlatformAdmin === true}
          onRegistered={members.reload}
        />
      </section>
    </>
  );
}

export function MembersPage() {
  const { admin } = useDictionary();
  return (
    <AdminPage title={admin.members.title} subtitle={admin.members.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <Members key={institutionId} institutionId={institutionId} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
