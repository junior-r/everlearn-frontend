"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { localizedPath, type Dictionary, type Locale } from "./config";

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface DictionaryProviderProps extends I18nContextValue {
  children: ReactNode;
}

/** Hands the dictionary the server loaded for this locale to Client Components. */
export function DictionaryProvider({ locale, dictionary, children }: DictionaryProviderProps) {
  const value = useMemo(() => ({ locale, dictionary }), [locale, dictionary]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("i18n hooks must be used inside DictionaryProvider");
  }
  return context;
}

export const useDictionary = (): Dictionary => useI18n().dictionary;
export const useLocale = (): Locale => useI18n().locale;

/** Navigation that keeps the current locale: `replace("/login")` and `push("/login")` go to `/es/login`. */
export function useLocalizedRouter() {
  const router = useRouter();
  const locale = useLocale();
  const replace = useCallback(
    (path: string) => router.replace(localizedPath(locale, path)),
    [router, locale],
  );
  const push = useCallback(
    (path: string) => router.push(localizedPath(locale, path)),
    [router, locale],
  );
  return useMemo(() => ({ replace, push }), [replace, push]);
}
