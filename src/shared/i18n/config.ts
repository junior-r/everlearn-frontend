import type es from "./dictionaries/es.json";

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

/** Spanish is the source of truth; the build fails if another dictionary drifts from its shape. */
export type Dictionary = typeof es;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Prefixes an app path ("/login") with the locale ("/es/login"). */
export function localizedPath(locale: Locale, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
