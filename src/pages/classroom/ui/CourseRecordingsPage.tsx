"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { fetchCourseRecordings, lastedMinutes, recordingSize } from "@/entities/class-session";
import { useActiveInstitution } from "@/entities/institution";
import { RecordingPlayer } from "@/features/classroom/watch-recording";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, Section } from "@/shared/ui";
import { PortalShell } from "@/widgets/portal-shell";

function CourseRecordings() {
  const params = useParams<{ groupId: string; subjectId: string }>();
  const groupId = params?.groupId ?? null;
  const subjectId = params?.subjectId ?? null;
  // A notice about a new recording opens that one
  const linked = useSearchParams()?.get("recording") ?? null;
  const institution = useActiveInstitution();
  const { classroom, common, errors } = useDictionary();
  const text = classroom.recordings;
  const locale = useLocale();
  const institutionId = institution.active?.id ?? null;
  const takesPart = institution.roles.includes("TEACHER") || institution.roles.includes("STUDENT");
  const load = useMemo(
    () =>
      institutionId && takesPart && groupId && subjectId
        ? () => fetchCourseRecordings(institutionId, groupId, subjectId)
        : null,
    [institutionId, takesPart, groupId, subjectId],
  );
  const course = useResource(load);
  const { data } = course;
  const [chosenId, setChosenId] = useState<string | null>(null);
  // The one picked, else the one a notice linked to, else the latest
  const chosen =
    data?.recordings.find((recording) => recording.id === (chosenId ?? linked)) ?? data?.recordings[0];
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" });

  function duration(startedAt: string, endedAt: string) {
    const minutes = lastedMinutes(startedAt, endedAt) ?? 0;
    return minutes < 1 ? text.durationUnder : format(text.duration, { minutes: String(minutes) });
  }

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
          {chosen && (
            <Section title={format(text.playerTitle, { date: when.format(new Date(chosen.startsAt)) })}>
              {/* Keyed by recording, so a player never keeps the link of another class */}
              <RecordingPlayer
                key={chosen.id}
                institutionId={activeId}
                recordingId={chosen.id}
                label={format(text.playerLabel, { date: when.format(new Date(chosen.startsAt)) })}
              />
            </Section>
          )}
          {data && (
            <Section title={text.listTitle}>
              {data.recordings.length === 0 && <p className="text-sm text-muted">{text.empty}</p>}
              <ul className="flex flex-wrap gap-2">
                {data.recordings.map((recording) => {
                  const date = when.format(new Date(recording.startsAt));
                  const isChosen = recording.id === chosen?.id;
                  return (
                    <li key={recording.id}>
                      <button
                        type="button"
                        aria-pressed={isChosen}
                        aria-label={format(text.recordingFor, { date })}
                        onClick={() => setChosenId(recording.id)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-brand/50 focus-visible:outline-2 focus-visible:outline-brand",
                          isChosen && "border-brand bg-brand-soft",
                        )}
                      >
                        <span className="font-medium">{date}</span>
                        <span className="text-xs text-muted">
                          {duration(recording.startedAt, recording.endedAt)} ·{" "}
                          {recordingSize(recording.sizeBytes, locale)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </>
      )}
    </PortalShell>
  );
}

/** The recorded classes of a course, to watch or download, for its Teacher and the Students of its group. */
export function CourseRecordingsPage() {
  return (
    // useParams and useSearchParams need a Suspense boundary for the page shell to prerender
    <Suspense>
      <CourseRecordings />
    </Suspense>
  );
}
