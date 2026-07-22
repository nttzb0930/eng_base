import { isLocale, type Locale } from "@/app/i18n/config";
import { withLocale } from "@/app/i18n/paths";

export const LOCALE_STORAGE_KEY = "locale";
export const DEFAULT_PREFERRED_LOCALE: Locale = "en";

export type LocalePreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function getBrowserLocaleStorage(): LocalePreferenceStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readLocalePreference(
  storage?: LocalePreferenceStorage,
): Locale {
  try {
    const stored = storage?.getItem(LOCALE_STORAGE_KEY) ?? null;
    if (stored && isLocale(stored)) return stored;
    storage?.setItem(LOCALE_STORAGE_KEY, DEFAULT_PREFERRED_LOCALE);
  } catch {
    return DEFAULT_PREFERRED_LOCALE;
  }

  return DEFAULT_PREFERRED_LOCALE;
}

export function writeLocalePreference(
  storage: LocalePreferenceStorage | undefined,
  locale: Locale,
) {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage failure must not block navigation or onboarding.
  }
}

export function buildLocalePreferencePath(
  pathname: string,
  search: string,
  hash: string,
  locale: Locale,
) {
  return `${withLocale(`${pathname}${search}`, locale)}${hash}`;
}
