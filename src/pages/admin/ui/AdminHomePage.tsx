"use client";

import { useActiveInstitution } from "@/entities/institution";
import { format, useDictionary } from "@/shared/i18n";
import { AdminPage } from "@/widgets/admin-shell";
import { InstitutionDashboard, PlatformDashboard } from "@/widgets/dashboards";

/**
 * `/admin`: the institution a member entered, in figures, or the whole platform
 * for a Platform Admin who has not entered one. The shell sends everyone else
 * (Staff) on to their first section.
 */
export function AdminHomePage() {
  const { dashboard } = useDictionary();
  const { active } = useActiveInstitution();
  if (!active) {
    return (
      <AdminPage title={dashboard.platform.title} subtitle={dashboard.platform.subtitle}>
        <PlatformDashboard />
      </AdminPage>
    );
  }
  return (
    <AdminPage
      title={dashboard.institution.title}
      subtitle={format(dashboard.institution.subtitle, { name: active.name })}
    >
      <InstitutionDashboard institutionId={active.id} />
    </AdminPage>
  );
}
