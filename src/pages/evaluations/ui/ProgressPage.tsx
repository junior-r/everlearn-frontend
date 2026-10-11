"use client";

import { useDictionary } from "@/shared/i18n";
import { AcademicProgress } from "@/widgets/academic-progress";
import { PortalShell } from "@/widgets/portal-shell";

/** A Student's grades and averages in every subject they are enrolled in. */
export function ProgressPage() {
  const { progress } = useDictionary().evaluations;
  return (
    <PortalShell title={progress.title} subtitle={progress.subtitle} roles={["STUDENT"]}>
      {(institutionId) => <AcademicProgress institutionId={institutionId} />}
    </PortalShell>
  );
}
