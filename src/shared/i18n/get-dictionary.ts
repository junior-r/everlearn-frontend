import "server-only";
import type { Dictionary, Locale } from "./config";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  es: () => import("./dictionaries/es.json").then((module) => module.default),
  en: () => import("./dictionaries/en.json").then((module) => module.default),
};

/** Loads one locale's dictionary on the server, so unused languages never reach the browser. */
export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
