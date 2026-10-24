"use client";

import { useParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { fetchCourseTranscripts } from "@/entities/class-session";
import { useActiveInstitution } from "@/entities/institution";
import { TranscriptView } from "@/features/classroom/read-transcript";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, Section } from "@/shared/ui";
import { PortalShell } from "@/widgets/portal-shell";

function CourseTranscripts() {
  const params = useParams<{ groupId: string; subjectId: string }>();
  const groupId = params?.groupId ?? null;
  const subjectId = params?.subjectId ?? null;
  const institution = useActiveInstitution();
  const { classroom, common, errors } = useDictionary();
  const text = classroom.transcripts;
  const locale = useLocale();
  const institutionId = institution.active?.id ?? null;
  const takesPart = institution.roles.includes("TEACHER") || institution.roles.includes("STUDENT");
  const load = useMemo(
    () =>
      institutionId && takesPart && groupId && subjectId
        ? () => fetchCourseTranscripts(institutionId, groupId, subjectId)
        : null,
    [institutionId, takesPart, groupId, subjectId],
  );
  const course = useResource(load);
  const { data } = course;
  const [chosenId, setChosenId] = useState<string | null>(null);
  // The latest class is open until another is picked
  const chosen = data?.sessions.find((session) => session.sessionId === chosenId) ?? data?.sessions[0];
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" });
  const count = new Intl.NumberFormat(locale);

  return (
    <PortalShell
      title={data ? format(text.title, { subject: data.subjectName }) : text.fallbackTitle}
      subtitle={data ? format(text.subtitle, { group: data.groupName }) : ""}
      roles={["TEACHER", "STUDENT"]}
    >
      {(activeId) => (
        <>
          <ErrorNotice message={errorMessage(errors, course.error)} />
          {!data && !course.error && <p className="text-sm text-muted">{common.loading}</p>}
          {data && (
            <Section title={text.sessionsTitle}>
              {data.sessions.length === 0 && <p className="text-sm text-muted">{text.noSessions}</p>}
              <ul className="flex flex-wrap gap-2">
                {data.sessions.map((session) => {
                  const date = when.format(new Date(session.startsAt));
                  return (
                    <li key={session.sessionId}>
                      <button
                        type="button"
                        aria-pressed={session.sessionId === chosen?.sessionId}
                        aria-label={format(text.sessionFor, { date })}
                        onClick={() => setChosenId(session.sessionId)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-brand/50 focus-visible:outline-2 focus-visible:outline-brand",
                          session.sessionId === chosen?.sessionId && "border-brand bg-brand-soft",
                        )}
                      >
                        <span className="font-medium">{date}</span>
                        <span className="text-xs text-muted">
                          {session.lines === 1
                            ? text.linesOne
                            : format(text.linesMany, { count: count.format(session.lines) })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
          {chosen && (
            <Section title={format(text.transcriptTitle, { date: when.format(new Date(chosen.startsAt)) })}>
              {/* Keyed by class, so a transcript never shows under another class's heading */}
              <TranscriptView key={chosen.sessionId} institutionId={activeId} sessionId={chosen.sessionId} />
            </Section>
          )}
        </>
      )}
    </PortalShell>
  );
}

/** What was said in the past classes of a course, for its Teacher and the Students of its group. */
export function CourseTranscriptsPage() {
  return (
    // useParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <CourseTranscripts />
    </Suspense>
  );
}
