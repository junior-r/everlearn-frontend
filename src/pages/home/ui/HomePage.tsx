"use client";

import { useEffect } from "react";
import { useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { format, useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard, PageStatus } from "@/shared/ui";

/** Placeholder landing screen until the dashboards exist. Applicants are sent to onboarding instead. */
export function HomePage() {
  const router = useLocalizedRouter();
  const session = useSession();
  const { common, home } = useDictionary();
  const needsOnboarding = session.user?.status === "PENDING_ONBOARDING";

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [session.status, needsOnboarding, router]);

  if (session.status !== "authenticated" || needsOnboarding) {
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
