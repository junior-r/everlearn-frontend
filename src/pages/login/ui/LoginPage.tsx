"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSession } from "@/entities/session";
import { GoogleLoginButton } from "@/features/auth/google-login";
import { LoginForm } from "@/features/auth/login";
import { useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard } from "@/shared/ui";

function LoginCard() {
  const router = useLocalizedRouter();
  const session = useSession();
  const { auth, common } = useDictionary();
  // Typed as nullable because the root pages/ stub makes Next allow for the Pages Router
  const errorCode = useSearchParams()?.get("error") ?? null;

  useEffect(() => {
    if (session.status === "authenticated") {
      router.replace("/");
    }
  }, [session.status, router]);

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{auth.login.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{auth.login.subtitle}</p>

      <div className="mt-8">
        <LoginForm initialErrorCode={errorCode} onSuccess={() => router.replace("/")} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        {common.or}
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleLoginButton />
    </>
  );
}

export function LoginPage() {
  const { common } = useDictionary();
  return (
    <CenteredCard brand={common.brand}>
      {/* useSearchParams needs a Suspense boundary for the page shell to prerender */}
      <Suspense>
        <LoginCard />
      </Suspense>
    </CenteredCard>
  );
}
