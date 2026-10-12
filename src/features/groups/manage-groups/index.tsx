"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import type { AcademicPeriod, Group, GroupCourse } from "@/entities/group";
import { MemberPicker, type MemberMatch } from "@/entities/member";
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
  onChanged(): void;
}

/**
 * The group's subjects with the Teacher who gives each, and the form to assign
 * one. The Teacher is found by searching; only active Teachers are offered.
 */
export function GroupCoursesEditor({ group, onChanged }: GroupEditorProps) {
  const { admin, errors } = useDictionary();
  const text = admin.groups;
  const [subjectId, setSubjectId] = useState("");
  const [teacher, setTeacher] = useState<MemberMatch | null>(null);
  // Fall back to the first subject, so the select and the request always agree
  const chosenSubject = group.courses.find((course) => course.subjectId === subjectId) ?? group.courses[0];
  const assign = useCallback(
    (subject: string, teacherMembershipId: string | null) =>
      apiClient.request<Group>(`/groups/${group.id}/courses/${subject}`, {
        method: "PUT",
        body: { teacherMembershipId },
        headers: forInstitution(group.institutionId),
      }),
    [group.id, group.institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(assign);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosenSubject && teacher && (await submit(chosenSubject.subjectId, teacher.membershipId))) {
      setTeacher(null);
      onChanged();
    }
  }

  async function handleUnassign(subject: string) {
    if (await submit(subject, null)) {
      onChanged();
    }
  }

  const columns: Array<Column<GroupCourse>> = [
    { header: text.subject, cell: (row) => `${row.code} · ${row.name}` },
    { header: text.weeklyHours, cell: (row) => row.weeklyHours },
    {
      header: text.teacher,
      cell: (row) =>
        row.teacher ? fullName(row.teacher) : <span className="text-muted">{text.unassigned}</span>,
    },
    {
      header: admin.common.actions,
      cell: (row) =>
        row.teacher && (
          <Button
            size="sm"
            variant="danger"
            disabled={isSubmitting}
            onClick={() => handleUnassign(row.subjectId)}
            aria-label={format(text.unassignFor, { subject: row.name })}
          >
            {text.unassign}
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <DataTable
        caption={format(text.coursesTitle, { name: group.name })}
        columns={columns}
        rows={group.courses}
        getKey={(row) => row.subjectId}
        emptyText={text.noCourses}
      />
      {chosenSubject && (
        <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4" aria-label={text.assignTitle}>
          <h3 className="font-semibold">{text.assignTitle}</h3>
          <ErrorNotice message={errorMessage(errors, error)} />
          <SelectField
            label={text.subject}
            value={chosenSubject.subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            options={group.courses.map((course) => ({ value: course.subjectId, label: course.name }))}
          />
          <MemberPicker
            institutionId={group.institutionId}
            role="TEACHER"
            activeOnly
            label={text.teacher}
            value={teacher}
            onChange={setTeacher}
          />
          <Button type="submit" disabled={!teacher} isLoading={isSubmitting}>
            {text.assign}
          </Button>
        </form>
      )}
    </div>
  );
}

/** The students enrolled in the group, with the form to find and enroll another active Student. */
export function GroupStudentsEditor({ group, onChanged }: GroupEditorProps) {
  const { admin, errors } = useDictionary();
  const text = admin.groups;
  const [student, setStudent] = useState<MemberMatch | null>(null);
  const enrolledIds = useMemo(() => group.students.map((enrolled) => enrolled.membershipId), [group.students]);
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
    if (student && (await enrolling.submit(student.membershipId))) {
      setStudent(null);
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
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4" aria-label={text.enrollTitle}>
        <h3 className="font-semibold">{text.enrollTitle}</h3>
        <ErrorNotice message={errorMessage(errors, enrolling.error)} />
        <MemberPicker
          institutionId={group.institutionId}
          role="STUDENT"
          activeOnly
          exclude={enrolledIds}
          label={text.student}
          value={student}
          onChange={setStudent}
        />
        <Button type="submit" disabled={!student} isLoading={enrolling.isSubmitting}>
          {text.enroll}
        </Button>
      </form>
    </div>
  );
}
