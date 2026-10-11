"use client";

import { useCallback } from "react";
import { fetchMembers, type Member } from "@/entities/member";
import { registrableRoles, roleTone, statusTone, useSession, type Role } from "@/entities/session";
import { RegisterMemberForm } from "@/features/members/register-member";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Avatar, Badge, DataTable, ErrorNotice, type Column } from "@/shared/ui";
import { AdminPage, Section, WithActiveInstitution } from "@/widgets/admin-shell";

function Members({ institutionId }: { institutionId: string }) {
  const { user } = useSession();
  const { admin, errors, roles, userStatus } = useDictionary();
  const text = admin.members;
  const load = useCallback(() => fetchMembers(institutionId), [institutionId]);
  const members = useResource(load);
  // Shown most junior first, so the default choice is the least privileged
  const allowedRoles: Role[] = user ? [...registrableRoles(user, institutionId)].reverse() : [];

  const columns: Array<Column<Member>> = [
    {
      header: text.name,
      cell: (row) => (
        <span className="flex items-center gap-3 font-medium">
          <Avatar name={`${row.firstName} ${row.lastName}`} />
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    { header: text.email, cell: (row) => <span className="text-muted">{row.email}</span> },
    { header: text.role, cell: (row) => <Badge tone={roleTone[row.role]}>{roles[row.role]}</Badge> },
    {
      header: text.status,
      cell: (row) => <Badge tone={statusTone(row.status)}>{userStatus[row.status]}</Badge>,
    },
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
      <Section title={text.newTitle} panel>
        <RegisterMemberForm
          institutionId={institutionId}
          allowedRoles={allowedRoles}
          onRegistered={members.reload}
        />
      </Section>
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
