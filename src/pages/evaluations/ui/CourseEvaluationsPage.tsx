"use client";

import { useParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { fetchGradebook } from "@/entities/evaluation";
import { useActiveInstitution } from "@/entities/institution";
import { GradebookTable } from "@/features/evaluations/grade-students";
import { ManageEvaluations } from "@/features/evaluations/manage-evaluations";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, Section } from "@/shared/ui";
import { PortalShell } from "@/widgets/portal-shell";

function CourseEvaluations() {
  const params = useParams<{ groupId: string; subjectId: string }>();
  const groupId = params?.groupId ?? null;
  const subjectId = params?.subjectId ?? null;
  const institution = useActiveInstitution();
  const { common, errors, evaluations } = useDictionary();
  const institutionId = institution.active?.id ?? null;
  const isTeacher = institution.roles.includes("TEACHER");
  const load = useMemo(
    () =>
      institutionId && isTeacher && groupId && subjectId
        ? () => fetchGradebook(institutionId, groupId, subjectId)
        : null,
    [institutionId, isTeacher, groupId, subjectId],
  );
  const gradebook = useResource(load);
  const { data, reload } = gradebook;

  return (
    <PortalShell
      title={data ? format(evaluations.course.title, { subject: data.subject.name }) : evaluations.manage.title}
      subtitle={data ? format(evaluations.course.subtitle, { group: data.groupName }) : ""}
      roles={["TEACHER"]}
    >
      {(activeId) => (
        <>
          <ErrorNotice message={errorMessage(errors, gradebook.error)} />
          {!data && !gradebook.error && <p className="text-sm text-muted">{common.loading}</p>}
          {data && (
            <>
              <Section title={evaluations.manage.title}>
                <ManageEvaluations institutionId={activeId} gradebook={data} onChanged={reload} />
              </Section>
              <Section title={evaluations.gradebook.title}>
                <GradebookTable institutionId={activeId} gradebook={data} onSaved={reload} />
              </Section>
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}

/**
 * A course for the Teacher assigned to it: its evaluations and the gradebook.
 * Anyone else is told so by the backend, which checks the assignment itself.
 */
export function CourseEvaluationsPage() {
  return (
    // useParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <CourseEvaluations />
    </Suspense>
  );
}
