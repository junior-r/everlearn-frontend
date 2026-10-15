"use client";

import { EyeIcon, EyeSlashIcon, LightbulbIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback } from "react";
import {
  ExercisePrompt,
  fetchTeacherExercises,
  isFields,
  MAX_ANSWER_LENGTH,
  MAX_ANSWERS,
  MAX_HINT_LENGTH,
  MAX_PROMPT_LENGTH,
  textOf,
  type LabModule,
  type LabViewProps,
  type LanguageExercise,
  type LanguageLabKey,
} from "@/entities/lab";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { Badge, Button, ErrorNotice } from "@/shared/ui";
import { Practice } from "./Practice";

/** The exercise on show in a class; its answers travel only once the Teacher reveals them. */
export interface ShownExercise {
  id: string;
  prompt: string;
  hint: string | null;
}

export interface LanguageState {
  exercise: ShownExercise | null;
  revealed: string[] | null;
}

function ShownPrompt({ labKey, state }: { labKey: LanguageLabKey; state: LanguageState }) {
  const { labs } = useDictionary();
  const text = labs.language;
  if (!state.exercise) {
    return <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{text.nothingShown}</p>;
  }
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <p className="text-sm text-muted">{labKey === "completions" ? text.completeTheSentence : text.whichWord}</p>
      <ExercisePrompt
        prompt={state.exercise.prompt}
        filled={labKey === "completions" ? state.revealed?.[0] : undefined}
        size="lg"
      />
      {state.exercise.hint && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <LightbulbIcon aria-hidden weight="duotone" className="size-4 text-sun" />
          {state.exercise.hint}
        </p>
      )}
      <div aria-live="polite">
        {state.revealed && (
          <p className="rounded-xl bg-mint-soft px-4 py-3 text-mint-ink">
            <span className="text-sm">{text.answerIs}</span>{" "}
            <span className="text-lg font-semibold">{state.revealed.join(" / ")}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** The Teacher's side in a class: pick an exercise to show, then reveal its answer when the class has tried. */
function Presenter({ labKey, state, onChange, institutionId }: LabViewProps<LanguageState> & { labKey: LanguageLabKey }) {
  const { labs, errors, common } = useDictionary();
  const text = labs.language;
  const load = useCallback(() => fetchTeacherExercises(institutionId, labKey), [institutionId, labKey]);
  const exercises = useResource(load);
  const all = exercises.data ? [...exercises.data.own, ...exercises.data.builtIn] : [];
  const shown = all.find((exercise) => exercise.id === state.exercise?.id);
  const show = (exercise: LanguageExercise) =>
    onChange({ exercise: { id: exercise.id, prompt: exercise.prompt, hint: exercise.hint }, revealed: null });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-3">
        <ShownPrompt labKey={labKey} state={state} />
        {state.exercise && (
          <div className="flex flex-wrap gap-2">
            {state.revealed ? (
              <Button size="sm" variant="secondary" onClick={() => onChange({ ...state, revealed: null })}>
                <EyeSlashIcon aria-hidden className="size-4" />
                {text.hideAnswer}
              </Button>
            ) : (
              <Button size="sm" disabled={!shown} onClick={() => shown && onChange({ ...state, revealed: shown.answers })}>
                <EyeIcon aria-hidden className="size-4" />
                {text.revealAnswer}
              </Button>
            )}
          </div>
        )}
      </div>
      <section aria-label={text.pickExercise} className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{text.pickExercise}</h3>
        <ErrorNotice message={errorMessage(errors, exercises.error)} />
        {exercises.isLoading && !exercises.data && <p className="text-sm text-muted">{common.loading}</p>}
        <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto pr-1">
          {all.map((exercise) => {
            const isShown = exercise.id === state.exercise?.id;
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  aria-pressed={isShown}
                  onClick={() => show(exercise)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                    isShown ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/50",
                  )}
                >
                  <span className="line-clamp-2">{exercise.prompt}</span>
                  {exercise.authorId && <Badge tone="grape">{text.mine}</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function languageView(labKey: LanguageLabKey) {
  return function LanguageView(props: LabViewProps<LanguageState>) {
    switch (props.mode) {
      case "standalone":
        return <Practice labKey={labKey} institutionId={props.institutionId} />;
      case "presenter":
        return <Presenter {...props} labKey={labKey} />;
      case "follower":
        return <ShownPrompt labKey={labKey} state={props.state} />;
    }
  };
}

function parseLanguageState(value: unknown): LanguageState {
  const fields = isFields(value) ? value : {};
  const exercise = isFields(fields.exercise) ? fields.exercise : null;
  const shown =
    exercise && typeof exercise.id === "string" && typeof exercise.prompt === "string"
      ? {
          id: exercise.id.slice(0, 64),
          prompt: textOf(exercise.prompt, MAX_PROMPT_LENGTH),
          hint: typeof exercise.hint === "string" ? textOf(exercise.hint, MAX_HINT_LENGTH) : null,
        }
      : null;
  const revealed = Array.isArray(fields.revealed)
    ? fields.revealed.slice(0, MAX_ANSWERS).map((answer) => textOf(answer, MAX_ANSWER_LENGTH))
    : null;
  return { exercise: shown, revealed: shown ? revealed : null };
}

const languageLab = (key: LanguageLabKey): LabModule<LanguageState> => ({
  key,
  initial: () => ({ exercise: null, revealed: null }),
  parse: parseLanguageState,
  View: languageView(key),
});

/** Sentences with a word left out, to complete. */
export const completionsLab = languageLab("completions");
/** A definition, to find the word it defines. */
export const definitionsLab = languageLab("definitions");
