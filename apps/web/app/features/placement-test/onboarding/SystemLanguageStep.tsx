"use client";

import { Check, Languages } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import type { Locale } from "@/app/i18n/config";
import { cn } from "@/app/utils/cn";

type SystemLanguageStepProps = {
  selectedLocale: Locale;
  onSelectLocale: (locale: Locale) => void;
};

const SYSTEM_LANGUAGE_OPTIONS = [
  {
    locale: "en",
    labelKey: "english",
    nativeName: "English",
    flagSrc: "/flags/gb.svg",
  },
  {
    locale: "vi",
    labelKey: "vietnamese",
    nativeName: "Tiếng Việt",
    flagSrc: "/flags/vn.svg",
  },
] as const;

export default function SystemLanguageStep({
  selectedLocale,
  onSelectLocale,
}: SystemLanguageStepProps) {
  const t = useTranslations("placementTest");

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 py-2 sm:grid-cols-2">
      {SYSTEM_LANGUAGE_OPTIONS.map((option) => {
        const isSelected = option.locale === selectedLocale;

        return (
          <button
            key={option.locale}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectLocale(option.locale)}
            className={cn(
              "min-h-28 rounded-2xl border-2 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
              isSelected
                ? "border-sky-500 bg-sky-50 text-sky-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-sky-300",
            )}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-slate-100 shadow-sm">
                  <Image
                    src={option.flagSrc}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 object-cover"
                  />
                </span>
                <span>
                  <span className="block text-base font-extrabold">
                    {t(`newOnboarding.systemLanguage.${option.labelKey}`)}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-slate-500">
                    {option.nativeName}
                  </span>
                </span>
              </span>

              {isSelected ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">
                    {t("newOnboarding.systemLanguage.selected")}
                  </span>
                </span>
              ) : (
                <Languages
                  className="h-6 w-6 text-slate-300"
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
