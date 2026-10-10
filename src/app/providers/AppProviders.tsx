"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/entities/session";
import { DictionaryProvider, type Dictionary, type Locale } from "@/shared/i18n";

interface AppProvidersProps {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}

export function AppProviders({ locale, dictionary, children }: AppProvidersProps) {
  return (
    <DictionaryProvider locale={locale} dictionary={dictionary}>
      <SessionProvider>{children}</SessionProvider>
    </DictionaryProvider>
  );
}
