const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export interface CookieStore {
  get(): string | null;
  set(value: string | null): void;
  /** For `useSyncExternalStore`: calls back whenever `set` changes the value in this tab. */
  subscribe(listener: () => void): () => void;
}

/**
 * A single readable-by-script cookie as a tiny store. Only for non-secret UI
 * preferences: anything here can be read and changed by the user.
 */
export function createCookieStore(name: string): CookieStore {
  const listeners = new Set<() => void>();

  function get(): string | null {
    if (typeof document === "undefined") {
      return null;
    }
    const prefix = `${name}=`;
    const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  }

  function set(value: string | null): void {
    document.cookie =
      value === null
        ? `${name}=; Path=/; Max-Age=0; SameSite=Lax`
        : `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    listeners.forEach((listener) => listener());
  }

  return {
    get,
    set,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
