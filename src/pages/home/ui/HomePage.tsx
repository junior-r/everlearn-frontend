"use client";

import { useEffect } from "react";
import { canAccessAdmin, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { format, useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard, PageStatus } from "@/shared/ui";

/** Placeholder landing screen for Teachers and Students. Pending members go to onboarding and admins to the dashboard. */
export function HomePage() {
  const router = useLocalizedRouter();
  const session = useSession();
  const { common, home } = useDictionary();
  const needsOnboarding = session.user?.status === "PENDING_ONBOARDING";
  const isAdmin = session.user !== null && !needsOnboarding && canAccessAdmin(session.user);

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    } else if (needsOnboarding) {
      router.replace("/onboarding");
    } else if (isAdmin) {
      router.replace("/admin");
    }
  }, [session.status, needsOnboarding, isAdmin, router]);

  if (session.status !== "authenticated" || needsOnboarding || isAdmin) {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const { user } = session;
  return (
    <CenteredCard brand={common.brand}>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {format(home.welcome, { name: user.firstName })}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{format(home.signedInAs, { email: user.email })}</p>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </CenteredCard>
  );
}
