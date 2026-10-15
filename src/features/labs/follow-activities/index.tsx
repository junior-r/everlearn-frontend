"use client";

import { ClockCountdownIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import { formatDateTime } from "@/entities/evaluation";
import {
  deleteLabAssignment,
  fetchAssignmentResults,
  categoryOf,
  isLanguageLab,
  LabIcon,
  type AssignmentSummary,
  type ResultRow,
} from "@/entities/lab";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Avatar, Badge, Button, DataTable, Dialog, ErrorNotice, type Column } from "@/shared/ui";


interface ActivityListProps {
  institutionId: string;
  activities: AssignmentSummary[];
  selectedId: string | null;
  onSelect(assignmentId: string): void;
  onDeleted(): void;
}

/** The activities of a course, each with how many Students handed it in. */
export function ActivityList({ institutionId, activities, selectedId, onSelect, onDeleted }: ActivityListProps) {
  const { labs, errors } = useDictionary();
  const locale = useLocale();
  const text = labs.follow;
  const [deleting, setDeleting] = useState<AssignmentSummary | null>(null);
  const remove = useSubmit(deleteLabAssignment);

  async function confirmDelete() {
    if (!deleting) {
      return;
    }
    const done = await remove.submit(institutionId, deleting.id);
    if (done !== null) {
      setDeleting(null);
      onDeleted();
    }
  }

  if (activities.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{text.empty}</p>;
  }
  return (
    <>
      <ErrorNotice message={errorMessage(errors, remove.error)} />
      <ul className="grid gap-3 md:grid-cols-2">
        {activities.map((activity) => {
          const isSelected = activity.id === selectedId;
          return (
            <li
              key={activity.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-card transition-colors",
                isSelected ? "border-brand" : "border-line",
              )}
            >
              <div className="flex items-start gap-3">
                <LabIcon labKey={activity.labKey} category={categoryOf(activity.labKey)} size="sm" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold break-words">{activity.title}</h3>
                  <p className="text-xs text-muted">{labs.names[activity.labKey]}</p>
                </div>
              </div>
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <div className="flex items-center gap-1.5">
                  <dt>
                    <UsersIcon aria-hidden className="size-4 text-muted" />
                    <span className="sr-only">{text.handedIn}</span>
                  </dt>
                  <dd>
                    {format(text.handedInCount, {
                      count: String(activity.submittedCount),
                      total: String(activity.studentCount),
                    })}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt>
                    <ClockCountdownIcon aria-hidden className="size-4 text-muted" />
                    <span className="sr-only">{text.due}</span>
                  </dt>
                  <dd>{activity.dueAt ? formatDateTime(activity.dueAt, locale) : text.noDue}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={isSelected ? "primary" : "secondary"}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(activity.id)}
                >
                  {text.viewResults}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  aria-label={format(text.deleteNamed, { title: activity.title })}
                  onClick={() => setDeleting(activity)}
                >
                  <TrashIcon aria-hidden className="size-4" />
                  {text.delete}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Dialog
        isOpen={deleting !== null}
        title={text.deleteTitle}
        description={format(text.deleteBody, { title: deleting?.title ?? "" })}
        onClose={() => setDeleting(null)}
      >
        <Button size="sm" variant="secondary" onClick={() => setDeleting(null)}>
          {text.cancel}
        </Button>
        <Button size="sm" variant="danger" isLoading={remove.isSubmitting} onClick={() => void confirmDelete()}>
          {text.delete}
        </Button>
      </Dialog>
    </>
  );
}

/** What each Student of the group handed in for one activity. */
export function ActivityResults({ institutionId, assignmentId }: { institutionId: string; assignmentId: string }) {
  const { labs, errors, common } = useDictionary();
  const locale = useLocale();
  const text = labs.follow;
  const load = useCallback(() => fetchAssignmentResults(institutionId, assignmentId), [institutionId, assignmentId]);
  const results = useResource(load);
  const data = results.data;
  const isScored = data !== null && isLanguageLab(data.assignment.labKey);

  const columns: Array<Column<ResultRow>> = [
    {
      header: text.student,
      cell: (row) => {
        const name = `${row.student.firstName} ${row.student.lastName}`;
        return (
          <span className="flex items-center gap-2">
            <Avatar name={name} />
            {name}
          </span>
        );
      },
    },
    {
      header: text.status,
      cell: (row) =>
        row.attempt ? (
          <span className="flex flex-wrap gap-1.5">
            <Badge tone="mint">{text.submitted}</Badge>
            {row.late && <Badge tone="sun">{text.late}</Badge>}
          </span>
        ) : (
          <Badge tone="neutral">{text.pending}</Badge>
        ),
    },
    {
      header: text.submittedAt,
      cell: (row) => (row.attempt ? formatDateTime(row.attempt.submittedAt, locale) : ""),
    },
    isScored
      ? {
          header: text.score,
          cell: (row) =>
            row.attempt && row.attempt.total !== null
              ? format(text.scoreValue, { score: String(row.attempt.score ?? 0), total: String(row.attempt.total) })
              : "",
        }
      : {
          header: text.note,
          cell: (row) => <span className="whitespace-pre-line">{row.attempt?.note ?? ""}</span>,
        },
  ];

  if (results.error) {
    return <ErrorNotice message={errorMessage(errors, results.error)} />;
  }
  if (!data) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {data.assignment.instructions && (
        <p className="max-w-[65ch] text-sm whitespace-pre-line text-muted">{data.assignment.instructions}</p>
      )}
      <DataTable
        caption={format(text.resultsOf, { title: data.assignment.title })}
        columns={columns}
        rows={data.rows}
        getKey={(row) => row.student.membershipId}
        emptyText={text.noStudents}
      />
      {isScored && data.exercises.length > 0 && (
        <details className="rounded-2xl border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">{text.answerKey}</summary>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm">
            {data.exercises.map((exercise) => (
              <li key={exercise.id}>
                <span>{exercise.prompt}</span>
                <span className="ml-2 font-semibold text-mint-ink">{exercise.answers.join(" / ")}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
