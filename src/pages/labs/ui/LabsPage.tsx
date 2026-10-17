"use client";

import { useActiveInstitution } from "@/entities/institution";
import { MyActivities } from "@/features/labs/hand-in-activity";
import { useDictionary } from "@/shared/i18n";
import { Section } from "@/shared/ui";
import { LabCatalog } from "@/widgets/lab-workbench";
import { PortalShell } from "@/widgets/portal-shell";

/** The labs a Teacher or Student may open and, for a Student, the activities their Teachers gave them. */
export function LabsPage() {
  const { labs } = useDictionary();
  const { roles } = useActiveInstitution();
  const isStudent = roles.includes("STUDENT");
  return (
    <PortalShell title={labs.catalog.title} subtitle={labs.catalog.subtitle} roles={["TEACHER", "STUDENT"]}>
      {(institutionId) => (
        <>
          {isStudent && (
            <Section title={labs.activities.title}>
              <MyActivities institutionId={institutionId} />
            </Section>
          )}
          <LabCatalog institutionId={institutionId} />
        </>
      )}
    </PortalShell>
  );
}
