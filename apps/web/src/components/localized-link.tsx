"use client";

import { forwardRef, type ComponentProps } from "react";

import NextLink from "next/link";
import { useLocale } from "next-intl";

import { defaultLocale, isLocale } from "@/src/lib/i18n/config";
import { shouldSkipLocalePrefix, withLocale } from "@/src/lib/i18n/paths";

type LocalizedLinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

export const LocalizedLink = forwardRef<
  HTMLAnchorElement,
  LocalizedLinkProps
>(({ href, ...props }, ref) => {
  const currentLocale = useLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;
  const localizedHref =
    href.startsWith("/") && !shouldSkipLocalePrefix(href)
      ? withLocale(href, locale)
      : href;

  return <NextLink ref={ref} href={localizedHref} {...props} />;
});

LocalizedLink.displayName = "LocalizedLink";
