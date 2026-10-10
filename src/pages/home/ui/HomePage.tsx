"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";

/** Placeholder landing screen until the dashboards exist; proves the session round-trip. */
export function HomePage() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [session.status, router]);

  if (session.status !== "authenticated") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p role="status" className="text-sm text-muted">
          Loading…
        </p>
      </main>
    );
  }

  const { user } = session;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-tight text-brand">Everlearn</p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome, {user.firstName}</h1>
        <p className="mt-1.5 text-sm text-muted">Signed in as {user.email}</p>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
