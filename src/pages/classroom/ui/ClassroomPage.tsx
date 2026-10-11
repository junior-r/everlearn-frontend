"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { requestClassroomAccess } from "@/entities/class-session";
import { useActiveInstitution } from "@/entities/institution";
import { hasOwnPassword, useSession } from "@/entities/session";
import { errorMessage, localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { buttonBase, buttonStyles, CenteredCard, ErrorNotice, PageStatus } from "@/shared/ui";
import { VirtualClassroom } from "@/widgets/virtual-classroom";

function Classroom() {
  const sessionId = useParams<{ sessionId: string }>()?.sessionId ?? null;
  const router = useLocalizedRouter();
  const locale = useLocale();
  const session = useSession();
  const institution = useActiveInstitution();
  const { classroom, common, errors } = useDictionary();
  const isReady = session.user !== null && hasOwnPassword(session.user) && !institution.isLoading;
  const institutionId = isReady ? (institution.active?.id ?? null) : null;
  const load = useMemo(
    () => (institutionId && sessionId ? () => requestClassroomAccess(institutionId, sessionId) : null),
    [institutionId, sessionId],
  );
  const access = useResource(load);
  const goHome = useCallback(() => router.replace("/"), [router]);

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [session.status, router]);

  // Nobody enters a class from platform level: there is no membership to enter it with
  const error = access.error ?? (isReady && !institutionId && !institution.needsSelection ? "HTTP_403" : null);
  if (error) {
    return (
      <CenteredCard brand={common.brand}>
        <div className="mt-6 flex flex-col gap-4 lg:mt-0">
          <ErrorNotice message={errorMessage(errors, error)} />
          <Link href={localizedPath(locale, "/")} className={`${buttonBase} ${buttonStyles.secondary}`}>
            {classroom.backHome}
          </Link>
        </div>
      </CenteredCard>
    );
  }
  if (!access.data) {
    return <PageStatus>{classroom.preparing}</PageStatus>;
  }
  // Keyed by the token, so a new access always starts a new connection
  return <VirtualClassroom key={access.data.token} access={access.data} onLeave={goHome} onRejoin={access.reload} />;
}

/**
 * A class session's room. It asks the backend for access, which only the
 * assigned Teacher and the enrolled Students get, and then opens the classroom.
 */
export function ClassroomPage() {
  return (
    // useParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <Classroom />
    </Suspense>
  );
}
