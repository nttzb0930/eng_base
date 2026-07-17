export const locales = ["vi", "en"] as const;
export const defaultLocale = "vi";

export type Locale = (typeof locales)[number];

export const isLocale = (value: string): value is Locale => {
  return locales.includes(value as Locale);
};
