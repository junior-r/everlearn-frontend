"use client";

import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr";
import { Fragment, useCallback, useId, useMemo, useState } from "react";
import {
  formatNumber,
  MAX_FEEDBACK_LENGTH,
  parseScore,
  saveGrades,
  type Gradebook,
  type GradeEntry,
} from "@/entities/evaluation";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useSubmit } from "@/shared/lib/use-submit";
import { Avatar, Button, ErrorNotice } from "@/shared/ui";
import { cellKey, pendingChanges, type Drafts } from "./lib/changes";

interface GradebookTableProps {
  institutionId: string;
  gradebook: Gradebook;
  /** Scores were stored, so averages are out of date. */
  onSaved(): void;
}

/**
 * The gradebook of a course: one row per enrolled Student, one column per
 * published evaluation. The Teacher types scores and saves them together.
 */
export function GradebookTable({ institutionId, gradebook, onSaved }: GradebookTableProps) {
  const { evaluations, errors } = useDictionary();
  const text = evaluations.gradebook;
  const locale = useLocale();
  const [drafts, setDrafts] = useState<Drafts>({});
  const [feedback, setFeedback] = useState<Drafts>({});
  /** The cell whose comment is being written, shown in a row under its Student. */
  const [commenting, setCommenting] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const feedbackId = useId();
  const published = useMemo(
    () => gradebook.evaluations.filter((evaluation) => evaluation.isPublished),
    [gradebook.evaluations],
  );
  const changes = useMemo(
    () => pendingChanges(published, gradebook.students, drafts, feedback),
    [published, gradebook.students, drafts, feedback],
  );
  const save = useCallback(
    async (byEvaluation: Map<string, GradeEntry[]>) => {
      // One evaluation at a time, so a refused batch names a single evaluation's problem
      for (const [evaluationId, entries] of byEvaluation) {
        await saveGrades(institutionId, evaluationId, entries);
      }
      return true;
    },
    [institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(save);
  const number = (value: number) => formatNumber(value, locale);

  async function handleSave() {
    setJustSaved(false);
    const saved = await submit(changes.byEvaluation);
    if (saved) {
      setDrafts({});
      setFeedback({});
      setCommenting(null);
      setJustSaved(true);
    }
    // Also after a failure: the evaluations saved before it are already stored
    onSaved();
  }

  function handleType(key: string, value: string) {
    setJustSaved(false);
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  function handleComment(key: string, value: string) {
    setJustSaved(false);
    setFeedback((current) => ({ ...current, [key]: value }));
  }

  if (published.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted">
        {text.noEvaluations}
      </p>
    );
  }
  if (gradebook.students.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted">
        {text.noStudents}
      </p>
    );
  }

  const hasInvalid = changes.invalid.size > 0;
  return (
    <div className="flex flex-col gap-3">
      <ErrorNotice message={hasInvalid ? text.invalid : errorMessage(errors, error)} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            {format(text.caption, { subject: gradebook.subject.name, group: gradebook.groupName })}
          </caption>
          <thead className="border-b border-line bg-surface-muted text-xs text-muted">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-muted px-4 py-3 font-medium">
                {text.student}
              </th>
              {published.map((evaluation) => (
                <th key={evaluation.id} scope="col" className="min-w-32 px-3 py-3 font-medium">
                  <span className="block text-sm font-semibold text-foreground">{evaluation.title}</span>
                  {format(text.columnHint, {
                    weight: number(evaluation.weight),
                    maxScore: number(evaluation.maxScore),
                  })}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-medium">
                {text.average}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {gradebook.students.map((student) => {
              const name = `${student.firstName} ${student.lastName}`;
              const commented = published.find(
                (evaluation) => cellKey(evaluation.id, student.enrollmentId) === commenting,
              );
              return (
                <Fragment key={student.enrollmentId}>
                <tr>
                  <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-medium">
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <Avatar name={name} />
                      {name}
                    </span>
                  </th>
                  {published.map((evaluation) => {
                    const key = cellKey(evaluation.id, student.enrollmentId);
                    const stored = student.grades.find((grade) => grade.evaluationId === evaluation.id);
                    const isInvalid = changes.invalid.has(key);
                    const typed = drafts[key];
                    const hasScore =
                      typed === undefined
                        ? stored !== undefined
                        : parseScore(typed, evaluation.maxScore).kind === "valid";
                    const hasFeedback = Boolean((feedback[key] ?? stored?.feedback ?? "").trim());
                    return (
                      <td key={evaluation.id} className="px-3 py-2.5">
                        <span className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={format(text.scoreFor, { student: name, evaluation: evaluation.title })}
                          aria-invalid={isInvalid}
                          value={drafts[key] ?? (stored ? number(stored.score) : "")}
                          onChange={(event) => handleType(key, event.target.value)}
                          className={cn(
                            "h-9 w-20 rounded-xl border bg-surface px-2.5 font-mono text-sm tabular-nums transition-colors focus-visible:outline-4 focus-visible:outline-brand/25",
                            isInvalid
                              ? "border-danger bg-danger-surface text-danger"
                              : "border-line hover:border-brand/50 focus-visible:border-brand",
                          )}
                        />
                        <button
                          type="button"
                          disabled={!hasScore}
                          aria-label={format(text.feedbackFor, { student: name, evaluation: evaluation.title })}
                          aria-expanded={commenting === key}
                          aria-controls={commenting === key ? feedbackId : undefined}
                          title={hasScore ? undefined : text.feedbackNeedsScore}
                          onClick={() => setCommenting(commenting === key ? null : key)}
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40",
                            hasFeedback ? "text-brand" : "text-muted",
                            "enabled:hover:bg-brand-soft enabled:hover:text-brand",
                          )}
                        >
                          <ChatTextIcon aria-hidden weight={hasFeedback ? "fill" : "regular"} className="size-5" />
                        </button>
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {student.average === null ? (
                      <span className="text-muted">{text.noAverage}</span>
                    ) : (
                      <span className="font-mono font-semibold tabular-nums">{number(student.average)}%</span>
                    )}
                  </td>
                </tr>
                {commented && commenting && (
                  <tr className="bg-surface-muted">
                    <td colSpan={published.length + 2} className="px-4 py-3">
                      <div id={feedbackId} className="flex max-w-xl flex-col gap-2">
                        <label htmlFor={`${feedbackId}-text`} className="text-sm font-medium">
                          {format(text.feedbackFor, { student: name, evaluation: commented.title })}
                        </label>
                        <textarea
                          id={`${feedbackId}-text`}
                          autoFocus
                          rows={3}
                          maxLength={MAX_FEEDBACK_LENGTH}
                          placeholder={text.feedbackPlaceholder}
                          value={
                            feedback[commenting] ??
                            student.grades.find((grade) => grade.evaluationId === commented.id)?.feedback ??
                            ""
                          }
                          onChange={(event) => handleComment(commenting, event.target.value)}
                          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm transition-colors hover:border-brand/50 placeholder:text-muted focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <Button size="sm" variant="secondary" onClick={() => setCommenting(null)}>
                            {text.closeFeedback}
                          </Button>
                          <p className="text-xs text-muted">{text.feedbackHint}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          isLoading={isSubmitting}
          disabled={changes.count === 0 || hasInvalid}
          onClick={handleSave}
        >
          {text.save}
        </Button>
        <p role="status" className="text-sm text-muted">
          {changes.count === 1 && text.unsavedOne}
          {changes.count > 1 && format(text.unsavedMany, { count: String(changes.count) })}
          {changes.count === 0 && justSaved && text.saved}
        </p>
      </div>
    </div>
  );
}
