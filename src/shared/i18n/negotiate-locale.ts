import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Picks the best supported locale from an Accept-Language header, honouring
 * its quality weights. Falls back to the default locale (Spanish).
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }
  const preferences = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag, ...params] = entry.trim().split(";");
      const quality = params.find((param) => param.trim().startsWith("q="));
      const weight = quality ? Number(quality.trim().slice(2)) : 1;
      return { language: tag.trim().toLowerCase().split("-")[0], weight, index };
    })
    .filter((preference) => preference.weight > 0 && !Number.isNaN(preference.weight))
    // Equal weights keep the order the browser sent them in
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  const match = preferences.find((preference) => isLocale(preference.language));
  return match && isLocale(match.language) ? match.language : defaultLocale;
}
