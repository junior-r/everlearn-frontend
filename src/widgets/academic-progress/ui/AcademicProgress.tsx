"use client";

import { useCallback, useId } from "react";
import {
  evaluationTypeTone,
  fetchMyProgress,
  formatDateTime,
  formatNumber,
  type CourseProgress,
} from "@/entities/evaluation";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { toneFor, toneSolid } from "@/shared/lib/tone";
import { useResource } from "@/shared/lib/use-resource";
import { Badge, ErrorNotice } from "@/shared/ui";

function CourseCard({ course }: { course: CourseProgress }) {
  const { evaluations } = useDictionary();
  const text = evaluations.progress;
  const locale = useLocale();
  const headingId = useId();
  const number = (value: number) => formatNumber(value, locale);
  const due = (dueAt: string | null) => (dueAt ? formatDateTime(dueAt, locale) : text.noDue);
  const teacher =course.teacher && `${course.teacher.firstName} ${course.teacher.lastName}`;

  return (
    <li>
      <article
        aria-labelledby={headingId}
        className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
      >
        <div className="flex flex-wrap items-center gap-4 p-5">
          {/* The subject's colour, the same one wherever the subject appears */}
          <span aria-hidden className={cn("h-12 w-1.5 rounded-full", toneSolid[toneFor(course.subject.code)])} />
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-lg font-semibold">
              {course.subject.name}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {format(text.group, { name: course.groupName })}
              {teacher && ` · ${format(text.teacher, { name: teacher })}`}
            </p>
          </div>
          <dl className="text-right">
            <dt className="text-xs font-medium text-muted">{text.average}</dt>
            <dd className="font-display text-3xl font-semibold tracking-tight tabular-nums">
              {course.average === null ? (
                <span className="text-base font-medium text-muted">{text.noAverage}</span>
              ) : (
                `${number(course.average)}%`
              )}
            </dd>
            <dd className="text-xs text-muted">
              {format(text.gradedWeight, { weight: number(course.gradedWeight) })}
            </dd>
          </dl>
        </div>
        {course.evaluations.length === 0 ? (
          <p className="border-t border-line px-5 py-4 text-sm text-muted">{text.noEvaluations}</p>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{format(text.caption, { subject: course.subject.name })}</caption>
              <thead className="bg-surface-muted text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    {text.columns.evaluation}
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    {text.columns.weight}
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
                    {text.columns.due}
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    {text.columns.score}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {course.evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <th scope="row" className="py-3 pr-2 pl-5 font-medium sm:px-5">
                      <span className="flex flex-wrap items-center gap-2">
                        {evaluation.title}
                        <Badge tone={evaluationTypeTone[evaluation.type]}>{evaluations.types[evaluation.type]}</Badge>
                      </span>
                      {evaluation.grade?.feedback && (
                        <span className="mt-1 block text-xs font-normal text-muted">
                          {format(text.feedback, { feedback: evaluation.grade.feedback })}
                        </span>
                      )}
                      {/* A phone has no room for the due date column, so the date moves under the title */}
                      <span className="mt-1 block text-xs font-normal text-muted sm:hidden">{due(evaluation.dueAt)}</span>
                    </th>
                    <td className="px-3 py-3 whitespace-nowrap tabular-nums">{number(evaluation.weight)}%</td>
                    <td className="hidden px-3 py-3 whitespace-nowrap text-muted sm:table-cell">
                      {due(evaluation.dueAt)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {evaluation.grade ? (
                        <span className="font-mono font-semibold tabular-nums">
                          {format(text.score, {
                            score: number(evaluation.grade.score),
                            maxScore: number(evaluation.maxScore),
                          })}
                        </span>
                      ) : (
                        <Badge tone="neutral">{text.pending}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </li>
  );
}

/** A Student's courses: the published evaluations of each, the grades received and the current average. */
export function AcademicProgress({ institutionId }: { institutionId: string }) {
  const { common, errors, evaluations } = useDictionary();
  const load = useCallback(() => fetchMyProgress(institutionId), [institutionId]);
  const courses = useResource(load);

  return (
    <div className="flex flex-col gap-4">
      <ErrorNotice message={errorMessage(errors, courses.error)} />
      {courses.data === null && !courses.error && <p className="text-sm text-muted">{common.loading}</p>}
      {courses.data?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted">
          {evaluations.progress.empty}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {courses.data?.map((course) => (
          <CourseCard key={`${course.groupId}:${course.subject.id}`} course={course} />
        ))}
      </ul>
    </div>
  );
}
