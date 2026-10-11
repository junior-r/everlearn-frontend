"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ForgotPasswordForm, ResetPasswordForm } from "@/features/auth/reset-password";
import { localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { CenteredCard, ErrorNotice } from "@/shared/ui";

const linkClass =
  "inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand";

function BackToLogin() {
  const locale = useLocale();
  const { auth } = useDictionary();
  return (
    <Link href={localizedPath(locale, "/login")} className={`mt-6 ${linkClass}`}>
      <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
      {auth.forgotPassword.backToLogin}
    </Link>
  );
}

/** `/forgot-password`: asks for the email a reset link should go to. Open to anyone. */
export function ForgotPasswordPage() {
  const { auth, common } = useDictionary();
  const text = auth.forgotPassword;
  return (
    <CenteredCard brand={common.brand}>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{text.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{text.subtitle}</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <BackToLogin />
    </CenteredCard>
  );
}

const TOKEN_PREFIX = "#token=";

// The token travels after "#", which browsers never send to a server. It exists only
// in the browser, so it is read as an external store to keep the first render stable.
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash;
const noHash = () => "";

/** `/reset-password#token=…`: chooses a new password with the link from the email. Open to anyone. */
export function ResetPasswordPage() {
  const locale = useLocale();
  const { auth, common } = useDictionary();
  const text = auth.resetPassword;
  const hash = useSyncExternalStore(subscribeToHash, readHash, noHash);
  const token = hash.startsWith(TOKEN_PREFIX) ? hash.slice(TOKEN_PREFIX.length) : "";
  return (
    <CenteredCard brand={common.brand}>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{text.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{text.subtitle}</p>
      <div className="mt-8 flex flex-col gap-4">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <ErrorNotice message={text.missingToken} />
            <Link href={localizedPath(locale, "/forgot-password")} className={linkClass}>
              {text.askAgain}
            </Link>
          </>
        )}
      </div>
      <BackToLogin />
    </CenteredCard>
  );
}
