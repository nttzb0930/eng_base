import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

import { defaultLocale, isLocale } from "@/src/lib/i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const headerLocale = (await headers()).get("x-lingo-locale") ?? "";
  const candidateLocale = requestedLocale ?? "";
  const locale = isLocale(candidateLocale)
    ? candidateLocale
    : isLocale(headerLocale)
      ? headerLocale
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
