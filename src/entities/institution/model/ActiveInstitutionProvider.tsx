"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useResource } from "@/shared/lib/use-resource";
import { fetchInstitutions } from "../api/fetch-institutions";
import type { Institution } from "./types";

interface ActiveInstitutionValue {
  /** The institutions this admin may act on. */
  institutions: Institution[];
  /** The one admin pages currently act on; null until loaded or when there are none. */
  active: Institution | null;
  isLoading: boolean;
  error: string | null;
  select(institutionId: string): void;
  reload(): void;
}

const ActiveInstitutionContext = createContext<ActiveInstitutionValue | null>(null);

interface ActiveInstitutionProviderProps {
  /** Limits the choice to these ids (an Institution Admin's own); null means all (Platform Admin). */
  allowedIds: string[] | null;
  children: ReactNode;
}

/** Holds which institution the admin dashboard is acting on. The backend re-checks it on every request. */
export function ActiveInstitutionProvider({ allowedIds, children }: ActiveInstitutionProviderProps) {
  const { data, error, isLoading, reload } = useResource(fetchInstitutions);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const value = useMemo(() => {
    const institutions = (data ?? []).filter(
      (institution) => allowedIds === null || allowedIds.includes(institution.id),
    );
    const active =
      institutions.find((institution) => institution.id === selectedId) ?? institutions[0] ?? null;
    return { institutions, active, isLoading, error, select: setSelectedId, reload };
  }, [data, allowedIds, selectedId, isLoading, error, reload]);

  return (
    <ActiveInstitutionContext.Provider value={value}>{children}</ActiveInstitutionContext.Provider>
  );
}

export function useActiveInstitution(): ActiveInstitutionValue {
  const context = useContext(ActiveInstitutionContext);
  if (!context) {
    throw new Error("useActiveInstitution must be used inside ActiveInstitutionProvider");
  }
  return context;
}
