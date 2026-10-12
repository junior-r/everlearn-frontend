"use client";

import { useCallback, useId, useState, type FormEvent } from "react";
import {
  ATTENDANCE_STATUSES,
  fetchSessionAttendance,
  recordHeldClass,
  saveSessionAttendance,
  type AttendanceStatus,
} from "@/entities/class-session";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Badge, Button, ErrorNotice, TextField } from "@/shared/ui";

const MS_PER_MINUTE = 60_000;

/** How a mark looks once chosen; the tone says what it means, as everywhere else. */
const CHOSEN: Record<AttendanceStatus, string> = {
  PRESENT: "has-checked:border-mint has-checked:bg-mint-soft",
  LATE: "has-checked:border-sun has-checked:bg-sun-soft",
  ABSENT: "has-checked:border-coral has-checked:bg-coral-soft",
  EXCUSED: "has-checked:border-sky has-checked:bg-sky-soft",
};

/** A moment as a `datetime-local` field wants it: local time, to the minute. */
function toLocalInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE).toISOString().slice(0, 16);
}

interface RecordHeldClassFormProps {
  institutionId: string;
  groupId: string;
  subjectId: string;
  onRecorded(sessionId: string): void;
}

/** Records a class the Teacher gave without video, so its attendance can be taken. */
export function RecordHeldClassForm({ institutionId, groupId, subjectId, onRecorded }: RecordHeldClassFormProps) {
  const { classroom, errors } = useDictionary();
  const text = classroom.attendance;
  // A class can only be recorded once it was held, so the field stops at the moment the page opened
  const [latest] = useState(() => toLocalInput(new Date()));
  const [heldAt, setHeldAt] = useState(latest);
  const record = useCallback(
    (startsAt: string) => recordHeldClass(institutionId, groupId, subjectId, startsAt),
    [institutionId, groupId, subjectId],
  );
  const { submit, isSubmitting, error } = useSubmit(record);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recorded = await submit(new Date(heldAt).toISOString());
    if (recorded) {
      onRecorded(recorded.sessionId);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={text.heldTitle} className="flex max-w-md flex-col gap-4">
      <p className="text-sm text-muted">{text.heldHint}</p>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.heldAt}
        type="datetime-local"
        required
        max={latest}
        value={heldAt}
        onChange={(event) => setHeldAt(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {text.record}
      </Button>
    </form>
  );
}

interface AttendanceSheetProps {
  institutionId: string;
  sessionId: string;
  /** Names the form: the class the sheet belongs to. */
  title: string;
  onSaved(): void;
}

/**
 * The roll of one class: every enrolled Student with the mark they have, to
 * give or correct. Only what changed is sent, so a mark taken automatically
 * stays automatic until the Teacher decides otherwise.
 */
export function AttendanceSheet({ institutionId, sessionId, title, onSaved }: AttendanceSheetProps) {
  const { classroom, common, errors } = useDictionary();
  const text = classroom.attendance;
  const groupId = useId();
  const load = useCallback(() => fetchSessionAttendance(institutionId, sessionId), [institutionId, sessionId]);
  const sheet = useResource(load);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [justSaved, setJustSaved] = useState(false);
  const save = useCallback(
    (marks: Parameters<typeof saveSessionAttendance>[2]) => saveSessionAttendance(institutionId, sessionId, marks),
    [institutionId, sessionId],
  );
  const { submit, isSubmitting, error } = useSubmit(save);

  if (sheet.data === null) {
    return sheet.error ? (
      <ErrorNotice message={errorMessage(errors, sheet.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  const students = sheet.data;
  if (students.length === 0) {
    return <p className="text-sm text-muted">{text.noStudents}</p>;
  }
  const changed = students.flatMap(({ enrollmentId, status }) => {
    const chosen = draft[enrollmentId];
    return chosen && chosen !== status ? [{ enrollmentId, status: chosen }] : [];
  });
  const unmarked = students.filter(({ enrollmentId, status }) => !status && !draft[enrollmentId]);

  function choose(enrollmentId: string, status: AttendanceStatus) {
    setDraft((current) => ({ ...current, [enrollmentId]: status }));
    setJustSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit(changed)) {
      setDraft({});
      setJustSaved(true);
      sheet.reload();
      onSaved();
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={title} className="flex flex-col gap-4">
      <ErrorNotice message={errorMessage(errors, error)} />
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface shadow-card">
        {students.map((student) => {
          const nameId = `${groupId}-${student.enrollmentId}`;
          const current = draft[student.enrollmentId] ?? student.status;
          return (
            <li key={student.enrollmentId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span id={nameId}>
                  {student.firstName} {student.lastName}
                </span>
                {student.status && !student.takenByHand && <Badge tone="neutral">{text.automatic}</Badge>}
              </p>
              <div role="radiogroup" aria-labelledby={nameId} className="flex flex-wrap gap-2">
                {ATTENDANCE_STATUSES.map((status) => (
                  <label
                    key={status}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-sm transition-colors hover:border-brand/50 has-focus-visible:outline-2 has-focus-visible:outline-brand",
                      CHOSEN[status],
                    )}
                  >
                    <input
                      type="radio"
                      name={student.enrollmentId}
                      value={status}
                      checked={current === status}
                      onChange={() => choose(student.enrollmentId, status)}
                      className="accent-brand"
                    />
                    {text.statuses[status]}
                  </label>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {justSaved && (
        <p role="status" className="w-fit rounded-xl bg-mint-soft px-3 py-2 text-sm text-mint-ink">
          {text.saved}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" className="h-11" isLoading={isSubmitting} disabled={changed.length === 0}>
          {text.save}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-11"
          disabled={unmarked.length === 0}
          onClick={() => unmarked.forEach(({ enrollmentId }) => choose(enrollmentId, "PRESENT"))}
        >
          {text.markRest}
        </Button>
      </div>
    </form>
  );
}
