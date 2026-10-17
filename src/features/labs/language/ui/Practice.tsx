"use client";

import { ArrowRightIcon, LightbulbIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useId, useState } from "react";
import {
  checkPractice,
  ExercisePrompt,
  fetchPracticeSet,
  VerdictNote,
  type LanguageLabKey,
  type MarkedAnswer,
} from "@/entities/lab";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice } from "@/shared/ui";

/**
 * Practice with the platform's bank, one exercise at a time. The backend marks
 * each answer and keeps nothing; it says whether an answer is right, never what the answer is.
 */
export function Practice({ labKey, institutionId }: { labKey: LanguageLabKey; institutionId: string }) {
  const { labs, errors, common } = useDictionary();
  const text = labs.language;
  const answerId = useId();
  const load = useCallback(() => fetchPracticeSet(institutionId, labKey), [institutionId, labKey]);
  const set = useResource(load);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [marked, setMarked] = useState<MarkedAnswer | null>(null);
  const [score, setScore] = useState({ right: 0, tried: 0 });
  const check = useSubmit(checkPractice);
  const questions = set.data ?? [];
  const question = questions.length > 0 ? questions[index % questions.length] : null;

  async function submit() {
    if (!question || !answer.trim()) {
      return;
    }
    const result = await check.submit(institutionId, labKey, [{ exerciseId: question.id, answer }]);
    const verdict = result?.[0];
    if (verdict) {
      setMarked(verdict);
      setScore((current) => ({
        right: current.right + (verdict.verdict === "CORRECT" ? 1 : 0),
        tried: current.tried + 1,
      }));
    }
  }

  function next() {
    setIndex((current) => current + 1);
    setAnswer("");
    setMarked(null);
  }

  if (set.isLoading && !set.data) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  if (set.error) {
    return <ErrorNotice message={errorMessage(errors, set.error)} />;
  }
  if (!question) {
    return <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{text.noPractice}</p>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (marked) {
            next();
          } else {
            void submit();
          }
        }}
        className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
      >
        <p className="text-sm font-medium text-muted">
          {format(text.counter, { number: String((index % questions.length) + 1), total: String(questions.length) })}
        </p>
        <p className="text-sm text-muted">{labKey === "completions" ? text.completeTheSentence : text.whichWord}</p>
        <ExercisePrompt prompt={question.prompt} size="lg" />
        {question.hint && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LightbulbIcon aria-hidden weight="duotone" className="size-4 text-sun" />
            {question.hint}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={answerId} className="text-sm font-medium">
            {text.yourAnswer}
          </label>
          <input
            id={answerId}
            value={answer}
            readOnly={marked !== null}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setAnswer(event.target.value)}
            className="h-12 rounded-xl border border-line bg-surface px-3 text-lg focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
          />
        </div>
        <div aria-live="polite" className="min-h-6">
          {marked && <VerdictNote verdict={marked.verdict} />}
        </div>
        <ErrorNotice message={errorMessage(errors, check.error)} />
        <div className="flex flex-wrap gap-2">
          {marked ? (
            <Button type="submit" size="sm">
              {text.next}
              <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
            </Button>
          ) : (
            <>
              <Button type="submit" size="sm" isLoading={check.isSubmitting} disabled={!answer.trim()}>
                {text.check}
              </Button>
              <Button size="sm" variant="secondary" onClick={next}>
                {text.skip}
              </Button>
            </>
          )}
        </div>
      </form>
      <dl aria-label={text.score} className="flex flex-col gap-2 self-start rounded-2xl border border-line bg-surface p-4">
        <dt className="text-xs text-muted">{text.score}</dt>
        <dd className="font-display text-3xl font-semibold tabular-nums">
          {format(text.scoreValue, { right: String(score.right), tried: String(score.tried) })}
        </dd>
        <dd className="text-xs text-muted">{text.practiceNote}</dd>
      </dl>
    </div>
  );
}
