"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSession } from "@/entities/session";
import { GoogleLoginButton } from "@/features/auth/google-login";
import { LoginForm } from "@/features/auth/login";

function LoginCard() {
  const router = useRouter();
  const session = useSession();
  // Typed as nullable because the root pages/ stub makes Next allow for the Pages Router
  const errorCode = useSearchParams()?.get("error") ?? null;

  useEffect(() => {
    if (session.status === "authenticated") {
      router.replace("/");
    }
  }, [session.status, router]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
      <p className="text-sm font-semibold tracking-tight text-brand">Everlearn</p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1.5 text-sm text-muted">Use your institution account to continue.</p>

      <div className="mt-8">
        <LoginForm initialErrorCode={errorCode} onSuccess={() => router.replace("/")} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleLoginButton />
    </div>
  );
}

export function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      {/* useSearchParams needs a Suspense boundary for the page shell to prerender */}
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
