import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

import { defaultLocale, isLocale } from "@/app/i18n/config";
import { LOCALE_REQUEST_HEADER } from "@/app/i18n/request-header";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const headerLocale = (await headers()).get(LOCALE_REQUEST_HEADER) ?? "";
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
