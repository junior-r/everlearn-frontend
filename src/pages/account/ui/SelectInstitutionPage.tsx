"use client";

import { useEffect } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { rolesIn, roleTone, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { errorMessage, useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Avatar, Badge, CenteredCard, ErrorNotice, PageStatus } from "@/shared/ui";

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
              className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left transition duration-150 hover:border-brand/60 hover:bg-brand-soft active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Avatar name={institution.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{institution.name}</span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {rolesIn(user, institution.id).map((role) => (
                    <Badge key={role} tone={roleTone[role]}>
                      {roles[role]}
                    </Badge>
                  ))}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-brand">
                {institutionSelector.enter}
                <ArrowRightIcon
                  aria-hidden
                  weight="bold"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </span>
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
