"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { Pensum, PensumSubject } from "@/entities/pensum";
import type { Subject } from "@/entities/subject";
import { apiClient, forInstitution } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, DataTable, ErrorNotice, SelectField, TextField, type Column } from "@/shared/ui";

interface CreatePensumFormProps {
  institutionId: string;
  onCreated(): void;
}

export function CreatePensumForm({ institutionId, onCreated }: CreatePensumFormProps) {
  const { admin, errors } = useDictionary();
  const text = admin.pensums;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1");
  const create = useCallback(
    (body: { code: string; name: string; version: number }) =>
      apiClient.request<Pensum>("/pensums", {
        method: "POST",
        body,
        headers: forInstitution(institutionId),
      }),
    [institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(create);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit({ code, name, version: Number(version) })) {
      setCode("");
      setName("");
      setVersion("1");
      onCreated();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.newTitle}>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.code}
        required
        pattern="[A-Za-z0-9][A-Za-z0-9._\-]*"
        maxLength={30}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <TextField
        label={text.name}
        required
        maxLength={150}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label={text.version}
        type="number"
        required
        min={1}
        max={999}
        value={version}
        onChange={(event) => setVersion(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {admin.common.create}
      </Button>
    </form>
  );
}

interface PensumSubjectsEditorProps {
  pensum: Pensum;
  /** Every subject of the institution, to choose from. */
  subjects: Subject[];
  onChanged(): void;
}

/** The subjects of one pensum, each at a level with its weekly hours, plus the form to place another. */
export function PensumSubjectsEditor({ pensum, subjects, onChanged }: PensumSubjectsEditorProps) {
  const { admin, errors } = useDictionary();
  const text = admin.pensums;
  const available = subjects.filter(
    (subject) => !pensum.subjects.some((placed) => placed.subjectId === subject.id),
  );
  const [subjectId, setSubjectId] = useState("");
  const [level, setLevel] = useState("1");
  const [weeklyHours, setWeeklyHours] = useState("4");
  // Falls back to the first choice, so the select and the request always agree
  const chosenId = available.some((subject) => subject.id === subjectId)
    ? subjectId
    : (available[0]?.id ?? "");

  const place = useCallback(
    (id: string, placement: { level: number; weeklyHours: number }) =>
      apiClient.request<Pensum>(`/pensums/${pensum.id}/subjects/${id}`, {
        method: "PUT",
        body: placement,
        headers: forInstitution(pensum.institutionId),
      }),
    [pensum.id, pensum.institutionId],
  );
  const remove = useCallback(
    async (id: string) => {
      await apiClient.request<void>(`/pensums/${pensum.id}/subjects/${id}`, {
        method: "DELETE",
        headers: forInstitution(pensum.institutionId),
      });
      return true;
    },
    [pensum.id, pensum.institutionId],
  );
  const placing = useSubmit(place);
  const removing = useSubmit(remove);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await placing.submit(chosenId, { level: Number(level), weeklyHours: Number(weeklyHours) })) {
      onChanged();
    }
  }

  async function handleRemove(id: string) {
    if (await removing.submit(id)) {
      onChanged();
    }
  }

  const columns: Array<Column<PensumSubject>> = [
    { header: text.level, cell: (row) => row.level },
    { header: text.code, cell: (row) => <code>{row.code}</code> },
    { header: text.subject, cell: (row) => row.name },
    { header: text.weeklyHours, cell: (row) => row.weeklyHours },
    {
      header: admin.common.actions,
      cell: (row) => (
        <Button
          size="sm"
          variant="danger"
          disabled={removing.isSubmitting}
          onClick={() => handleRemove(row.subjectId)}
          aria-label={`${text.remove}: ${row.name}`}
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
        caption={text.subjectCount}
        columns={columns}
        rows={pensum.subjects}
        getKey={(row) => row.subjectId}
        emptyText={text.noSubjects}
      />
      {available.length === 0 ? (
        subjects.length === 0 && <p className="text-sm text-muted">{text.noAvailableSubjects}</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-md flex-col gap-4"
          aria-label={text.addTitle}
        >
          <h3 className="font-semibold">{text.addTitle}</h3>
          <ErrorNotice message={errorMessage(errors, placing.error)} />
          <SelectField
            label={text.subject}
            value={chosenId}
            onChange={(event) => setSubjectId(event.target.value)}
            options={available.map((subject) => ({
              value: subject.id,
              label: `${subject.code} · ${subject.name}`,
            }))}
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
            label={text.weeklyHours}
            type="number"
            required
            min={1}
            max={60}
            value={weeklyHours}
            onChange={(event) => setWeeklyHours(event.target.value)}
          />
          <Button type="submit" isLoading={placing.isSubmitting}>
            {text.add}
          </Button>
        </form>
      )}
    </div>
  );
}
