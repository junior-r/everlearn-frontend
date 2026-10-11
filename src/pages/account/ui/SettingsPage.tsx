"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "@/entities/session";
import { ChangePasswordForm } from "@/features/auth/change-password";
import { LinkGoogleButton } from "@/features/auth/link-google";
import { errorMessage, localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard, ErrorNotice, PageStatus } from "@/shared/ui";

function Notice({ children }: { children: string }) {
  return (
    <p role="status" className="rounded-xl bg-mint-soft px-3 py-2.5 text-sm text-mint-ink">
      {children}
    </p>
  );
}

function Settings() {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const session = useSession();
  const { common, settings, auth, errors } = useDictionary();
  // Set by the backend when it sends the browser back from Google
  const params = useSearchParams();
  const justLinked = params?.get("google") === "linked";
  const linkError = params?.get("error") ?? null;
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [session.status, router]);

  if (session.status !== "authenticated") {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const { user } = session;
  return (
    <CenteredCard brand={common.brand} wide>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{settings.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{settings.subtitle}</p>

      <section className="mt-8 border-t border-line pt-6" aria-label={settings.profile}>
        <h2 className="text-lg font-semibold">{settings.profile}</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div>
            <dt className="text-muted">{settings.name}</dt>
            <dd>
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{settings.email}</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 flex flex-col gap-3 border-t border-line pt-6" aria-label={settings.google.title}>
        <h2 className="text-lg font-semibold">{settings.google.title}</h2>
        {justLinked && user.googleLinked && <Notice>{settings.google.success}</Notice>}
        <ErrorNotice message={errorMessage(errors, linkError)} />
        {user.googleLinked ? (
          <p className="text-sm text-muted">{settings.google.linked}</p>
        ) : user.status === "ACTIVE" ? (
          <>
            <p className="text-sm text-muted">{settings.google.notLinked}</p>
            <LinkGoogleButton />
          </>
        ) : (
          <p className="text-sm text-muted">{settings.google.requiresActive}</p>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-3 border-t border-line pt-6" aria-label={settings.password}>
        <h2 className="text-lg font-semibold">{settings.password}</h2>
        {passwordChanged && <Notice>{auth.changePassword.changed}</Notice>}
        <ChangePasswordForm onChanged={() => setPasswordChanged(true)} />
      </section>

      <Link href={localizedPath(locale, "/")} className="mt-8 inline-block text-sm font-medium text-brand">
        {settings.back}
      </Link>
    </CenteredCard>
  );
}

export function SettingsPage() {
  return (
    // useSearchParams needs a Suspense boundary for the page shell to prerender
    <Suspense>
      <Settings />
    </Suspense>
  );
}
