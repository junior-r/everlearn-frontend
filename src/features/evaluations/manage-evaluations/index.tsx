"use client";

import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState, type FormEvent } from "react";
import {
  createEvaluation,
  deleteEvaluation,
  EVALUATION_TYPES,
  evaluationTypeTone,
  formatDateTime,
  formatNumber,
  fromDateTimeLocal,
  MAX_TITLE_LENGTH,
  MAX_TOTAL_WEIGHT,
  publishEvaluation,
  toDateTimeLocal,
  updateEvaluation,
  type Evaluation,
  type EvaluationInput,
  type EvaluationType,
  type Gradebook,
} from "@/entities/evaluation";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Badge, Button, ErrorNotice, SelectField, TextField } from "@/shared/ui";

interface EvaluationFormProps {
  institutionId: string;
  groupId: string;
  subjectId: string;
  /** The evaluation being changed, or null to create one. */
  editing: Evaluation | null;
  /** Grades were given against the maximum score, so it is fixed once any exist. */
  lockMaxScore: boolean;
  /** What is left of the 100% for a new evaluation, as the backend counts it; null while editing. */
  availableWeight: number | null;
  onSaved(): void;
  onCancel(): void;
}

function EvaluationForm({
  institutionId,
  groupId,
  subjectId,
  editing,
  lockMaxScore,
  availableWeight,
  onSaved,
  onCancel,
}: EvaluationFormProps) {
  const { evaluations, errors } = useDictionary();
  const locale = useLocale();
  const text = evaluations.manage;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [type, setType] = useState<EvaluationType>(editing?.type ?? "EXAM");
  const [weight, setWeight] = useState(editing ? String(editing.weight) : "");
  const [maxScore, setMaxScore] = useState(editing ? String(editing.maxScore) : "");
  const [dueAt, setDueAt] = useState(toDateTimeLocal(editing?.dueAt ?? null));
  const editingId = editing?.id ?? null;
  const save = useCallback(
    (input: EvaluationInput) =>
      editingId
        ? updateEvaluation(institutionId, editingId, input)
        : createEvaluation(institutionId, groupId, subjectId, input),
    [institutionId, groupId, subjectId, editingId],
  );
  const { submit, isSubmitting, error } = useSubmit(save);
  const heading = editing ? text.editing : text.new;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await submit({
      title,
      type,
      weight: Number(weight),
      maxScore: Number(maxScore),
      dueAt: fromDateTimeLocal(dueAt),
    });
    if (saved) {
      onSaved();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={heading}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
    >
      <h3 className="font-semibold">{heading}</h3>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.fields.title}
        required
        maxLength={MAX_TITLE_LENGTH}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <SelectField
        label={text.fields.type}
        value={type}
        onChange={(event) => setType(event.target.value as EvaluationType)}
        options={EVALUATION_TYPES.map((value) => ({ value, label: evaluations.types[value] }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={text.fields.weight}
          type="number"
          inputMode="decimal"
          required
          min={0.01}
          max={availableWeight ?? MAX_TOTAL_WEIGHT}
          step={0.01}
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />
        <TextField
          label={text.fields.maxScore}
          type="number"
          inputMode="decimal"
          required
          min={0.01}
          max={9999.99}
          step={0.01}
          disabled={lockMaxScore}
          value={maxScore}
          onChange={(event) => setMaxScore(event.target.value)}
        />
      </div>
      {availableWeight !== null && (
        <p className="-mt-2 text-xs text-muted">
          {format(text.weightLeft, { left: formatNumber(availableWeight, locale) })}
        </p>
      )}
      <TextField
        label={text.fields.dueAt}
        type="datetime-local"
        value={dueAt}
        onChange={(event) => setDueAt(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {editing ? text.save : text.create}
      </Button>
      {editing && (
        <Button variant="secondary" onClick={onCancel}>
          {text.cancel}
        </Button>
      )}
    </form>
  );
}

interface ManageEvaluationsProps {
  institutionId: string;
  gradebook: Gradebook;
  /** Something was created, changed or published, so the gradebook is out of date. */
  onChanged(): void;
}

/**
 * The evaluations of a course for its Teacher: what each is worth, which are
 * still drafts, and the form to add or change one.
 */
export function ManageEvaluations({ institutionId, gradebook, onChanged }: ManageEvaluationsProps) {
  const { evaluations, errors } = useDictionary();
  const text = evaluations.manage;
  const locale = useLocale();
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const publish = useCallback((id: string) => publishEvaluation(institutionId, id), [institutionId]);
  const { submit, isSubmitting, error } = useSubmit(publish);
  /** The draft the Teacher asked to delete and must still confirm. */
  const [deleting, setDeleting] = useState<Evaluation | null>(null);
  const remove = useCallback((id: string) => deleteEvaluation(institutionId, id).then(() => true), [institutionId]);
  const removal = useSubmit(remove);
  const number = (value: number) => formatNumber(value, locale);
  const graded = new Set(gradebook.students.flatMap((student) => student.grades.map((grade) => grade.evaluationId)));

  async function handlePublish(evaluation: Evaluation) {
    if (await submit(evaluation.id)) {
      onChanged();
    }
  }

  async function handleDelete(evaluation: Evaluation) {
    const removed = await removal.submit(evaluation.id);
    setDeleting(null);
    if (removed) {
      // The form must not keep editing an evaluation that is gone
      setEditing((current) => (current?.id === evaluation.id ? null : current));
      onChanged();
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl bg-surface-muted p-4">
          <p className="text-sm font-medium">{format(text.weightUsed, { used: number(gradebook.totalWeight) })}</p>
          <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-mint transition-[width] duration-300"
              style={{ width: `${Math.min(gradebook.totalWeight, MAX_TOTAL_WEIGHT)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">{text.draftHint}</p>
        </div>
        <ErrorNotice message={errorMessage(errors, error ?? removal.error)} />
        {deleting && (
          <div
            role="alertdialog"
            aria-label={format(text.deleteFor, { title: deleting.title })}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/40 bg-danger-surface px-4 py-3"
          >
            <p className="min-w-0 flex-1 text-sm">{format(text.confirmDelete, { title: deleting.title })}</p>
            <Button size="sm" variant="danger" isLoading={removal.isSubmitting} onClick={() => handleDelete(deleting)}>
              {text.confirmDeleteYes}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDeleting(null)}>
              {text.cancel}
            </Button>
          </div>
        )}
        {gradebook.evaluations.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted">{text.empty}</p>
        )}
        <ul aria-label={text.title} className="flex flex-col gap-2">
          {gradebook.evaluations.map((evaluation) => (
            <li
              key={evaluation.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {evaluation.title}
                  <Badge tone={evaluationTypeTone[evaluation.type]}>{evaluations.types[evaluation.type]}</Badge>
                  <Badge tone={evaluation.isPublished ? "mint" : "neutral"}>
                    {evaluation.isPublished ? text.published : text.draft}
                  </Badge>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {format(text.weight, { weight: number(evaluation.weight) })}
                  {" · "}
                  {format(text.maxScore, { maxScore: number(evaluation.maxScore) })}
                  {" · "}
                  {evaluation.dueAt
                    ? format(text.due, { date: formatDateTime(evaluation.dueAt, locale) })
                    : text.noDue}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={format(text.editFor, { title: evaluation.title })}
                  onClick={() => setEditing(evaluation)}
                >
                  <PencilSimpleIcon aria-hidden weight="bold" className="size-4" />
                  {text.edit}
                </Button>
                {!evaluation.isPublished && (
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={format(text.deleteFor, { title: evaluation.title })}
                    onClick={() => setDeleting(evaluation)}
                  >
                    <TrashIcon aria-hidden weight="bold" className="size-4" />
                    {text.delete}
                  </Button>
                )}
                {!evaluation.isPublished && (
                  <Button
                    size="sm"
                    isLoading={isSubmitting}
                    aria-label={format(text.publishFor, { title: evaluation.title })}
                    onClick={() => handlePublish(evaluation)}
                  >
                    {text.publish}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {!editing && gradebook.availableWeight <= 0 ? (
        // Nothing new fits: say so, and how to make room, instead of a form the backend would refuse
        <section
          aria-label={text.new}
          className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-card"
        >
          <h3 className="font-semibold">{text.new}</h3>
          <p className="text-sm text-muted">{text.full}</p>
        </section>
      ) : (
        <EvaluationForm
          // A new form per evaluation and after each save, so its fields start from the right values
          key={`${editing?.id ?? "new"}:${savedCount}`}
          institutionId={institutionId}
          groupId={gradebook.groupId}
          subjectId={gradebook.subject.id}
          editing={editing}
          lockMaxScore={editing !== null && graded.has(editing.id)}
          availableWeight={editing ? null : gradebook.availableWeight}
          onSaved={() => {
            setEditing(null);
            setSavedCount((count) => count + 1);
            onChanged();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
