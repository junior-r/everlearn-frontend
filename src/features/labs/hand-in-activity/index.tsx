"use client";

import { ArrowRightIcon, CheckCircleIcon, ClockCountdownIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useCallback, useId, useState, type FormEvent } from "react";
import { formatDateTime } from "@/entities/evaluation";
import {
  categoryOf,
  ExercisePrompt,
  fetchMyLabAssignments,
  labActivityPath,
  LabIcon,
  MAX_ANSWER_LENGTH,
  MAX_NOTE_LENGTH,
  submitLabAttempt,
  type LabAttempt,
  VerdictNote,
  type MyAssignmentDetail,
} from "@/entities/lab";
import { errorMessage, format, localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Badge, Button, Dialog, ErrorNotice } from "@/shared/ui";

/** The signed-in Student's lab activities, the soonest due first, each with whether it was handed in. */
export function MyActivities({ institutionId }: { institutionId: string }) {
  const { labs, errors, common } = useDictionary();
  const locale = useLocale();
  const text = labs.activities;
  const load = useCallback(() => fetchMyLabAssignments(institutionId), [institutionId]);
  const activities = useResource(load);

  if (activities.error) {
    return <ErrorNotice message={errorMessage(errors, activities.error)} />;
  }
  if (!activities.data) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  if (activities.data.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{text.empty}</p>;
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {activities.data.map((activity) => (
        <li key={activity.id}>
          <Link
            href={localizedPath(locale, labActivityPath(activity.id))}
            className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition duration-150 hover:border-brand/60 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand"
          >
            <LabIcon labKey={activity.labKey} category={categoryOf(activity.labKey)} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="font-semibold break-words">{activity.title}</span>
              <span className="text-xs text-muted">
                {format(text.from, { lab: labs.names[activity.labKey], subject: activity.course.subjectName })}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {activity.attempt ? (
                  <Badge tone="mint">
                    {activity.attempt.total !== null
                      ? format(text.scored, {
                          score: String(activity.attempt.score ?? 0),
                          total: String(activity.attempt.total),
                        })
                      : text.handedIn}
                  </Badge>
                ) : (
                  <Badge tone="sun">{text.pending}</Badge>
                )}
                {activity.late && <Badge tone="coral">{text.late}</Badge>}
                <span className="flex items-center gap-1 text-xs text-muted">
                  <ClockCountdownIcon aria-hidden className="size-3.5" />
                  {activity.dueAt ? format(text.dueOn, { date: formatDateTime(activity.dueAt, locale) }) : text.noDue}
                </span>
              </span>
            </span>
            <ArrowRightIcon
              aria-hidden
              weight="bold"
              className="mt-1 size-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A score once handed in; one attempt only, so it is final. */
function AttemptSummary({ attempt, late }: { attempt: LabAttempt; late: boolean }) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.activities;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl bg-mint-soft p-4 text-mint-ink">
      <CheckCircleIcon aria-hidden weight="fill" className="size-6" />
      <p className="font-medium">
        {format(text.handedInOn, { date: formatDateTime(attempt.submittedAt, locale) })}
        {attempt.total !== null &&
          ` ${format(text.scoreSentence, { score: String(attempt.score ?? 0), total: String(attempt.total) })}`}
      </p>
      {late && <Badge tone="sun">{text.late}</Badge>}
    </div>
  );
}

const isLate = (detail: MyAssignmentDetail, attempt: LabAttempt) =>
  detail.assignment.dueAt !== null && attempt.submittedAt > detail.assignment.dueAt;

interface HandInProps {
  institutionId: string;
  detail: MyAssignmentDetail;
  onHandedIn(): void;
}

/** Asks before handing in: there is a single attempt. */
function ConfirmHandIn({ isOpen, isSubmitting, onConfirm, onClose }: {
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm(): void;
  onClose(): void;
}) {
  const { labs } = useDictionary();
  const text = labs.activities;
  return (
    <Dialog isOpen={isOpen} title={text.confirmTitle} description={text.confirmBody} onClose={onClose}>
      <Button size="sm" variant="secondary" onClick={onClose}>
        {text.keepWorking}
      </Button>
      <Button size="sm" isLoading={isSubmitting} onClick={onConfirm}>
        {text.handIn}
      </Button>
    </Dialog>
  );
}

/** The questions of a language activity to answer, and once handed in, each verdict with the accepted answers. */
export function AnswerSheet({ institutionId, detail, onHandedIn }: HandInProps) {
  const { labs, errors } = useDictionary();
  const text = labs.activities;
  const formId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const hand = useSubmit(submitLabAttempt);
  const { attempt, solutions } = detail;
  const isCompletion = detail.assignment.labKey === "completions";

  async function submit() {
    const handed = await hand.submit(institutionId, detail.assignment.id, {
      answers: detail.questions.map((question) => ({ exerciseId: question.id, answer: answers[question.id] ?? "" })),
      note: null,
    });
    setIsConfirming(false);
    if (handed) {
      onHandedIn();
    }
  }

  return (
    <form
      aria-label={text.answerSheet}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        setIsConfirming(true);
      }}
      className="flex flex-col gap-4"
    >
      {attempt && <AttemptSummary attempt={attempt} late={isLate(detail, attempt)} />}
      <ol className="flex flex-col gap-3">
        {detail.questions.map((question, index) => {
          const marked = attempt?.answers.find((answer) => answer.exerciseId === question.id);
          const accepted = solutions?.find((solution) => solution.exerciseId === question.id)?.answers ?? [];
          const inputId = `${formId}-${question.id}`;
          return (
            <li key={question.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
              <p className="text-xs font-semibold text-muted">
                {format(text.questionNumber, { number: String(index + 1), total: String(detail.questions.length) })}
              </p>
              <ExercisePrompt prompt={question.prompt} />
              {question.hint && <p className="text-sm text-muted">{question.hint}</p>}
              {attempt ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    {text.yourAnswer} <strong>{marked?.answer || text.blankAnswer}</strong>
                  </span>
                  {marked && <VerdictNote verdict={marked.verdict} />}
                  {marked?.verdict !== "CORRECT" && accepted.length > 0 && (
                    <span className="text-muted">{format(text.accepted, { answers: accepted.join(" / ") })}</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={inputId} className="text-sm font-medium">
                    {isCompletion ? text.missingWord : text.word}
                  </label>
                  <input
                    id={inputId}
                    value={answers[question.id] ?? ""}
                    maxLength={MAX_ANSWER_LENGTH * 2}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                    className="h-11 max-w-md rounded-xl border border-line bg-surface px-3 focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <ErrorNotice message={errorMessage(errors, hand.error)} />
      {!attempt && (
        <div>
          <Button type="submit" size="sm">
            {text.handIn}
          </Button>
        </div>
      )}
      <ConfirmHandIn
        isOpen={isConfirming}
        isSubmitting={hand.isSubmitting}
        onConfirm={() => void submit()}
        onClose={() => setIsConfirming(false)}
      />
    </form>
  );
}

/** Hands in a simulation activity, with a note of what the Student found. */
export function HandInNote({ institutionId, detail, onHandedIn }: HandInProps) {
  const { labs, errors } = useDictionary();
  const text = labs.activities;
  const noteId = useId();
  const [note, setNote] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const hand = useSubmit(submitLabAttempt);
  const { attempt } = detail;

  async function submit() {
    const handed = await hand.submit(institutionId, detail.assignment.id, { answers: [], note: note.trim() || null });
    setIsConfirming(false);
    if (handed) {
      onHandedIn();
    }
  }

  if (attempt) {
    return (
      <div className="flex flex-col gap-3">
        <AttemptSummary attempt={attempt} late={isLate(detail, attempt)} />
        {attempt.note && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-semibold text-muted">{text.yourNote}</p>
            <p className="mt-1 text-sm whitespace-pre-line">{attempt.note}</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <form
      aria-label={text.handInTitle}
      onSubmit={(event) => {
        event.preventDefault();
        setIsConfirming(true);
      }}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
    >
      <label htmlFor={noteId} className="text-sm font-medium">
        {text.note}
      </label>
      <textarea
        id={noteId}
        value={note}
        rows={4}
        maxLength={MAX_NOTE_LENGTH}
        onChange={(event) => setNote(event.target.value)}
        className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
      />
      <p className="text-xs text-muted">{text.noteHelp}</p>
      <ErrorNotice message={errorMessage(errors, hand.error)} />
      <div>
        <Button type="submit" size="sm">
          {text.handIn}
        </Button>
      </div>
      <ConfirmHandIn
        isOpen={isConfirming}
        isSubmitting={hand.isSubmitting}
        onConfirm={() => void submit()}
        onClose={() => setIsConfirming(false)}
      />
    </form>
  );
}

