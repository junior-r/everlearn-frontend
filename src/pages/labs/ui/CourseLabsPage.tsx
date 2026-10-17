"use client";

import { useParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { fetchMyCourses } from "@/entities/class-session";
import { useActiveInstitution } from "@/entities/institution";
import { fetchCourseLabAssignments } from "@/entities/lab";
import { AssignLabForm } from "@/features/labs/assign-lab";
import { ActivityList, ActivityResults } from "@/features/labs/follow-activities";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, Section } from "@/shared/ui";
import { PortalShell } from "@/widgets/portal-shell";

function CourseLabs() {
  const params = useParams<{ groupId: string; subjectId: string }>();
  const groupId = params?.groupId ?? null;
  const subjectId = params?.subjectId ?? null;
  const { labs, errors, common } = useDictionary();
  const text = labs.course;
  const institution = useActiveInstitution();
  const institutionId = institution.active?.id ?? null;
  const isTeacher = institution.roles.includes("TEACHER");
  const loadCourses = useMemo(
    () => (institutionId && isTeacher ? () => fetchMyCourses(institutionId) : null),
    [institutionId, isTeacher],
  );
  const loadActivities = useMemo(
    () =>
      institutionId && isTeacher && groupId && subjectId
        ? () => fetchCourseLabAssignments(institutionId, groupId, subjectId)
        : null,
    [institutionId, isTeacher, groupId, subjectId],
  );
  const courses = useResource(loadCourses);
  const activities = useResource(loadActivities);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const course = courses.data?.find((candidate) => candidate.groupId === groupId && candidate.subject.id === subjectId);
  const selected = activities.data?.find((activity) => activity.id === selectedId) ?? null;

  return (
    <PortalShell
      title={course ? format(text.title, { subject: course.subject.name }) : labs.catalog.title}
      subtitle={course ? format(text.subtitle, { group: course.groupName }) : ""}
      roles={["TEACHER"]}
    >
      {(activeId) =>
        groupId &&
        subjectId && (
          <>
            <Section title={text.newActivity} panel>
              <AssignLabForm
                institutionId={activeId}
                groupId={groupId}
                subjectId={subjectId}
                onCreated={activities.reload}
              />
            </Section>
            <Section title={text.activities}>
              <ErrorNotice message={errorMessage(errors, activities.error)} />
              {!activities.data && !activities.error && <p className="text-sm text-muted">{common.loading}</p>}
              {activities.data && (
                <ActivityList
                  institutionId={activeId}
                  activities={activities.data}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
                  onDeleted={() => {
                    setSelectedId(null);
                    activities.reload();
                  }}
                />
              )}
            </Section>
            {selected && (
              <Section title={format(text.resultsOf, { title: selected.title })}>
                <ActivityResults key={selected.id} institutionId={activeId} assignmentId={selected.id} />
              </Section>
            )}
          </>
        )
      }
    </PortalShell>
  );
}

/**
 * The lab activities of one subject of one group, for the Teacher assigned to
 * it: giving new ones and following who handed them in. The backend checks the assignment.
 */
export function CourseLabsPage() {
  return (
    // useParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <CourseLabs />
    </Suspense>
  );
}
