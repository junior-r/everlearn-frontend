"use client";

import { LinkBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState, type FormEvent } from "react";
import {
  fetchGuardianLinks,
  GUARDIAN_RELATIONSHIPS,
  linkGuardian,
  unlinkGuardian,
  type GuardianLink,
  type GuardianRelationship,
} from "@/entities/guardian";
import { MemberPicker, type MemberMatch } from "@/entities/member";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, DataTable, ErrorNotice, SelectField, type Column } from "@/shared/ui";

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

/**
 * Who answers for which Student. The office ties a Guardian to a Student here;
 * from then on the Guardian sees that Student's schedule, grades and attendance.
 * Both are found by searching: an institution has too many members to list.
 */
export function GuardianLinks({ institutionId }: { institutionId: string }) {
  const { admin, errors } = useDictionary();
  const text = admin.guardians;
  const load = useCallback(() => fetchGuardianLinks(institutionId), [institutionId]);
  const links = useResource(load);
  const [guardian, setGuardian] = useState<MemberMatch | null>(null);
  const [student, setStudent] = useState<MemberMatch | null>(null);
  const [relationship, setRelationship] = useState<GuardianRelationship>("MOTHER");
  const save = useCallback(
    (body: Parameters<typeof linkGuardian>[1]) => linkGuardian(institutionId, body),
    [institutionId],
  );
  const linking = useSubmit(save);
  const remove = useCallback((id: string) => unlinkGuardian(institutionId, id).then(() => true), [institutionId]);
  const unlinking = useSubmit(remove);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guardian || !student) {
      return;
    }
    const linked = await linking.submit({
      guardianMembershipId: guardian.membershipId,
      studentMembershipId: student.membershipId,
      relationship,
    });
    if (linked) {
      setGuardian(null);
      setStudent(null);
      links.reload();
    }
  }

  async function handleUnlink(link: GuardianLink) {
    if (await unlinking.submit(link.id)) {
      links.reload();
    }
  }

  const columns: Array<Column<GuardianLink>> = [
    { header: text.guardian, cell: (row) => <span className="font-medium">{fullName(row.guardian)}</span> },
    { header: text.student, cell: (row) => fullName(row.student) },
    { header: text.relationship, cell: (row) => text.relationships[row.relationship] },
    {
      header: admin.common.actions,
      cell: (row) => (
        <Button
          size="sm"
          variant="danger"
          aria-label={format(text.unlinkFor, { guardian: fullName(row.guardian), student: fullName(row.student) })}
          onClick={() => handleUnlink(row)}
        >
          <LinkBreakIcon aria-hidden weight="bold" className="size-4" />
          {text.unlink}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ErrorNotice message={errorMessage(errors, links.error ?? linking.error ?? unlinking.error)} />
      <DataTable
        caption={text.title}
        columns={columns}
        rows={links.data ?? []}
        getKey={(row) => row.id}
        emptyText={text.empty}
      />
      <form
        onSubmit={handleSubmit}
        aria-label={text.linkTitle}
        className="grid max-w-4xl items-end gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-[1fr_1fr_12rem_auto]"
      >
        <MemberPicker institutionId={institutionId} role="GUARDIAN" label={text.guardian} value={guardian} onChange={setGuardian} />
        <MemberPicker institutionId={institutionId} role="STUDENT" label={text.student} value={student} onChange={setStudent} />
        <SelectField
          label={text.relationship}
          value={relationship}
          onChange={(event) => setRelationship(event.target.value as GuardianRelationship)}
          options={GUARDIAN_RELATIONSHIPS.map((value) => ({ value, label: text.relationships[value] }))}
        />
        <Button
          type="submit"
          size="sm"
          className="h-11"
          disabled={!guardian || !student}
          isLoading={linking.isSubmitting}
        >
          {text.link}
        </Button>
      </form>
    </div>
  );
}
