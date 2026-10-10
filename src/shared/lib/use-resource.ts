"use client";

import { useCallback, useEffect, useState } from "react";
import { errorCode } from "@/shared/api";

export interface Resource<T> {
  data: T | null;
  /** Backend error code of the last failed load, or null. */
  error: string | null;
  isLoading: boolean;
  reload(): void;
}

interface Settled<T> {
  // Which request this result answers, so a newer request shows as loading
  load: () => Promise<T>;
  version: number;
  data: T | null;
  error: string | null;
}

/**
 * Loads data when the component mounts and whenever `load` changes, and
 * exposes `reload` for after a mutation. Pass a memoized `load` (useCallback),
 * or null to skip loading until its inputs are known. The previous data stays
 * visible while a reload is in flight.
 */
export function useResource<T>(load: (() => Promise<T>) | null): Resource<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!load) {
      return;
    }
    let cancelled = false;
    load()
      .then((data) => !cancelled && setSettled({ load, version, data, error: null }))
      .catch(
        (caught: unknown) =>
          !cancelled &&
          setSettled((previous) => ({
            load,
            version,
            data: previous?.data ?? null,
            error: errorCode(caught),
          })),
      );
    return () => {
      cancelled = true;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const isLoading = load !== null && (settled?.load !== load || settled.version !== version);
  return {
    data: settled?.data ?? null,
    error: isLoading ? null : (settled?.error ?? null),
    isLoading,
    reload,
  };
}
