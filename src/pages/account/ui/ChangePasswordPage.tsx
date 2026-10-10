"use client";

import { useEffect } from "react";
import { useSession } from "@/entities/session";
import { ChangePasswordForm } from "@/features/auth/change-password";
import { LogoutButton } from "@/features/auth/logout";
import { useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard, PageStatus } from "@/shared/ui";

/** Where a member with a temporary password is held until they choose their own. */
export function ChangePasswordPage() {
  const router = useLocalizedRouter();
  const session = useSession();
  const { auth, common } = useDictionary();
  const text = auth.changePassword;

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [session.status, router]);

  if (session.status !== "authenticated") {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const isForced = session.user.mustChangePassword;
  return (
    <CenteredCard brand={common.brand}>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {isForced ? text.forcedTitle : text.title}
      </h1>
      {isForced && <p className="mt-1.5 text-sm text-muted">{text.forcedSubtitle}</p>}
      <div className="mt-8 flex flex-col gap-4">
        <ChangePasswordForm onChanged={() => router.replace("/")} />
        <LogoutButton />
      </div>
    </CenteredCard>
  );
}
