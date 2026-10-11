"use client";

import { Suspense, type ReactNode } from "react";
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
          {/* It reads the pathname, which is unknown while a route with a dynamic segment prerenders */}
          <Suspense>
            <SessionRouting />
          </Suspense>
          {children}
        </ActiveInstitutionProvider>
      </SessionProvider>
    </DictionaryProvider>
  );
}
