"use client";

import { ArrowLeftIcon, BuildingsIcon, GearSixIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { canAccessAdmin, hasOwnPassword, useSession, type Role } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { ErrorNotice, Logo, PageHeader, PageStatus } from "@/shared/ui";
import { HeaderActions } from "@/widgets/header-actions";

interface PortalShellProps {
  title: string;
  subtitle: string;
  /** The roles the page is for; the member must hold one of them in the institution they entered. */
  roles: Role[];
  /** True for the screen a role lands on after signing in: it offers the account links instead of a way back. */
  isLanding?: boolean;
  children(institutionId: string): ReactNode;
}

/**
 * Frame of the Teacher and Student pages beyond the home screen. Hiding a page
 * from other roles is a convenience: the backend authorizes every request again.
 */
export function PortalShell({ title, subtitle, roles, isLanding = false, children }: PortalShellProps) {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const session = useSession();
  const institution = useActiveInstitution();
  const { admin, common, evaluations, home } = useDictionary();
  const linkClass =
    "inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand";
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
  // A Principal also works the enrolment desk, which lives in the admin area
  const worksTheDesk = isLanding && session.user !== null && canAccessAdmin(session.user, institutionId);
  return (
    <div className="mx-auto flex min-h-page max-w-6xl animate-rise flex-col gap-6 px-4 py-4 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Logo name={common.brand} />
        <div className="flex items-center gap-2">
          {isLanding ? (
            <>
              {worksTheDesk && (
                <Link href={localizedPath(locale, "/admin/members")} className={linkClass}>
                  <UsersThreeIcon aria-hidden className="size-4" />
                  {admin.nav.members}
                </Link>
              )}
              {institution.institutions.length > 1 && (
                <Link href={localizedPath(locale, "/select-institution")} className={linkClass}>
                  <BuildingsIcon aria-hidden className="size-4" />
                  {home.changeInstitution}
                </Link>
              )}
              <Link href={localizedPath(locale, "/settings")} aria-label={home.settings} className={linkClass}>
                <GearSixIcon aria-hidden className="size-4" />
                {/* A phone has room for the icon only; the link keeps its name for everyone */}
                <span className="hidden sm:inline">{home.settings}</span>
              </Link>
            </>
          ) : (
            <Link href={localizedPath(locale, "/")} className={linkClass}>
              <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
              {evaluations.backHome}
            </Link>
          )}
          <HeaderActions />
          {isLanding && (
            <div className="w-36 shrink-0 whitespace-nowrap">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
      <PageHeader title={title} subtitle={subtitle} />
      <main className="flex flex-col gap-8 pb-8">
        {isAllowed ? children(institutionId) : <ErrorNotice message={evaluations.noAccess} />}
      </main>
    </div>
  );
}
