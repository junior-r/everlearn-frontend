"use client";

import { IdentificationCardIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect } from "react";
import { hasOwnPassword, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard, PageStatus } from "@/shared/ui";

/**
 * Where a registered member waits until their institution checks their ID in
 * person. Nothing is done here: the enrolment desk photographs the document.
 */
export function OnboardingPage() {
  const router = useLocalizedRouter();
  const session = useSession();
  const { common, onboarding } = useDictionary();
  const user = session.user;
  const isPending = user !== null && hasOwnPassword(user) && user.status === "PENDING_ONBOARDING";

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    } else if (session.status === "authenticated" && user && hasOwnPassword(user) && !isPending) {
      router.replace("/");
    }
  }, [session.status, user, isPending, router]);

  if (!isPending) {
    return <PageStatus>{common.loading}</PageStatus>;
  }
  return (
    <CenteredCard brand={common.brand}>
      <section className="mt-6 flex flex-col gap-5">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-2xl bg-sun-soft text-sun-ink"
        >
          <IdentificationCardIcon weight="fill" className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{onboarding.pending.title}</h1>
          <p className="mt-1.5 text-sm text-muted">{onboarding.pending.body}</p>
        </div>
      </section>
      {/* So nobody is stuck signed in on a shared device */}
      <div className="mt-8">
        <LogoutButton />
      </div>
    </CenteredCard>
  );
}
