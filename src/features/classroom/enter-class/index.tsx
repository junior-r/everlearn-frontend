"use client";

import { ArrowRightIcon, BroadcastIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useCallback, useEffect, useId } from "react";
import { fetchMyCourses, startClassSession, type ClassroomCourse } from "@/entities/class-session";
import { errorMessage, format, localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Badge, Button, buttonClass, ErrorNotice } from "@/shared/ui";

// A Student sees the class appear without reloading once their Teacher opens it
const REFRESH_MS = 15_000;

const classPath = (sessionId: string) => `/class/${sessionId}`;

/**
 * The subjects the member teaches or attends in the institution. A Teacher
 * starts the class of a subject; everyone enters a class that is open.
 */
export function MyClasses({ institutionId }: { institutionId: string }) {
  const { classroom, common, errors } = useDictionary();
  const text = classroom.myClasses;
  const locale = useLocale();
  const router = useLocalizedRouter();
  const headingId = useId();
  const load = useCallback(() => fetchMyCourses(institutionId), [institutionId]);
  const courses = useResource(load);
  const { reload } = courses;
  const start = useCallback(
    async (course: ClassroomCourse) => {
      const { sessionId } = await startClassSession(institutionId, course.groupId, course.subject.id);
      router.push(classPath(sessionId));
      return sessionId;
    },
    [institutionId, router],
  );
  const { submit, isSubmitting, error } = useSubmit(start);

  useEffect(() => {
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <section aria-labelledby={headingId} className="mt-6">
      <h2 id={headingId} className="text-lg font-semibold">
        {text.title}
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        <ErrorNotice message={errorMessage(errors, error ?? courses.error)} />
        {courses.data === null && !courses.error && <p className="text-sm text-muted">{common.loading}</p>}
        {courses.data?.length === 0 && <p className="text-sm text-muted">{text.empty}</p>}
        <ul className="flex flex-col gap-2">
          {courses.data?.map((course) => {
            const subject = course.subject.name;
            const teacher = course.teacher && `${course.teacher.firstName} ${course.teacher.lastName}`;
            return (
              <li
                key={`${course.groupId}:${course.subject.id}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {subject}
                    {course.openSessionId && (
                      <Badge tone="coral">
                        <BroadcastIcon aria-hidden weight="bold" className="mr-1 size-3.5" />
                        {text.live}
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {format(text.group, { name: course.groupName })}
                    {course.role === "STUDENT" && teacher && ` · ${format(text.teacher, { name: teacher })}`}
                  </p>
                </div>
                {course.openSessionId ? (
                  <Link
                    href={localizedPath(locale, classPath(course.openSessionId))}
                    aria-label={format(text.enterFor, { subject })}
                    className={buttonClass("primary", "sm")}
                  >
                    {text.enter}
                    <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
                  </Link>
                ) : course.role === "TEACHER" ? (
                  <Button
                    size="sm"
                    isLoading={isSubmitting}
                    aria-label={format(text.startFor, { subject })}
                    onClick={() => submit(course)}
                  >
                    {text.start}
                  </Button>
                ) : (
                  <Badge tone="neutral">{text.notLive}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
