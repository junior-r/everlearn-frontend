"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { AcademicPeriod, Group, GroupCourse } from "@/entities/group";
import type { Member } from "@/entities/member";
import type { Pensum } from "@/entities/pensum";
import { apiClient, forInstitution } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, DataTable, ErrorNotice, SelectField, TextField, type Column } from "@/shared/ui";

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

interface CreatePeriodFormProps {
  institutionId: string;
  onCreated(): void;
}

export function CreatePeriodForm({ institutionId, onCreated }: CreatePeriodFormProps) {
  const { admin, errors } = useDictionary();
  const text = admin.groups;
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const create = useCallback(
    (body: { name: string; startDate: string; endDate: string }) =>
      apiClient.request<AcademicPeriod>("/periods", {
        method: "POST",
        body,
        headers: forInstitution(institutionId),
      }),
    [institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(create);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit({ name, startDate, endDate })) {
      setName("");
      setStartDate("");
      setEndDate("");
      onCreated();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4" aria-label={text.newPeriod}>
      <h3 className="font-semibold">{text.newPeriod}</h3>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.periodName}
        required
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label={text.startDate}
        type="date"
        required
        value={startDate}
        onChange={(event) => setStartDate(event.target.value)}
      />
      <TextField
        label={text.endDate}
        type="date"
        required
        value={endDate}
        onChange={(event) => setEndDate(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {admin.common.create}
      </Button>
    </form>
  );
}

interface CreateGroupFormProps {
  institutionId: string;
  pensums: Pensum[];
  periods: AcademicPeriod[];
  onCreated(group: Group): void;
}

export function CreateGroupForm({ institutionId, pensums, periods, onCreated }: CreateGroupFormProps) {
  const { admin, errors } = useDictionary();
  const text = admin.groups;
  const [name, setName] = useState("");
  const [level, setLevel] = useState("1");
  const [capacity, setCapacity] = useState("");
  const [pensumId, setPensumId] = useState("");
  const [periodId, setPeriodId] = useState("");
  // Fall back to the first choice, so each select and the request always agree
  const chosenPensum = pensums.some((pensum) => pensum.id === pensumId) ? pensumId : pensums[0]?.id;
  const chosenPeriod = periods.some((period) => period.id === periodId) ? periodId : periods[0]?.id;
  const create = useCallback(
    (body: object) =>
      apiClient.request<Group>("/groups", {
        method: "POST",
        body,
        headers: forInstitution(institutionId),
      }),
    [institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(create);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const group = await submit({
      name,
      level: Number(level),
      capacity: capacity === "" ? undefined : Number(capacity),
      pensumId: chosenPensum,
      periodId: chosenPeriod,
    });
    if (group) {
      setName("");
      setCapacity("");
      onCreated(group);
    }
  }

  if (pensums.length === 0 || periods.length === 0) {
    return <p className="text-sm text-muted">{text.needsSetup}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4" aria-label={text.newTitle}>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.name}
        required
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <SelectField
        label={text.pensum}
        value={chosenPensum}
        onChange={(event) => setPensumId(event.target.value)}
        options={pensums.map((pensum) => ({
          value: pensum.id,
          label: `${pensum.code} v${pensum.version} · ${pensum.name}`,
        }))}
      />
      <SelectField
        label={text.period}
        value={chosenPeriod}
        onChange={(event) => setPeriodId(event.target.value)}
        options={periods.map((period) => ({ value: period.id, label: period.name }))}
      />
      <TextField
        label={text.level}
        type="number"
        required
        min={1}
        max={20}
        value={level}
        onChange={(event) => setLevel(event.target.value)}
      />
      <TextField
        label={text.capacity}
        type="number"
        min={1}
        max={1000}
        placeholder={text.noCapacity}
        value={capacity}
        onChange={(event) => setCapacity(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {admin.common.create}
      </Button>
    </form>
  );
}

interface GroupEditorProps {
  group: Group;
  /** Every member of the institution; only active Teachers and Students are offered. */
  members: Member[];
  onChanged(): void;
}

const isActive = (member: Member) => member.isActive && member.status === "ACTIVE";

/** The group's subjects, each with a select to choose which Teacher gives it. */
export function GroupCoursesEditor({ group, members, onChanged }: GroupEditorProps) {
  const { admin, errors } = useDictionary();
  const text = admin.groups;
  const teachers = members.filter((member) => member.role === "TEACHER" && isActive(member));
  const assign = useCallback(
    (subjectId: string, teacherMembershipId: string | null) =>
      apiClient.request<Group>(`/groups/${group.id}/courses/${subjectId}`, {
        method: "PUT",
        body: { teacherMembershipId },
        headers: forInstitution(group.institutionId),
      }),
    [group.id, group.institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(assign);

  async function handleChange(subjectId: string, value: string) {
    if (await submit(subjectId, value === "" ? null : value)) {
      onChanged();
    }
  }

  const columns: Array<Column<GroupCourse>> = [
    { header: text.subject, cell: (row) => `${row.code} · ${row.name}` },
    { header: text.weeklyHours, cell: (row) => row.weeklyHours },
    {
      header: text.teacher,
      cell: (row) => (
        <select
          aria-label={format(text.teacherFor, { subject: row.name })}
          className="h-9 rounded-lg border border-line bg-surface px-2 text-sm"
          value={row.teacher?.membershipId ?? ""}
          disabled={isSubmitting}
          onChange={(event) => handleChange(row.subjectId, event.target.value)}
        >
          <option value="">{text.unassigned}</option>
          {teachers.map((teacher) => (
            <option key={teacher.membershipId} value={teacher.membershipId}>
              {fullName(teacher)}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ErrorNotice message={errorMessage(errors, error)} />
      <DataTable
        caption={format(text.coursesTitle, { name: group.name })}
        columns={columns}
        rows={group.courses}
        getKey={(row) => row.subjectId}
        emptyText={text.noCourses}
      />
    </div>
  );
}

/** The students enrolled in the group, with the form to enroll another active Student. */
export function GroupStudentsEditor({ group, members, onChanged }: GroupEditorProps) {
  const { admin, errors } = useDictionary();
  const text = admin.groups;
  const available = members.filter(
    (member) =>
      member.role === "STUDENT" &&
      isActive(member) &&
      !group.students.some((student) => student.membershipId === member.membershipId),
  );
  const [studentId, setStudentId] = useState("");
  const chosenId = available.some((member) => member.membershipId === studentId)
    ? studentId
    : (available[0]?.membershipId ?? "");
  const enroll = useCallback(
    (membershipId: string) =>
      apiClient.request<Group>(`/groups/${group.id}/students`, {
        method: "POST",
        body: { membershipId },
        headers: forInstitution(group.institutionId),
      }),
    [group.id, group.institutionId],
  );
  const unenroll = useCallback(
    (membershipId: string) =>
      apiClient.request<Group>(`/groups/${group.id}/students/${membershipId}`, {
        method: "DELETE",
        headers: forInstitution(group.institutionId),
      }),
    [group.id, group.institutionId],
  );
  const enrolling = useSubmit(enroll);
  const removing = useSubmit(unenroll);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await enrolling.submit(chosenId)) {
      onChanged();
    }
  }

  async function handleRemove(membershipId: string) {
    if (await removing.submit(membershipId)) {
      onChanged();
    }
  }

  const columns: Array<Column<Group["students"][number]>> = [
    { header: text.student, cell: (row) => fullName(row) },
    { header: admin.members.email, cell: (row) => row.email },
    {
      header: admin.common.actions,
      cell: (row) => (
        <Button
          size="sm"
          variant="danger"
          disabled={removing.isSubmitting}
          onClick={() => handleRemove(row.membershipId)}
          aria-label={`${text.remove}: ${fullName(row)}`}
        >
          {text.remove}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ErrorNotice message={errorMessage(errors, removing.error)} />
      <DataTable
        caption={format(text.studentsTitle, { name: group.name })}
        columns={columns}
        rows={group.students}
        getKey={(row) => row.membershipId}
        emptyText={text.noStudents}
      />
      {available.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-md flex-col gap-4"
          aria-label={text.enrollTitle}
        >
          <h3 className="font-semibold">{text.enrollTitle}</h3>
          <ErrorNotice message={errorMessage(errors, enrolling.error)} />
          <SelectField
            label={text.student}
            value={chosenId}
            onChange={(event) => setStudentId(event.target.value)}
            options={available.map((member) => ({
              value: member.membershipId,
              label: `${fullName(member)} · ${member.email}`,
            }))}
          />
          <Button type="submit" isLoading={enrolling.isSubmitting}>
            {text.enroll}
          </Button>
        </form>
      )}
    </div>
  );
}
