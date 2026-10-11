"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { Group } from "@/entities/group";
import {
  DAYS,
  fetchGroupSchedule,
  findInCell,
  formatTime,
  HOURS,
  parseTime,
  startsInCell,
  type DayOfWeek,
  type ScheduledSlot,
} from "@/entities/schedule";
import { apiClient, forInstitution } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { cn } from "@/shared/lib/cn";
import { TONES, toneBorder, toneSoft, type Tone } from "@/shared/lib/tone";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, SelectField, TextField } from "@/shared/ui";

interface NewClass {
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startMinute: number;
  endMinute: number;
  room?: string;
}

interface ClassFormProps {
  group: Group;
  /** The cell that was clicked, used to prefill the form. */
  start: { day: DayOfWeek; hour: number };
  onScheduled(): void;
  onCancel(): void;
}

/**
 * The form opened from a free cell. A conflict reported by the backend (group
 * busy, teacher busy, teacher unavailable) is shown here, and the form stays
 * open so the admin can pick another time.
 */
function ClassForm({ group, start, onScheduled, onCancel }: ClassFormProps) {
  const { admin, days, errors } = useDictionary();
  const text = admin.schedule;
  // Only subjects with a teacher can be scheduled: the rules are about the teacher's time
  const courses = group.courses.filter((course) => course.teacher !== null);
  const [subjectId, setSubjectId] = useState(courses[0]?.subjectId ?? "");
  const [day, setDay] = useState<DayOfWeek>(start.day);
  const [startTime, setStartTime] = useState(formatTime(start.hour * 60));
  const [endTime, setEndTime] = useState(formatTime((start.hour + 1) * 60));
  const [room, setRoom] = useState("");
  const [invalidTime, setInvalidTime] = useState(false);
  const schedule = useCallback(
    (body: NewClass) =>
      apiClient.request<ScheduledSlot[]>(`/groups/${group.id}/schedule`, {
        method: "POST",
        body,
        headers: forInstitution(group.institutionId),
      }),
    [group.id, group.institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(schedule);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startMinute = parseTime(startTime);
    const endMinute = parseTime(endTime);
    if (startMinute === null || endMinute === null || endMinute <= startMinute) {
      setInvalidTime(true);
      return;
    }
    setInvalidTime(false);
    if (await submit({ subjectId, dayOfWeek: day, startMinute, endMinute, room: room || undefined })) {
      onScheduled();
    }
  }

  if (courses.length === 0) {
    return <p className="text-sm text-muted">{text.noCourses}</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md animate-rise flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
      aria-label={text.newTitle}
    >
      <h3 className="font-semibold">{text.newTitle}</h3>
      <ErrorNotice message={errorMessage(errors, invalidTime ? "INVALID_TIME_RANGE" : error)} />
      <SelectField
        label={text.course}
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        options={courses.map((course) => ({
          value: course.subjectId,
          label: `${course.name} · ${course.teacher?.firstName} ${course.teacher?.lastName}`,
        }))}
      />
      <SelectField
        label={text.day}
        value={day}
        onChange={(event) => setDay(event.target.value as DayOfWeek)}
        options={DAYS.map((option) => ({ value: option, label: days[option] }))}
      />
      <TextField
        label={text.start}
        type="time"
        required
        value={startTime}
        onChange={(event) => setStartTime(event.target.value)}
      />
      <TextField
        label={text.end}
        type="time"
        required
        value={endTime}
        onChange={(event) => setEndTime(event.target.value)}
      />
      <TextField
        label={text.room}
        maxLength={60}
        value={room}
        onChange={(event) => setRoom(event.target.value)}
      />
      <div className="flex gap-3">
        <Button type="submit" size="sm" isLoading={isSubmitting}>
          {text.add}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          {text.cancel}
        </Button>
      </div>
    </form>
  );
}

/** The weekly timetable of one group: click a free hour to schedule a class, or remove an existing one. */
export function ScheduleBuilder({ group }: { group: Group }) {
  const { admin, common, days, errors } = useDictionary();
  const text = admin.schedule;
  const load = useCallback(
    () => fetchGroupSchedule(group.institutionId, group.id),
    [group.institutionId, group.id],
  );
  const schedule = useResource(load);
  const [picked, setPicked] = useState<{ day: DayOfWeek; hour: number } | null>(null);
  const remove = useCallback(
    (slotId: string) =>
      apiClient.request<ScheduledSlot[]>(`/groups/${group.id}/schedule/${slotId}`, {
        method: "DELETE",
        headers: forInstitution(group.institutionId),
      }),
    [group.id, group.institutionId],
  );
  const removing = useSubmit(remove);

  if (schedule.data === null) {
    return schedule.error ? (
      <ErrorNotice message={errorMessage(errors, schedule.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  const slots = schedule.data;
  // By position in the group, so its subjects get different colours for as long as there are colours
  const toneOf = (subjectId: string): Tone =>
    TONES[Math.max(group.courses.findIndex((course) => course.subjectId === subjectId), 0) % TONES.length];

  async function handleRemove(slotId: string) {
    if (await removing.submit(slotId)) {
      schedule.reload();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{text.hint}</p>
      <ErrorNotice message={errorMessage(errors, removing.error)} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-2 shadow-card">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">{format(text.caption, { name: group.name })}</caption>
          <thead className="text-muted">
            <tr>
              <th scope="col" className="px-2 py-2 font-medium">
                {text.hour}
              </th>
              {DAYS.map((day) => (
                <th key={day} scope="col" className="px-2 py-2 font-medium">
                  {days[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <th scope="row" className="px-2 py-1 font-mono font-medium text-muted">
                  {formatTime(hour * 60)}
                </th>
                {DAYS.map((day) => {
                  const slot = findInCell(slots, day, hour);
                  const label = `${days[day]} ${formatTime(hour * 60)}`;
                  if (!slot) {
                    return (
                      <td key={day} className="p-0.5">
                        <button
                          type="button"
                          aria-label={`${label}, ${text.free}`}
                          onClick={() => setPicked({ day, hour })}
                          className="pattern-hatch block h-12 w-full rounded-lg bg-surface-muted transition duration-150 hover:bg-brand-soft hover:outline-2 hover:outline-brand/40 active:scale-95 focus-visible:outline-2 focus-visible:outline-brand"
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={day} className="p-0.5 align-top">
                      <div
                        className={cn(
                          "flex h-12 flex-col justify-center border-l-4 px-2 text-left",
                          // A class longer than an hour reads as one block down the column
                          startsInCell(slot, hour) ? "rounded-t-lg" : "-mt-1 h-[3.25rem]",
                          slot.endMinute <= (hour + 1) * 60 && "rounded-b-lg",
                          toneSoft[toneOf(slot.subject.id)],
                          toneBorder[toneOf(slot.subject.id)],
                        )}
                      >
                        {startsInCell(slot, hour) && (
                          <>
                            <span className="truncate font-semibold">
                              {slot.subject.code} {formatTime(slot.startMinute)}–{formatTime(slot.endMinute)}
                            </span>
                            <button
                              type="button"
                              className="w-fit underline underline-offset-2 hover:no-underline"
                              disabled={removing.isSubmitting}
                              onClick={() => handleRemove(slot.id)}
                              aria-label={`${text.remove}: ${slot.subject.name}, ${days[day]} ${formatTime(slot.startMinute)}`}
                            >
                              {text.remove}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {picked && (
        <ClassForm
          // A new cell is a new form, prefilled from that cell
          key={`${picked.day}:${picked.hour}`}
          group={group}
          start={picked}
          onCancel={() => setPicked(null)}
          onScheduled={() => {
            setPicked(null);
            schedule.reload();
          }}
        />
      )}
    </div>
  );
}
