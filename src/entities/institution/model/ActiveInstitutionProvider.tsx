"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { hasOwnPassword, rolesIn, useSession, type Role } from "@/entities/session/@x/institution";
import { createCookieStore } from "@/shared/lib/cookie-store";
import { useResource } from "@/shared/lib/use-resource";
import { fetchInstitutions } from "../api/fetch-institutions";
import type { Institution } from "./types";

interface ActiveInstitutionValue {
  /** The institutions the signed-in user may enter (all of them for a Platform Admin). */
  institutions: Institution[];
  /** The institution this session is acting in; null until chosen, when there are none, or for a Platform Admin at platform level. */
  active: Institution | null;
  /** The user's roles in the active institution. */
  roles: Role[];
  /** True when the user belongs to several institutions and has not chosen one yet. */
  needsSelection: boolean;
  /** True until the institutions are first known; a later `reload` does not set it again. */
  isLoading: boolean;
  error: string | null;
  select(institutionId: string): void;
  clear(): void;
  reload(): void;
}

const ActiveInstitutionContext = createContext<ActiveInstitutionValue | null>(null);

// A convenience only: it remembers the choice between visits. The backend checks every request's institution itself.
const selection = createCookieStore("everlearn_institution");
const noServerSelection = () => null;

/**
 * Holds the institution context for the session. A user with one institution
 * enters it automatically; with several they must choose (see `needsSelection`).
 */
export function ActiveInstitutionProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const userId = user && hasOwnPassword(user) ? user.id : null;
  // A new function per user, so one user's institutions are never shown to the next
  const load = useMemo(() => (userId ? () => fetchInstitutions() : null), [userId]);
  const { data, error, isLoading, reload } = useResource(load);
  const selectedId = useSyncExternalStore(selection.subscribe, selection.get, noServerSelection);
  const clear = useCallback(() => selection.set(null), []);

  const value = useMemo<ActiveInstitutionValue>(() => {
    const institutions = data ?? [];
    const chosen = institutions.find((institution) => institution.id === selectedId);
    // A member of exactly one institution is simply in it. A Platform Admin belongs to none:
    // they stay at platform level until they explicitly enter an institution to manage it.
    const implied = institutions.length === 1 && !user?.isPlatformAdmin ? institutions[0] : undefined;
    const active = chosen ?? implied ?? null;
    return {
      institutions,
      active,
      roles: user ? rolesIn(user, active?.id ?? null) : [],
      needsSelection:
        data !== null && active === null && institutions.length > 1 && !user?.isPlatformAdmin,
      // Only the first load: during a `reload` the list stays usable, so pages keep their state
      isLoading: isLoading && data === null,
      error,
      select: selection.set,
      clear,
      reload,
    };
  }, [data, selectedId, user, isLoading, error, clear, reload]);

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
