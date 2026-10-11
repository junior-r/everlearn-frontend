"use client";

import { ArrowRightIcon, BuildingsIcon, GearSixIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { canAccessAdmin, hasOwnPassword, roleTone, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { MyClasses } from "@/features/classroom/enter-class";
import { format, localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { Avatar, Badge, CenteredCard, PageStatus } from "@/shared/ui";

/**
 * Landing screen of Teachers and Students, with their classes. Pending members go to
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

  const linkClass =
    "group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm font-medium transition duration-150 hover:border-brand/60 hover:bg-brand-soft active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand";
  const arrow = (
    <ArrowRightIcon
      aria-hidden
      weight="bold"
      className="ml-auto size-4 text-brand transition-transform group-hover:translate-x-0.5"
    />
  );
  return (
    <CenteredCard brand={common.brand} wide>
      <div className="mt-6 flex items-center gap-4 lg:mt-0">
        <Avatar name={`${user.firstName} ${user.lastName}`} size="md" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {format(home.welcome, { name: user.firstName })}
          </h1>
          <p className="mt-1 truncate text-sm text-muted">{format(home.signedInAs, { email: user.email })}</p>
        </div>
      </div>
      {institution.active && (
        <div className="mt-6 rounded-2xl bg-surface-muted p-4">
          <p className="text-sm font-medium">{format(home.institution, { name: institution.active.name })}</p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {institution.roles.map((role) => (
              <Badge key={role} tone={roleTone[role]}>
                {roles[role]}
              </Badge>
            ))}
          </p>
        </div>
      )}
      {institution.active && institution.roles.some((role) => role === "TEACHER" || role === "STUDENT") && (
        <MyClasses institutionId={institution.active.id} />
      )}
      <nav aria-label={home.account} className="mt-4 flex flex-col gap-2">
        {institution.institutions.length > 1 && (
          <Link href={localizedPath(locale, "/select-institution")} className={linkClass}>
            <BuildingsIcon aria-hidden className="size-5 text-muted" />
            {home.changeInstitution}
            {arrow}
          </Link>
        )}
        <Link href={localizedPath(locale, "/settings")} className={linkClass}>
          <GearSixIcon aria-hidden className="size-5 text-muted" />
          {home.settings}
          {arrow}
        </Link>
      </nav>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </CenteredCard>
  );
}
