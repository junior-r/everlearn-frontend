"use client";

import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useId, useState, type FormEvent } from "react";
import {
  archiveExercise,
  BLANK,
  createExercise,
  ExercisePrompt,
  fetchTeacherExercises,
  MAX_ANSWERS,
  MAX_HINT_LENGTH,
  MAX_PROMPT_LENGTH,
  updateExercise,
  type LanguageExercise,
  type LanguageLabKey,
} from "@/entities/lab";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, TextField } from "@/shared/ui";

/** Accepted answers as typed: one per comma, blanks dropped. */
const splitAnswers = (text: string) =>
  text
    .split(",")
    .map((answer) => answer.trim())
    .filter(Boolean)
    .slice(0, MAX_ANSWERS);

interface ExerciseFormProps {
  institutionId: string;
  labKey: LanguageLabKey;
  editing: LanguageExercise | null;
  onSaved(): void;
  onCancel(): void;
}

function ExerciseForm({ institutionId, labKey, editing, onSaved, onCancel }: ExerciseFormProps) {
  const { labs, errors } = useDictionary();
  const text = labs.exercises;
  const promptId = useId();
  const [prompt, setPrompt] = useState(editing?.prompt ?? "");
  const [answers, setAnswers] = useState(editing?.answers.join(", ") ?? "");
  const [hint, setHint] = useState(editing?.hint ?? "");
  const editingId = editing?.id ?? null;
  const save = useCallback(
    (input: { prompt: string; answers: string[]; hint: string | null }) =>
      editingId ? updateExercise(institutionId, editingId, input) : createExercise(institutionId, labKey, input),
    [editingId, institutionId, labKey],
  );
  const saving = useSubmit(save);
  const isCompletion = labKey === "completions";
  const hasBlank = prompt.split(BLANK).length - 1 === 1;
  const isValid = prompt.trim() !== "" && splitAnswers(answers).length > 0 && (isCompletion ? hasBlank : !prompt.includes(BLANK));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const saved = await saving.submit({ prompt, answers: splitAnswers(answers), hint: hint.trim() || null });
    if (saved) {
      setPrompt("");
      setAnswers("");
      setHint("");
      onSaved();
    }
  }

  return (
    <form
      aria-label={editing ? text.editTitle : text.newTitle}
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={promptId} className="text-sm font-medium">
          {isCompletion ? text.sentence : text.definition}
        </label>
        <textarea
          id={promptId}
          value={prompt}
          rows={2}
          required
          maxLength={MAX_PROMPT_LENGTH}
          onChange={(event) => setPrompt(event.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
        />
        <p className="text-xs text-muted">{isCompletion ? text.sentenceHelp : text.definitionHelp}</p>
        {isCompletion && prompt.trim() !== "" && !hasBlank && <p className="text-xs text-danger">{text.needsBlank}</p>}
        {isCompletion && !prompt.includes(BLANK) && (
          <div>
            <Button size="sm" variant="secondary" onClick={() => setPrompt((current) => `${current}${BLANK}`)}>
              {text.insertBlank}
            </Button>
          </div>
        )}
      </div>
      <TextField
        label={text.answers}
        value={answers}
        required
        onChange={(event) => setAnswers(event.target.value)}
      />
      <p className="-mt-2 text-xs text-muted">{format(text.answersHelp, { max: String(MAX_ANSWERS) })}</p>
      <TextField label={text.hint} value={hint} maxLength={MAX_HINT_LENGTH} onChange={(event) => setHint(event.target.value)} />
      {prompt.trim() !== "" && (
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="mb-1 text-xs font-semibold text-muted">{text.preview}</p>
          <ExercisePrompt prompt={prompt} />
        </div>
      )}
      <ErrorNotice message={errorMessage(errors, saving.error)} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" isLoading={saving.isSubmitting} disabled={!isValid}>
          {editing ? text.save : text.create}
        </Button>
        {editing && (
          <Button size="sm" variant="secondary" onClick={onCancel}>
            {labs.common.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}

/** The exercises a Teacher wrote for a language lab: written, rewritten and removed here. */
export function ManageExercises({ institutionId, labKey }: { institutionId: string; labKey: LanguageLabKey }) {
  const { labs, errors, common } = useDictionary();
  const text = labs.exercises;
  const load = useCallback(() => fetchTeacherExercises(institutionId, labKey), [institutionId, labKey]);
  const exercises = useResource(load);
  const [editing, setEditing] = useState<LanguageExercise | null>(null);
  const archive = useSubmit(archiveExercise);
  const own = exercises.data?.own ?? [];

  async function remove(exercise: LanguageExercise) {
    if ((await archive.submit(institutionId, exercise.id)) !== null) {
      if (editing?.id === exercise.id) {
        setEditing(null);
      }
      exercises.reload();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="flex flex-col gap-3">
        <ErrorNotice message={errorMessage(errors, exercises.error ?? archive.error)} />
        {exercises.isLoading && !exercises.data && <p className="text-sm text-muted">{common.loading}</p>}
        {exercises.data && own.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
            {format(text.empty, { count: String(exercises.data.builtIn.length) })}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {own.map((exercise) => (
            <li key={exercise.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="min-w-0 flex-1">
                <ExercisePrompt prompt={exercise.prompt} />
                <p className="mt-1 text-sm text-mint-ink">{exercise.answers.join(" / ")}</p>
                {exercise.hint && <p className="text-xs text-muted">{exercise.hint}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={format(text.editNamed, { prompt: exercise.prompt })}
                  onClick={() => setEditing(exercise)}
                  className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <PencilSimpleIcon aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={format(text.removeNamed, { prompt: exercise.prompt })}
                  onClick={() => void remove(exercise)}
                  className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <TrashIcon aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="self-start rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h3 className="mb-4 font-semibold">{editing ? text.editTitle : text.newTitle}</h3>
        <ExerciseForm
          key={editing?.id ?? "new"}
          institutionId={institutionId}
          labKey={labKey}
          editing={editing}
          onSaved={() => {
            setEditing(null);
            exercises.reload();
          }}
          onCancel={() => setEditing(null)}
        />
      </div>
    </div>
  );
}
