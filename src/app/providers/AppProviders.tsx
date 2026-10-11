"use client";

import { Suspense, type ReactNode } from "react";
import { ActiveInstitutionProvider } from "@/entities/institution";
import { SessionProvider } from "@/entities/session";
import { AIChatWidget } from "@/widgets/ai-chat";
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
          {/* After the page, so it floats above it; it reads the pathname too */}
          <Suspense>
            <AIChatWidget />
          </Suspense>
        </ActiveInstitutionProvider>
      </SessionProvider>
    </DictionaryProvider>
  );
}
