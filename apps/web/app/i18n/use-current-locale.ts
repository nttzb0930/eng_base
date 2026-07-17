"use client";

import { useLocale } from "next-intl";

import { defaultLocale, isLocale } from "@/app/i18n/config";

export const useCurrentLocale = () => {
  const locale = useLocale();
  return isLocale(locale) ? locale : defaultLocale;
};
