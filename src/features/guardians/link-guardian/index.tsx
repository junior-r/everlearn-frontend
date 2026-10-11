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
import type { Member } from "@/entities/member";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, DataTable, ErrorNotice, SelectField, type Column } from "@/shared/ui";

interface GuardianLinksProps {
  institutionId: string;
  /** The members of the institution; Guardians and Students are picked from them. */
  members: Member[];
}

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

/**
 * Who answers for which Student. The office ties a Guardian to a Student here;
 * from then on the Guardian sees that Student's schedule, grades and attendance.
 */
export function GuardianLinks({ institutionId, members }: GuardianLinksProps) {
  const { admin, errors } = useDictionary();
  const text = admin.guardians;
  const load = useCallback(() => fetchGuardianLinks(institutionId), [institutionId]);
  const links = useResource(load);
  const guardians = members.filter((member) => member.role === "GUARDIAN");
  const students = members.filter((member) => member.role === "STUDENT");
  const [guardianId, setGuardianId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [relationship, setRelationship] = useState<GuardianRelationship>("MOTHER");
  const save = useCallback(
    (body: Parameters<typeof linkGuardian>[1]) => linkGuardian(institutionId, body),
    [institutionId],
  );
  const linking = useSubmit(save);
  const remove = useCallback((id: string) => unlinkGuardian(institutionId, id).then(() => true), [institutionId]);
  const unlinking = useSubmit(remove);
  // The first of each list until one is chosen, so the form is ready as soon as it has options
  const chosenGuardian = guardianId || guardians[0]?.membershipId || "";
  const chosenStudent = studentId || students[0]?.membershipId || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const linked = await linking.submit({
      guardianMembershipId: chosenGuardian,
      studentMembershipId: chosenStudent,
      relationship,
    });
    if (linked) {
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
  const canLink = guardians.length > 0 && students.length > 0;

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
      {canLink ? (
        <form
          onSubmit={handleSubmit}
          aria-label={text.linkTitle}
          className="grid max-w-3xl items-end gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <SelectField
            label={text.guardian}
            value={chosenGuardian}
            onChange={(event) => setGuardianId(event.target.value)}
            options={guardians.map((member) => ({ value: member.membershipId, label: fullName(member) }))}
          />
          <SelectField
            label={text.student}
            value={chosenStudent}
            onChange={(event) => setStudentId(event.target.value)}
            options={students.map((member) => ({ value: member.membershipId, label: fullName(member) }))}
          />
          <SelectField
            label={text.relationship}
            value={relationship}
            onChange={(event) => setRelationship(event.target.value as GuardianRelationship)}
            options={GUARDIAN_RELATIONSHIPS.map((value) => ({ value, label: text.relationships[value] }))}
          />
          <Button type="submit" size="sm" className="h-11" isLoading={linking.isSubmitting}>
            {text.link}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">{text.needsBoth}</p>
      )}
    </div>
  );
}
