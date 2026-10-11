"use client";

import { useDictionary } from "@/shared/i18n";
import { EvaluationCalendar } from "@/widgets/evaluation-calendar";
import { PortalShell } from "@/widgets/portal-shell";

/** The due dates of every evaluation a Teacher set or a Student must hand in. */
export function CalendarPage() {
  const { calendar } = useDictionary().evaluations;
  return (
    <PortalShell title={calendar.title} subtitle={calendar.subtitle} roles={["TEACHER", "STUDENT"]}>
      {(institutionId) => <EvaluationCalendar institutionId={institutionId} />}
    </PortalShell>
  );
}
