"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  buildLocalePreferencePath,
  getBrowserLocaleStorage,
  readLocalePreference,
} from "@/app/i18n/locale-preference";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

export function LocalePreferenceSync() {
  const locale = useCurrentLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const preferredLocale = readLocalePreference(getBrowserLocaleStorage());
    if (preferredLocale === locale) return;

    router.replace(
      buildLocalePreferencePath(
        pathname,
        window.location.search,
        window.location.hash,
        preferredLocale,
      ),
    );
  }, [locale, pathname, router]);

  return null;
}
