"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { GroupTeaching } from "@/widgets/dashboards";
import { PortalShell } from "@/widgets/portal-shell";

function PrincipalGroup() {
  const groupId = useParams<{ groupId: string }>()?.groupId ?? null;
  const { academic } = useDictionary().dashboard;
  const locale = useLocale();
  return (
    <PortalShell title={academic.group.title} subtitle={academic.group.subtitle} roles={["COORDINATOR"]}>
      {(institutionId) => (
        <>
          <Link
            href={localizedPath(locale, "/principal")}
            className="inline-flex items-center gap-1.5 self-start rounded-xl text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
            {academic.group.back}
          </Link>
          {groupId && <GroupTeaching key={groupId} institutionId={institutionId} groupId={groupId} />}
        </>
      )}
    </PortalShell>
  );
}

/** `/principal/groups/:groupId`: a group of the Principal's institution, with its Teachers and timetable. */
export function PrincipalGroupPage() {
  return (
    // useParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <PrincipalGroup />
    </Suspense>
  );
}
