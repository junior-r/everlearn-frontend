"use client";

import { useEffect } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { rolesIn, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { errorMessage, useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { CenteredCard, ErrorNotice, PageStatus } from "@/shared/ui";

/** Lets a member of several institutions choose which one this session works in. */
export function SelectInstitutionPage() {
  const router = useLocalizedRouter();
  const session = useSession();
  const { institutions, select, isLoading, error } = useActiveInstitution();
  const { common, institutionSelector, roles, errors } = useDictionary();

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [session.status, router]);

  if (session.status !== "authenticated" || isLoading) {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const { user } = session;
  function enter(institutionId: string) {
    select(institutionId);
    router.replace("/");
  }

  return (
    <CenteredCard brand={common.brand} wide>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{institutionSelector.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{institutionSelector.subtitle}</p>
      <div className="mt-6">
        <ErrorNotice message={errorMessage(errors, error)} />
      </div>
      <ul className="mt-2 flex flex-col gap-3">
        {institutions.map((institution) => (
          <li key={institution.id}>
            <button
              type="button"
              onClick={() => enter(institution.id)}
              className="flex w-full items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span>
                <span className="block font-medium">{institution.name}</span>
                <span className="block text-sm text-muted">
                  {rolesIn(user, institution.id)
                    .map((role) => roles[role])
                    .join(" · ")}
                </span>
              </span>
              <span className="text-sm font-medium text-brand">{institutionSelector.enter}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </CenteredCard>
  );
}
