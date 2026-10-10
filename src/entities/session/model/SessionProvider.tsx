"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "@/shared/api";
import { restoreSession } from "../api/restore-session";
import type { AuthResponse, SessionUser } from "./types";

type SessionState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: SessionUser };

type SessionContextValue = SessionState & {
  establish(response: AuthResponse): void;
  clear(): void;
  /** Re-reads the user from the server after something changed their profile. */
  reload(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const LOADING: SessionState = { status: "loading", user: null };
const ANONYMOUS: SessionState = { status: "anonymous", user: null };

/**
 * Holds the signed-in user. The access token itself lives only in the API
 * client's memory, so a page load starts by restoring it from the refresh cookie.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(LOADING);

  const establish = useCallback((response: AuthResponse) => {
    apiClient.setAccessToken(response.accessToken);
    setState({ status: "authenticated", user: response.user });
  }, []);

  const clear = useCallback(() => {
    apiClient.setAccessToken(null);
    setState(ANONYMOUS);
  }, []);

  const reload = useCallback(async () => {
    const user = await apiClient.request<SessionUser>("/auth/me");
    setState({ status: "authenticated", user });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void restoreSession().then((response) => {
      if (cancelled) {
        return;
      }
      // A sign-in may have completed while the restore request was in flight; it wins
      if (apiClient.getAccessToken() !== null) {
        return;
      }
      if (response) {
        establish(response);
      } else {
        setState(ANONYMOUS);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [establish]);

  useEffect(
    // The client drops the token when a refresh fails mid-session; mirror that here
    () => apiClient.subscribe((token) => token === null && setState(ANONYMOUS)),
    [],
  );

  const value = useMemo(
    () => ({ ...state, establish, clear, reload }),
    [state, establish, clear, reload],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}
