"use client";

import { useCallback, useId, useMemo, useState, type FormEvent } from "react";
import { fromDateTimeLocal } from "@/entities/evaluation";
import {
  createLabAssignment,
  fetchAvailableLabs,
  fetchTeacherExercises,
  isLanguageLab,
  LabIcon,
  MAX_ASSIGNMENT_EXERCISES,
  MAX_ASSIGNMENT_TITLE_LENGTH,
  MAX_INSTRUCTIONS_LENGTH,
  type LabDefinition,
  type LabKey,
  type LanguageLabKey,
} from "@/entities/lab";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Badge, Button, ErrorNotice, TextField } from "@/shared/ui";

interface ExercisePickerProps {
  institutionId: string;
  labKey: LanguageLabKey;
  chosen: string[];
  onChange(chosen: string[]): void;
}

/** The bank's exercises and the Teacher's own, to tick the ones the activity holds, in the order ticked. */
function ExercisePicker({ institutionId, labKey, chosen, onChange }: ExercisePickerProps) {
  const { labs, errors, common } = useDictionary();
  const text = labs.assign;
  const load = useCallback(() => fetchTeacherExercises(institutionId, labKey), [institutionId, labKey]);
  const exercises = useResource(load);
  const all = exercises.data ? [...exercises.data.own, ...exercises.data.builtIn] : [];
  const isFull = chosen.length >= MAX_ASSIGNMENT_EXERCISES;
  const toggle = (id: string) =>
    onChange(chosen.includes(id) ? chosen.filter((current) => current !== id) : [...chosen, id]);

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">
        {format(text.exercises, { count: String(chosen.length), max: String(MAX_ASSIGNMENT_EXERCISES) })}
      </legend>
      <ErrorNotice message={errorMessage(errors, exercises.error)} />
      {exercises.isLoading && !exercises.data && <p className="text-sm text-muted">{common.loading}</p>}
      {exercises.data && all.length === 0 && <p className="text-sm text-muted">{text.noExercises}</p>}
      <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-xl border border-line p-2">
        {all.map((exercise) => {
          const isChosen = chosen.includes(exercise.id);
          return (
            <li key={exercise.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted",
                  isChosen && "bg-brand-soft",
                )}
              >
                <input
                  type="checkbox"
                  checked={isChosen}
                  disabled={!isChosen && isFull}
                  onChange={() => toggle(exercise.id)}
                  className="mt-0.5 size-4 accent-brand"
                />
                <span className="min-w-0 flex-1">
                  <span className="block">{exercise.prompt}</span>
                  <span className="text-xs text-muted">{exercise.answers.join(" / ")}</span>
                </span>
                {exercise.authorId && <Badge tone="grape">{labs.language.mine}</Badge>}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

interface AssignLabFormProps {
  institutionId: string;
  groupId: string;
  subjectId: string;
  onCreated(): void;
}

/** Gives the group an activity in one of the labs the institution has on. */
export function AssignLabForm({ institutionId, groupId, subjectId, onCreated }: AssignLabFormProps) {
  const { labs, errors, common } = useDictionary();
  const text = labs.assign;
  const labsId = useId();
  const loadLabs = useCallback(() => fetchAvailableLabs(institutionId), [institutionId]);
  const available = useResource(loadLabs);
  const [labKey, setLabKey] = useState<LabKey | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const create = useSubmit(createLabAssignment);
  const chosen = useMemo(
    () => available.data?.find((lab) => lab.key === labKey) ?? null,
    [available.data, labKey],
  );
  const needsExercises = chosen !== null && isLanguageLab(chosen.key) && exerciseIds.length === 0;

  function choose(lab: LabDefinition) {
    setLabKey(lab.key);
    setExerciseIds([]);
    if (!title.trim()) {
      setTitle(labs.names[lab.key]);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!chosen) {
      return;
    }
    const created = await create.submit(institutionId, groupId, subjectId, {
      labKey: chosen.key,
      title: title.trim(),
      instructions: instructions.trim() || null,
      dueAt: fromDateTimeLocal(dueAt),
      exerciseIds: isLanguageLab(chosen.key) ? exerciseIds : [],
    });
    if (created) {
      setLabKey(null);
      setTitle("");
      setInstructions("");
      setDueAt("");
      setExerciseIds([]);
      onCreated();
    }
  }

  return (
    <form aria-label={text.title} onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend id={labsId} className="mb-1 text-sm font-medium">
          {text.lab}
        </legend>
        <ErrorNotice message={errorMessage(errors, available.error)} />
        {available.isLoading && !available.data && <p className="text-sm text-muted">{common.loading}</p>}
        {available.data?.length === 0 && <p className="text-sm text-muted">{labs.catalog.none}</p>}
        <div role="radiogroup" aria-labelledby={labsId} className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
          {available.data?.map((lab) => {
            const isChosen = lab.key === labKey;
            return (
              <button
                key={lab.key}
                type="button"
                role="radio"
                aria-checked={isChosen}
                onClick={() => choose(lab)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                  isChosen ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/50",
                )}
              >
                <LabIcon labKey={lab.key} category={lab.category} size="sm" />
                {labs.names[lab.key]}
              </button>
            );
          })}
        </div>
      </fieldset>
      {chosen && (
        <>
          <TextField
            label={text.activityTitle}
            value={title}
            required
            maxLength={MAX_ASSIGNMENT_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${labsId}-instructions`} className="text-sm font-medium">
              {text.instructions}
            </label>
            <textarea
              id={`${labsId}-instructions`}
              value={instructions}
              rows={3}
              maxLength={MAX_INSTRUCTIONS_LENGTH}
              onChange={(event) => setInstructions(event.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
            />
            <p className="text-xs text-muted">{isLanguageLab(chosen.key) ? text.instructionsLanguage : text.instructionsLab}</p>
          </div>
          <TextField
            label={text.dueAt}
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
          {isLanguageLab(chosen.key) && (
            <ExercisePicker
              key={chosen.key}
              institutionId={institutionId}
              labKey={chosen.key}
              chosen={exerciseIds}
              onChange={setExerciseIds}
            />
          )}
          <ErrorNotice message={errorMessage(errors, create.error)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" isLoading={create.isSubmitting} disabled={needsExercises || !title.trim()}>
              {text.submit}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setLabKey(null)}>
              {labs.common.cancel}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
