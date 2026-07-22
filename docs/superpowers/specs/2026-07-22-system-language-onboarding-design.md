# System Language Onboarding Design

## Goal

Add an optional system-language step at the start of first-time learner onboarding. The step appears before the existing target-language selection and lets the learner choose English or Vietnamese. English is selected by default.

## Scope

- Add a new first step to `NewUserOnboarding`, increasing the flow from four to five steps.
- Keep the existing target-language, level, goal, and intensity behavior unchanged.
- Store the browser preference only in `localStorage` under the key `locale`.
- Do not change Prisma, the database, API contracts, cookies, or account-profile data.
- Support only the existing application locales: `en` and `vi`.

## User Experience

The first onboarding card presents two accessible language choices: English and Tiếng Việt. English is selected when `localStorage.locale` is absent or invalid. The step is optional, so the learner can continue without interacting and English remains the choice.

Selecting a language writes `en` or `vi` to `localStorage` and immediately replaces the current localized URL while preserving the path, query string, and hash. The resulting route reloads the matching next-intl messages, so the full onboarding interface changes language. Returning visits read the saved preference after client hydration and reconcile the localized URL when necessary.

Because `localStorage` is unavailable to the server, the initial server response may use the URL/default locale before the client applies the stored preference. This is an accepted limitation of the localStorage-only requirement.

## Architecture

- `SystemLanguageStep` belongs to the Placement Test capability under `apps/web/app/features/placement-test/onboarding`.
- A small locale-preference helper belongs under `apps/web/app/i18n` because persistence and localized-path reconciliation are cross-cutting i18n behavior.
- A focused client synchronizer is mounted once from the localized layout. After hydration it reads the preference and replaces the current URL only when the stored locale differs, preventing redirect loops.
- The helper validates stored values and falls back to `en`; unsupported or malformed values must never be used to construct a route.
- Locale switching uses the existing `withLocale` path helper and Next.js router instead of hand-building locale prefixes.
- Both message catalogs receive matching keys for the new step and the progress label changes to five total steps.

## Onboarding State Compatibility

New onboarding saves include `flowVersion: 2` in the existing JSON onboarding data. When `flowVersion` is absent and the saved legacy step is greater than one, the client shifts that step forward once to preserve its meaning in the five-step flow. A session at legacy step one starts at the new system-language step; no completed selection existed to lose because the current client saves only when advancing. This prevents an unfinished learner from seeing the wrong screen after the new step is introduced without changing the API contract.

The system locale itself is not sent to the onboarding API and is not included in `onboarding_data`; it remains browser-local by design.

## Accessibility and Interaction

- Use semantic buttons with visible selected state and `aria-pressed`.
- Maintain keyboard operation and a minimum 44px target size.
- Do not rely only on flag imagery or color to communicate the selection.
- Preserve the current responsive onboarding card, focus treatment, motion behavior, and logout/navigation controls.

## Failure Handling

If `localStorage` is unavailable, the flow continues with English for the current session. A failed storage write must not block onboarding or locale navigation. Invalid stored values are ignored and replaced by the English default when storage is writable.

## Verification

- Unit-test locale validation, English fallback, storage read/write failure handling, and localized-path replacement.
- Test that the new first step renders English and Vietnamese, defaults to English, and never disables Next.
- Test that selecting a language persists it and requests the matching localized URL.
- Test five-step progress and legacy four-step resume mapping.
- Verify English and Vietnamese message catalogs expose matching paths.
- Run the narrow Web tests, type check, lint, architecture check, and build required by the repository verification guide.
