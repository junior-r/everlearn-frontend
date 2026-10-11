"use client";

import { Suspense } from "react";
import { useDictionary } from "@/shared/i18n";
import { AcademicDashboard } from "@/widgets/dashboards";
import { PortalShell } from "@/widgets/portal-shell";
import { GuardianPortal } from "@/widgets/ward-overview";

/** `/principal`: the screen a Principal lands on, with the teaching of the institution in figures. */
export function PrincipalPage() {
  const { academic } = useDictionary().dashboard;
  return (
    <PortalShell title={academic.title} subtitle={academic.subtitle} roles={["COORDINATOR"]} isLanding>
      {(institutionId) => <AcademicDashboard institutionId={institutionId} />}
    </PortalShell>
  );
}

/** `/guardian`: the screen a Guardian lands on, with the Students they answer for. */
export function GuardianPage() {
  const { guardian } = useDictionary();
  return (
    <PortalShell title={guardian.title} subtitle={guardian.subtitle} roles={["GUARDIAN"]} isLanding>
      {(institutionId) => (
        // The portal reads the ward from the address, which needs a Suspense boundary to prerender
        <Suspense>
          <GuardianPortal key={institutionId} institutionId={institutionId} />
        </Suspense>
      )}
    </PortalShell>
  );
}
