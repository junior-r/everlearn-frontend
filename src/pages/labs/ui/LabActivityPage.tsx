"use client";

import { ArrowLeftIcon, ClockCountdownIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { formatDateTime } from "@/entities/evaluation";
import { useActiveInstitution } from "@/entities/institution";
import { fetchMyLabAssignment, isLanguageLab, type LabState } from "@/entities/lab";
import { AnswerSheet, HandInNote } from "@/features/labs/hand-in-activity";
import { errorMessage, format, localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, Section } from "@/shared/ui";
import { LAB_RUNNERS, LabView } from "@/widgets/lab-workbench";
import { PortalShell } from "@/widgets/portal-shell";

/** A simulation activity: the lab to work in, and the note to hand in. */
function SimulationWork({ institutionId, detail, onHandedIn }: Parameters<typeof HandInNote>[0]) {
  const { labs } = useDictionary();
  const labKey = detail.assignment.labKey;
  const [state, setState] = useState<LabState>(() => LAB_RUNNERS[labKey].initial());
  return (
    <>
      <LabView labKey={labKey} state={state} onChange={setState} mode="standalone" institutionId={institutionId} />
      <Section title={labs.activities.handInTitle}>
        <HandInNote institutionId={institutionId} detail={detail} onHandedIn={onHandedIn} />
      </Section>
    </>
  );
}

function Activity() {
  const assignmentId = useParams<{ assignmentId: string }>()?.assignmentId ?? null;
  const { labs, errors, common } = useDictionary();
  const locale = useLocale();
  const institution = useActiveInstitution();
  const institutionId = institution.active?.id ?? null;
  const load = useMemo(
    () => (institutionId && assignmentId ? () => fetchMyLabAssignment(institutionId, assignmentId) : null),
    [institutionId, assignmentId],
  );
  const activity = useResource(load);
  const detail = activity.data;

  return (
    <PortalShell
      title={detail ? detail.assignment.title : labs.activities.title}
      subtitle={
        detail
          ? format(labs.activities.from, {
              lab: labs.names[detail.assignment.labKey],
              subject: detail.assignment.course.subjectName,
            })
          : ""
      }
      roles={["STUDENT"]}
    >
      {(activeId) => (
        <>
          <Link
            href={localizedPath(locale, "/labs")}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
            {labs.catalog.back}
          </Link>
          <ErrorNotice message={errorMessage(errors, activity.error)} />
          {!detail && !activity.error && <p className="text-sm text-muted">{common.loading}</p>}
          {detail && (
            <>
              <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-card">
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <ClockCountdownIcon aria-hidden className="size-4" />
                  {detail.assignment.dueAt
                    ? format(labs.activities.dueOn, { date: formatDateTime(detail.assignment.dueAt, locale) })
                    : labs.activities.noDue}
                </p>
                <p className="max-w-[65ch] whitespace-pre-line">
                  {detail.assignment.instructions ?? labs.activities.noInstructions}
                </p>
              </div>
              {isLanguageLab(detail.assignment.labKey) ? (
                <AnswerSheet institutionId={activeId} detail={detail} onHandedIn={activity.reload} />
              ) : (
                <SimulationWork institutionId={activeId} detail={detail} onHandedIn={activity.reload} />
              )}
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}

/** A lab activity as its Student works on it and hands it in, once. */
export function LabActivityPage() {
  return (
    // useParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <Activity />
    </Suspense>
  );
}
