"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/entities/session";

/**
 * Landing page after the Google redirect. The backend has already set the
 * refresh cookie, so the session provider restores the session on load.
 */
export function AuthCallbackPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
    if (status === "anonymous") {
      router.replace("/login?error=GOOGLE_AUTHENTICATION_FAILED");
    }
  }, [status, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p role="status" className="text-sm text-muted">
        Signing you in…
      </p>
    </main>
  );
}
