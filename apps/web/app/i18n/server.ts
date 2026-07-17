import "server-only";

import { getLocale } from "next-intl/server";

import { defaultLocale, isLocale } from "@/app/i18n/config";
import { withLocale } from "@/app/i18n/paths";

export const getLocalizedPath = async (path: string) => {
  const currentLocale = await getLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;
  return withLocale(path, locale);
};
