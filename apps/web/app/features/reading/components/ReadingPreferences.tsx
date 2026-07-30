"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/app/utils/cn";

const STORAGE_KEY = "reading-display-preferences";
const PREFERENCES_EVENT = "reading-preferences-change";

export type ReadingDisplayPreferences = {
  fontScale: "normal" | "large" | "extra-large";
  lineHeight: "comfortable" | "relaxed";
};

const defaults: ReadingDisplayPreferences = {
  fontScale: "normal",
  lineHeight: "comfortable",
};
const defaultSnapshot = JSON.stringify(defaults);

function isPreferences(value: unknown): value is ReadingDisplayPreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReadingDisplayPreferences>;
  return (
    ["normal", "large", "extra-large"].includes(candidate.fontScale ?? "") &&
    ["comfortable", "relaxed"].includes(candidate.lineHeight ?? "")
  );
}

type ReadingPreferencesProps = {
  value: ReadingDisplayPreferences;
  onChange: (value: ReadingDisplayPreferences) => void;
};

export function useReadingPreferences() {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(PREFERENCES_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(PREFERENCES_EVENT, onStoreChange);
      };
    },
    () => window.localStorage.getItem(STORAGE_KEY) ?? defaultSnapshot,
    () => defaultSnapshot
  );
  let preferences = defaults;
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (isPreferences(parsed)) preferences = parsed;
  } catch {
    preferences = defaults;
  }

  const setPreferences = useCallback((next: ReadingDisplayPreferences) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(PREFERENCES_EVENT));
    } catch {
      // Reading preferences are optional; storage may be unavailable.
    }
  }, []);

  return [preferences, setPreferences] as const;
}

export function ReadingPreferences({
  value,
  onChange,
}: ReadingPreferencesProps) {
  const t = useTranslations("reading.preferences");
  const fontOptions = [
    { value: "normal" as const, label: t("fontNormal") },
    { value: "large" as const, label: t("fontLarge") },
    { value: "extra-large" as const, label: t("fontExtraLarge") },
  ];
  const lineOptions = [
    { value: "comfortable" as const, label: t("lineComfortable") },
    { value: "relaxed" as const, label: t("lineRelaxed") },
  ];

  return (
    <aside
      aria-label={t("title")}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {t("title")}
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">
            {t("fontSize")}
          </p>
          <div className="flex flex-wrap gap-2">
            {fontOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={value.fontScale === option.value}
                onClick={() => onChange({ ...value, fontScale: option.value })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
                  value.fontScale === option.value
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">
            {t("lineHeight")}
          </p>
          <div className="flex flex-wrap gap-2">
            {lineOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={value.lineHeight === option.value}
                onClick={() => onChange({ ...value, lineHeight: option.value })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
                  value.lineHeight === option.value
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
