"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMemberPage, type Member } from "@/entities/member";
import { registrableRoles, roleTone, statusTone, useSession, type Role } from "@/entities/session";
import { GuardianLinks } from "@/features/guardians/link-guardian";
import { RegisterMemberForm } from "@/features/members/register-member";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Avatar, Badge, DataTable, ErrorNotice, Pagination, SelectField, TextField, type Column } from "@/shared/ui";
import { AdminPage, Section, WithActiveInstitution } from "@/widgets/admin-shell";

/** How long typing must pause before the table asks the server again. */
const SEARCH_DELAY_MS = 300;

function Members({ institutionId }: { institutionId: string }) {
  const { user } = useSession();
  const { admin, errors, roles, userStatus } = useDictionary();
  const text = admin.members;
  const locale = useLocale();
  const [typed, setTyped] = useState("");
  const [filter, setFilter] = useState<{ query: string; role: Role | ""; page: number }>({
    query: "",
    role: "",
    page: 1,
  });
  // The institution may have thousands of members: the server sends one page of whatever is asked for
  const load = useCallback(() => fetchMemberPage(institutionId, filter), [institutionId, filter]);
  const members = useResource(load);
  // Shown most junior first, so the default choice is the least privileged
  const allowedRoles: Role[] = user ? [...registrableRoles(user, institutionId)].reverse() : [];

  useEffect(() => {
    const timer = setTimeout(
      () => setFilter((current) => (current.query === typed ? current : { ...current, query: typed, page: 1 })),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [typed]);

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
  const count = new Intl.NumberFormat(locale);
  const total = members.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (members.data?.pageSize ?? 1)));
  const isFiltered = filter.query !== "" || filter.role !== "";

  return (
    <>
      <ErrorNotice message={errorMessage(errors, members.error)} />
      <form
        role="search"
        aria-label={text.searchTitle}
        onSubmit={(event) => event.preventDefault()}
        className="grid max-w-2xl gap-3 sm:grid-cols-[1fr_14rem]"
      >
        <TextField
          type="search"
          label={text.search}
          placeholder={text.searchPlaceholder}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <SelectField
          label={text.role}
          value={filter.role}
          onChange={(event) => setFilter({ ...filter, role: event.target.value as Role | "", page: 1 })}
          options={[{ value: "", label: text.allRoles }, ...(Object.keys(roles) as Role[]).map((role) => ({ value: role, label: roles[role] }))]}
        />
      </form>
      <DataTable
        caption={text.title}
        columns={columns}
        rows={members.data?.items ?? []}
        getKey={(row) => row.membershipId}
        emptyText={isFiltered ? text.noMatches : text.empty}
      />
      <Pagination
        page={filter.page}
        pageCount={pageCount}
        onChange={(page) => setFilter({ ...filter, page })}
        status={format(text.pageStatus, {
          page: count.format(filter.page),
          pages: count.format(pageCount),
          total: count.format(total),
        })}
        labels={{ navigation: text.pages, previous: text.previousPage, next: text.nextPage }}
      />
      <Section title={text.newTitle} panel>
        <RegisterMemberForm
          institutionId={institutionId}
          allowedRoles={allowedRoles}
          onRegistered={members.reload}
        />
      </Section>
      <Section title={admin.guardians.title}>
        <GuardianLinks institutionId={institutionId} />
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
