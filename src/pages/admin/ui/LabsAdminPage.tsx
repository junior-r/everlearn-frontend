"use client";

import { useSession } from "@/entities/session";
import { LabAccess } from "@/features/labs/manage-lab-access";
import { useDictionary } from "@/shared/i18n";
import { AdminPage, WithActiveInstitution } from "@/widgets/admin-shell";

/**
 * Which labs the institution's Teachers and Students may open. A Platform Admin
 * grants them; the Institution Admin switches the granted ones on and off.
 */
export function LabsAdminPage() {
  const { admin } = useDictionary();
  const canGrant = useSession().user?.isPlatformAdmin === true;
  return (
    <AdminPage title={admin.labs.title} subtitle={canGrant ? admin.labs.subtitlePlatform : admin.labs.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <LabAccess key={institutionId} institutionId={institutionId} canGrant={canGrant} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
