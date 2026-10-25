"use client";

import { useParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { fetchCourseSessions, lastedMinutes } from "@/entities/class-session";
import { useActiveInstitution } from "@/entities/institution";
import { AttendanceSheet, RecordHeldClassForm } from "@/features/classroom/take-attendance";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { Badge, ErrorNotice, Section } from "@/shared/ui";
import { PortalShell } from "@/widgets/portal-shell";

function CourseAttendance() {
  const params = useParams<{ groupId: string; subjectId: string }>();
  const groupId = params?.groupId ?? null;
  const subjectId = params?.subjectId ?? null;
  const institution = useActiveInstitution();
  const { classroom, common, errors } = useDictionary();
  const text = classroom.attendance;
  const locale = useLocale();
  const institutionId = institution.active?.id ?? null;
  const isTeacher = institution.roles.includes("TEACHER");
  const load = useMemo(
    () =>
      institutionId && isTeacher && groupId && subjectId
        ? () => fetchCourseSessions(institutionId, groupId, subjectId)
        : null,
    [institutionId, isTeacher, groupId, subjectId],
  );
  const course = useResource(load);
  const { data, reload } = course;
  const [chosenId, setChosenId] = useState<string | null>(null);
  // The latest class is open until another is picked: it is the one whose roll is usually due
  const chosen = data?.sessions.find((session) => session.id === chosenId) ?? data?.sessions[0];
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" });
  const count = new Intl.NumberFormat(locale);
  const minutes = new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "long" });

  return (
    <PortalShell
      title={data ? format(text.title, { subject: data.subjectName }) : text.fallbackTitle}
      subtitle={data ? format(text.subtitle, { group: data.groupName }) : ""}
      roles={["TEACHER"]}
    >
      {(activeId) => (
        <>
          <ErrorNotice message={errorMessage(errors, course.error)} />
          {!data && !course.error && <p className="text-sm text-muted">{common.loading}</p>}
          {data && groupId && subjectId && (
            <>
              <Section title={text.sessionsTitle}>
                {data.sessions.length === 0 && <p className="text-sm text-muted">{text.noSessions}</p>}
                <ul className="flex flex-wrap gap-2">
                  {data.sessions.map((session) => {
                    const date = when.format(new Date(session.startsAt));
                    const isOpen = session.status === "SCHEDULED" || session.status === "LIVE";
                    const lasted = lastedMinutes(session.startsAt, session.endedAt);
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          aria-pressed={session.id === chosen?.id}
                          aria-label={format(text.sessionFor, { date })}
                          onClick={() => setChosenId(session.id)}
                          className={cn(
                            "flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-brand/50 focus-visible:outline-2 focus-visible:outline-brand",
                            session.id === chosen?.id && "border-brand bg-brand-soft",
                          )}
                        >
                          <span className="flex flex-wrap items-center gap-2 font-medium">
                            {date}
                            {isOpen && <Badge tone="coral">{text.open}</Badge>}
                          </span>
                          <span className="text-xs text-muted">
                            {session.marked > 0
                              ? format(text.marked, { count: count.format(session.marked) })
                              : text.unmarked}
                            {lasted !== null && ` · ${format(text.lasted, { duration: minutes.format(lasted) })}`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Section>
              {chosen && (
                <Section title={format(text.sheetTitle, { date: when.format(new Date(chosen.startsAt)) })}>
                  <AttendanceSheet
                    // Unsaved marks belong to one class, so opening another starts afresh
                    key={chosen.id}
                    institutionId={activeId}
                    sessionId={chosen.id}
                    title={format(text.sheetTitle, { date: when.format(new Date(chosen.startsAt)) })}
                    onSaved={reload}
                  />
                </Section>
              )}
              <Section title={text.heldTitle} panel>
                <RecordHeldClassForm
                  institutionId={activeId}
                  groupId={groupId}
                  subjectId={subjectId}
                  onRecorded={(sessionId) => {
                    setChosenId(sessionId);
                    reload();
                  }}
                />
              </Section>
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}

/**
 * The attendance of a course for the Teacher assigned to it: its classes, the
 * roll of the one chosen, and the way to record a class given without video.
 */
export function CourseAttendancePage() {
  return (
    // useParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <CourseAttendance />
    </Suspense>
  );
}
