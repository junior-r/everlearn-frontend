"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { hasOwnPassword, useSession, type Role } from "@/entities/session";
import { localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { ErrorNotice, Logo, PageHeader, PageStatus } from "@/shared/ui";

interface PortalShellProps {
  title: string;
  subtitle: string;
  /** The roles the page is for; the member must hold one of them in the institution they entered. */
  roles: Role[];
  children(institutionId: string): ReactNode;
}

/**
 * Frame of the Teacher and Student pages beyond the home screen. Hiding a page
 * from other roles is a convenience: the backend authorizes every request again.
 */
export function PortalShell({ title, subtitle, roles, children }: PortalShellProps) {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const session = useSession();
  const institution = useActiveInstitution();
  const { common, evaluations } = useDictionary();
  // While a temporary password is pending, SessionRouting owns the navigation
  const isReady = session.user !== null && hasOwnPassword(session.user) && !institution.isLoading;

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [session.status, router]);

  if (!isReady || institution.needsSelection) {
    return <PageStatus>{common.loading}</PageStatus>;
  }
  const institutionId = institution.active?.id ?? null;
  const isAllowed = institutionId !== null && institution.roles.some((role) => roles.includes(role));
  return (
    <div className="mx-auto flex min-h-page max-w-6xl animate-rise flex-col gap-6 px-4 py-4 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Logo name={common.brand} />
        <Link
          href={localizedPath(locale, "/")}
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
          {evaluations.backHome}
        </Link>
      </div>
      <PageHeader title={title} subtitle={subtitle} />
      <main className="flex flex-col gap-8 pb-8">
        {isAllowed ? children(institutionId) : <ErrorNotice message={evaluations.noAccess} />}
      </main>
    </div>
  );
}
