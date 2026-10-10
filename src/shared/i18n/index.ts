// get-dictionary is server-only and is imported by its own path, never through this barrel
export { defaultLocale, isLocale, locales, localizedPath } from "./config";
export type { Dictionary, Locale } from "./config";
export {
  DictionaryProvider,
  useDictionary,
  useLocale,
  useLocalizedRouter,
} from "./DictionaryProvider";
export { errorMessage, format } from "./format";
export { negotiateLocale } from "./negotiate-locale";
