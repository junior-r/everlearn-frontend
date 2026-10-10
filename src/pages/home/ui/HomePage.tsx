"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { canAccessAdmin, hasOwnPassword, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { format, localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard, PageStatus } from "@/shared/ui";

/**
 * Placeholder landing screen for Teachers and Students. Pending members go to
 * onboarding, and whoever is an admin of the institution they entered goes to the dashboard.
 */
export function HomePage() {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const session = useSession();
  const institution = useActiveInstitution();
  const { common, home, roles } = useDictionary();
  const user = session.user;
  // While a temporary password is pending, SessionRouting owns the navigation
  const isReady = user !== null && hasOwnPassword(user) && !institution.isLoading;
  const needsOnboarding = isReady && user.status === "PENDING_ONBOARDING";
  const isAdmin =
    isReady &&
    !needsOnboarding &&
    !institution.needsSelection &&
    canAccessAdmin(user, institution.active?.id ?? null);

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    } else if (needsOnboarding) {
      router.replace("/onboarding");
    } else if (isAdmin) {
      router.replace("/admin");
    }
  }, [session.status, needsOnboarding, isAdmin, router]);

  if (!isReady || needsOnboarding || isAdmin || institution.needsSelection) {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const linkClass = "text-sm font-medium text-brand";
  return (
    <CenteredCard brand={common.brand}>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {format(home.welcome, { name: user.firstName })}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{format(home.signedInAs, { email: user.email })}</p>
      {institution.active && (
        <p className="mt-4 text-sm">
          {format(home.institution, { name: institution.active.name })}
          <span className="text-muted">
            {" · "}
            {institution.roles.map((role) => roles[role]).join(" · ")}
          </span>
        </p>
      )}
      <nav className="mt-6 flex flex-col gap-2">
        {institution.institutions.length > 1 && (
          <Link href={localizedPath(locale, "/select-institution")} className={linkClass}>
            {home.changeInstitution}
          </Link>
        )}
        <Link href={localizedPath(locale, "/settings")} className={linkClass}>
          {home.settings}
        </Link>
      </nav>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </CenteredCard>
  );
}
