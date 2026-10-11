"use client";

import { useDictionary } from "@/shared/i18n";
import { TeacherDashboard } from "@/widgets/dashboards";
import { PortalShell } from "@/widgets/portal-shell";

/** A Teacher's dashboard: their own courses in figures. */
export function TeacherDashboardPage() {
  const { teacher } = useDictionary().dashboard;
  return (
    <PortalShell title={teacher.title} subtitle={teacher.subtitle} roles={["TEACHER"]}>
      {(institutionId) => <TeacherDashboard institutionId={institutionId} />}
    </PortalShell>
  );
}
