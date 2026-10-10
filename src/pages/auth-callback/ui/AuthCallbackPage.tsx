"use client";

import { useEffect } from "react";
import { useSession } from "@/entities/session";
import { useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { PageStatus } from "@/shared/ui";

/**
 * Landing page after the Google redirect. The backend has already set the
 * refresh cookie, so the session provider restores the session on load.
 */
export function AuthCallbackPage() {
  const router = useLocalizedRouter();
  const { status } = useSession();
  const { auth } = useDictionary();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
    if (status === "anonymous") {
      router.replace("/login?error=GOOGLE_AUTHENTICATION_FAILED");
    }
  }, [status, router]);

  return <PageStatus>{auth.callback.signingIn}</PageStatus>;
}
