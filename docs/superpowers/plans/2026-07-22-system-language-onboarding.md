# System Language Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, English-default system-language step before target-language selection and remember `en` or `vi` in browser localStorage.

**Architecture:** Keep locale preference behavior in Web i18n infrastructure, mount one client synchronizer from the localized layout, and keep the visual choice inside Placement Test onboarding. Preserve the existing API by versioning the existing JSON onboarding data and translating legacy four-step positions into the new five-step flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, next-intl, Tailwind CSS, Node test runner through `tsx`.

## Global Constraints

- Store the preference only in `localStorage` with the exact key `locale`.
- Supported values are exactly `en` and `vi`; missing, inaccessible, or invalid storage falls back to `en`.
- Do not change Prisma, database migrations, API endpoints, cookies, or account-profile data.
- Locale replacement must preserve pathname, query string, and hash.
- The new step is optional and English is selected by default.
- Do not stage or overwrite pre-existing user changes, especially the already modified `apps/web/app/messages/en.json` and `apps/web/app/messages/vi.json` files.

---

## File Structure

- `apps/web/app/i18n/locale-preference.ts`: validate, read, write, and construct localized preference paths without React.
- `apps/web/app/components/LocalePreferenceSync.tsx`: reconcile the saved browser preference with the localized URL after hydration.
- `apps/web/app/[locale]/layout.tsx`: mount the synchronizer inside `NextIntlClientProvider`.
- `apps/web/test/locale-preference.test.ts`: pure behavior tests for localStorage and path handling.
- `apps/web/app/features/placement-test/onboarding/onboarding-flow.ts`: own five-step constants, message-key mapping, and legacy resume normalization.
- `apps/web/app/features/placement-test/onboarding/SystemLanguageStep.tsx`: render the accessible English/Vietnamese choice.
- `apps/web/app/features/placement-test/onboarding/NewUserOnboarding.tsx`: compose five steps and perform immediate locale changes.
- `apps/web/app/features/placement-test/types/placement-test.types.ts`: add the local `flowVersion` field to onboarding JSON data.
- `apps/web/app/messages/en.json` and `apps/web/app/messages/vi.json`: add matching system-language copy and update progress totals.
- `apps/web/test/system-language-onboarding.test.ts`: characterize flow compatibility, message parity, and accessible component structure.

### Task 1: Browser Locale Preference Infrastructure

**Files:**
- Create: `apps/web/app/i18n/locale-preference.ts`
- Create: `apps/web/app/components/LocalePreferenceSync.tsx`
- Modify: `apps/web/app/[locale]/layout.tsx`
- Test: `apps/web/test/locale-preference.test.ts`

**Interfaces:**
- Consumes: `isLocale`, `Locale`, and `withLocale` from the existing i18n modules.
- Produces: `LOCALE_STORAGE_KEY`, `DEFAULT_PREFERRED_LOCALE`, `getBrowserLocaleStorage()`, `readLocalePreference(storage)`, `writeLocalePreference(storage, locale)`, and `buildLocalePreferencePath(pathname, search, hash, locale)`.

- [ ] **Step 1: Write failing preference tests**

Create `apps/web/test/locale-preference.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLocalePreferencePath,
  readLocalePreference,
  writeLocalePreference,
} from "../app/i18n/locale-preference";

const memoryStorage = (initial?: string) => {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
    value: () => value,
  };
};

test("locale preference defaults invalid or missing storage to English", () => {
  const missing = memoryStorage();
  const invalid = memoryStorage("fr");

  assert.equal(readLocalePreference(missing), "en");
  assert.equal(missing.value(), "en");
  assert.equal(readLocalePreference(invalid), "en");
  assert.equal(invalid.value(), "en");
});

test("locale preference reads and writes supported locales", () => {
  const storage = memoryStorage("vi");

  assert.equal(readLocalePreference(storage), "vi");
  writeLocalePreference(storage, "en");
  assert.equal(storage.value(), "en");
});

test("locale preference survives unavailable browser storage", () => {
  const unavailable = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };

  assert.equal(readLocalePreference(unavailable), "en");
  assert.doesNotThrow(() => writeLocalePreference(unavailable, "vi"));
});

test("locale preference path replaces locale and preserves URL suffixes", () => {
  assert.equal(
    buildLocalePreferencePath("/vi/placement-test", "?from=signup", "#language", "en"),
    "/en/placement-test?from=signup#language",
  );
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/locale-preference.test.ts
```

Expected: FAIL because `app/i18n/locale-preference.ts` does not exist.

- [ ] **Step 3: Implement the pure locale preference helper**

Create `apps/web/app/i18n/locale-preference.ts`:

```ts
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
  return withLocale(`${pathname}${search}${hash}`, locale);
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the command from Step 2.

Expected: four passing tests.

- [ ] **Step 5: Add the hydration-time synchronizer**

Create `apps/web/app/components/LocalePreferenceSync.tsx`:

```tsx
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
```

Import `LocalePreferenceSync` into `apps/web/app/[locale]/layout.tsx` and render `<LocalePreferenceSync />` as the first child of `NextIntlClientProvider`, before the three existing modal components.

- [ ] **Step 6: Verify Task 1 and commit only isolated files**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/locale-preference.test.ts test/localized-paths.test.ts
pnpm --filter @repo/web check-types
git diff --check -- apps/web/app/i18n/locale-preference.ts apps/web/app/components/LocalePreferenceSync.tsx apps/web/app/[locale]/layout.tsx apps/web/test/locale-preference.test.ts
```

Expected: tests and type check pass with no whitespace errors.

Then commit only these isolated paths:

```powershell
git add -- apps/web/app/i18n/locale-preference.ts apps/web/app/components/LocalePreferenceSync.tsx 'apps/web/app/[locale]/layout.tsx' apps/web/test/locale-preference.test.ts
git commit -m "feat(web): remember browser locale preference"
```

### Task 2: Five-Step Onboarding and System Language UI

**Files:**
- Create: `apps/web/app/features/placement-test/onboarding/onboarding-flow.ts`
- Create: `apps/web/app/features/placement-test/onboarding/SystemLanguageStep.tsx`
- Modify: `apps/web/app/features/placement-test/onboarding/NewUserOnboarding.tsx`
- Modify: `apps/web/app/features/placement-test/types/placement-test.types.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Test: `apps/web/test/system-language-onboarding.test.ts`

**Interfaces:**
- Consumes: locale preference functions from Task 1 and the existing Placement Test mutation/data interfaces.
- Produces: `ONBOARDING_FLOW_VERSION = 2`, `ONBOARDING_TOTAL_STEPS = 5`, `resolveInitialOnboardingStep()`, `getOnboardingStepMessageKey()`, and `SystemLanguageStep`.

- [ ] **Step 1: Write failing flow and catalog tests**

Create `apps/web/test/system-language-onboarding.test.ts` with pure flow assertions and JSON catalog checks:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  getOnboardingStepMessageKey,
  ONBOARDING_TOTAL_STEPS,
  resolveInitialOnboardingStep,
} from "../app/features/placement-test/onboarding/onboarding-flow";

const webRoot = join(import.meta.dirname, "..");

test("new onboarding has five steps and maps display messages", () => {
  assert.equal(ONBOARDING_TOTAL_STEPS, 5);
  assert.deepEqual(
    [1, 2, 3, 4, 5].map(getOnboardingStepMessageKey),
    ["systemLanguage", "step1", "step2", "step3", "step4"],
  );
});

test("onboarding resumes version two directly and shifts legacy progress", () => {
  assert.equal(resolveInitialOnboardingStep(1, undefined), 1);
  assert.equal(resolveInitialOnboardingStep(2, { selectedLangs: ["en"] }), 3);
  assert.equal(resolveInitialOnboardingStep(4, { selectedLangs: ["en"] }), 5);
  assert.equal(resolveInitialOnboardingStep(2, { flowVersion: 2 }), 2);
  assert.equal(resolveInitialOnboardingStep(99, { flowVersion: 2 }), 5);
});

test("locale catalogs expose matching system-language onboarding copy", () => {
  const en = JSON.parse(readFileSync(join(webRoot, "app/messages/en.json"), "utf8"));
  const vi = JSON.parse(readFileSync(join(webRoot, "app/messages/vi.json"), "utf8"));
  const enStep = en.placementTest.newOnboarding.systemLanguage;
  const viStep = vi.placementTest.newOnboarding.systemLanguage;

  assert.deepEqual(Object.keys(enStep).sort(), Object.keys(viStep).sort());
  assert.equal(en.placementTest.newOnboarding.stepProgress, "STEP {step} / 5");
  assert.equal(vi.placementTest.newOnboarding.stepProgress, "BƯỚC {step} / 5");
});

test("system language choices are semantic pressed buttons", () => {
  const source = readFileSync(
    join(webRoot, "app/features/placement-test/onboarding/SystemLanguageStep.tsx"),
    "utf8",
  );
  assert.match(source, /<button/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /onSelectLocale/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/system-language-onboarding.test.ts
```

Expected: FAIL because `onboarding-flow.ts` and `SystemLanguageStep.tsx` do not exist.

- [ ] **Step 3: Implement flow normalization**

Add `flowVersion?: number` to `PlacementOnboardingData`, then create `onboarding-flow.ts`:

```ts
import type { PlacementOnboardingData } from "../types/placement-test.types";

export const ONBOARDING_FLOW_VERSION = 2;
export const ONBOARDING_TOTAL_STEPS = 5;

export function resolveInitialOnboardingStep(
  initialStep?: number,
  initialData?: PlacementOnboardingData,
) {
  const boundedStep = Math.min(
    ONBOARDING_TOTAL_STEPS,
    Math.max(1, Math.trunc(initialStep ?? 1)),
  );
  if (initialData?.flowVersion === ONBOARDING_FLOW_VERSION) return boundedStep;
  return boundedStep > 1
    ? Math.min(ONBOARDING_TOTAL_STEPS, boundedStep + 1)
    : 1;
}

export function getOnboardingStepMessageKey(step: number) {
  return step === 1 ? "systemLanguage" : `step${step - 1}`;
}
```

Run the focused test again. Expected: flow assertions pass and catalog/component assertions remain RED.

- [ ] **Step 4: Implement the accessible language step**

Create `SystemLanguageStep.tsx` with the complete component:

```tsx
"use client";

import { Check, Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Locale } from "@/app/i18n/config";
import { cn } from "@/app/utils/cn";

type SystemLanguageStepProps = {
  selectedLocale: Locale;
  onSelectLocale: (locale: Locale) => void;
};

const SYSTEM_LANGUAGE_OPTIONS = [
  { locale: "en", labelKey: "english", nativeName: "English", code: "EN" },
  { locale: "vi", labelKey: "vietnamese", nativeName: "Tiếng Việt", code: "VI" },
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
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-black tracking-wider">
                  {option.code}
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
                <Languages className="h-6 w-6 text-slate-300" aria-hidden="true" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Convert `NewUserOnboarding` to five steps**

Make these exact behavioral changes:

- Initialize `step` with `resolveInitialOnboardingStep(initialStep, initialData)`.
- Initialize the UI locale to `DEFAULT_PREFERRED_LOCALE` and reconcile it from `readLocalePreference(getBrowserLocaleStorage())` in an effect.
- Add `flowVersion: ONBOARDING_FLOW_VERSION` to every existing onboarding JSON save.
- Use `ONBOARDING_TOTAL_STEPS` for progress and completion bounds.
- Resolve title/description through `getOnboardingStepMessageKey(step)`.
- Render `SystemLanguageStep` at step 1; shift existing components to steps 2–5.
- Require a target language only at step 2, so Next remains enabled at step 1.
- Complete onboarding and show the Start CTA at step 5.
- When a locale is selected, update component state, call `writeLocalePreference`, and call `router.replace(buildLocalePreferencePath(...))` only when the selection differs from the active locale.

The selection handler must preserve URL suffixes:

```ts
const handleSelectSystemLocale = (nextLocale: Locale) => {
  setSelectedSystemLocale(nextLocale);
  writeLocalePreference(getBrowserLocaleStorage(), nextLocale);
  if (nextLocale === locale) return;
  router.replace(
    buildLocalePreferencePath(
      pathname,
      window.location.search,
      window.location.hash,
      nextLocale,
    ),
  );
};
```

- [ ] **Step 6: Add exact matching translations**

Change `stepProgress` to five total steps in both catalogs and add this matching key shape under `placementTest.newOnboarding`:

```json
"systemLanguage": {
  "title": "Choose your system language",
  "desc": "You can change the language now or continue with English.",
  "english": "English",
  "vietnamese": "Vietnamese",
  "selected": "Selected"
}
```

Use natural Vietnamese equivalents in `vi.json` while preserving the exact same keys. Apply only these localized hunks and preserve all pre-existing message edits.

- [ ] **Step 7: Run Task 2 verification and confirm GREEN**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/system-language-onboarding.test.ts test/locale-preference.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
```

Expected: all focused tests pass, TypeScript reports no errors, and ESLint exits zero.

- [ ] **Step 8: Review the overlapping message diffs before staging**

Run:

```powershell
git diff -- apps/web/app/messages/en.json apps/web/app/messages/vi.json
git diff --check
git status --short
```

Expected: the locale catalogs contain existing user edits plus the new localized keys. Do not run a whole-file `git add` on those catalogs unless every shown pre-existing change is intentionally included. Leave Task 2 uncommitted if safe hunk-only staging cannot be guaranteed.

### Task 3: Full Web and Repository Verification

**Files:**
- Verify only; fix failures in the owning Task 1 or Task 2 file.

**Interfaces:**
- Consumes: the complete five-step onboarding feature.
- Produces: verification evidence for behavior, architecture, typing, lint, and production compilation.

- [ ] **Step 1: Run all Web gates**

```powershell
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Expected: every command exits zero. Fix only failures caused by this feature; report unrelated pre-existing failures with exact command output.

- [ ] **Step 2: Run repository gates that do not write data**

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

Expected: every command exits zero. Do not run database, Prisma migration, seed, vocabulary synchronization, or provider commands.

- [ ] **Step 3: Inspect final scope**

```powershell
git diff --check
git status --short
git diff -- apps/web/app/i18n/locale-preference.ts apps/web/app/components/LocalePreferenceSync.tsx 'apps/web/app/[locale]/layout.tsx' apps/web/app/features/placement-test/onboarding/onboarding-flow.ts apps/web/app/features/placement-test/onboarding/SystemLanguageStep.tsx apps/web/app/features/placement-test/onboarding/NewUserOnboarding.tsx apps/web/app/features/placement-test/types/placement-test.types.ts apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test/locale-preference.test.ts apps/web/test/system-language-onboarding.test.ts
```

Expected: no whitespace errors, no generated artifacts, no database changes, and only the planned feature hunks mixed with clearly identified pre-existing user edits.

### Task 4: Local System-Language Flag Assets

**Files:**
- Create: `apps/web/public/flags/gb.svg`
- Create: `apps/web/public/flags/vn.svg`
- Modify: `apps/web/app/features/placement-test/onboarding/SystemLanguageStep.tsx`
- Test: `apps/web/test/system-language-onboarding.test.ts`

**Interfaces:**
- Consumes: Next.js `Image` and the HatScripts `circle-flags` SVG artwork already referenced by the target-language step.
- Produces: two repository-owned public assets at `/flags/gb.svg` and `/flags/vn.svg`.

- [ ] **Step 1: Extend the structural test and confirm RED**

Assert that both files exist and that `SystemLanguageStep.tsx` imports `Image`, declares `flagSrc` values for both local paths, renders `<Image>`, and uses `alt=""` because the adjacent visible names carry the accessible label.

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/system-language-onboarding.test.ts
```

Expected: FAIL because the local assets and `next/image` rendering do not exist.

- [ ] **Step 2: Vendor the two SVG files**

Download `gb.svg` and `vn.svg` from the MIT-licensed HatScripts `circle-flags` repository into `apps/web/public/flags/`. Do not install a package and do not retain a runtime CDN URL in `SystemLanguageStep`.

- [ ] **Step 3: Render local assets with Next Image**

Import `Image` from `next/image`, replace each option's `code` with `flagSrc`, and render a 44 by 44 decorative image inside the existing icon slot. Keep visible translated and native language names, button semantics, `aria-pressed`, selection checkmark, and responsive styles unchanged.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/system-language-onboarding.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web exec eslint app/features/placement-test/onboarding/SystemLanguageStep.tsx test/system-language-onboarding.test.ts
pnpm --filter @repo/web build
```

Expected: focused tests, type-check, scoped lint, and production build all pass.
