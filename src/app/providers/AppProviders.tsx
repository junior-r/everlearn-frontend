"use client";

import type { ReactNode } from "react";
import { ActiveInstitutionProvider } from "@/entities/institution";
import { SessionProvider } from "@/entities/session";
import { DictionaryProvider, type Dictionary, type Locale } from "@/shared/i18n";
import { SessionRouting } from "./SessionRouting";

interface AppProvidersProps {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}

export function AppProviders({ locale, dictionary, children }: AppProvidersProps) {
  return (
    <DictionaryProvider locale={locale} dictionary={dictionary}>
      <SessionProvider>
        <ActiveInstitutionProvider>
          <SessionRouting />
          {children}
        </ActiveInstitutionProvider>
      </SessionProvider>
    </DictionaryProvider>
  );
}
