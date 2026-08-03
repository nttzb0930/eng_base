# Admin Typed Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the arbitrary Admin setting editor with the approved eight-policy typed Settings contract and make each policy affect its real backend consumer without changing the database schema.

**Architecture:** Shared owns compile-time wire shapes only. API Settings owns storage keys, defaults, parsing, validation, serialization, effective reads, and transactional partial updates. Progress, Practice, Review, and Auth consume the Settings public Interface. Admin uses its Auth-owned transport, React Query, React Hook Form, Zod, and the Plan 1 Shadcn foundation.

**Tech Stack:** NestJS, Prisma, class-validator, Next.js 16, React Query, React Hook Form, Zod 4, Shadcn Tabs/Select/Switch, Node test runner.

## Global constraints

- Keep `system_settings` unchanged; do not run Prisma migration, seed, push, reset, or any database-write command.
- Expose only the eight approved policies. Environment variables, credentials, CORS, providers, mail, rate limits, and database configuration remain outside Admin Settings.
- Preserve `GET/POST /admin/settings/MAX_HEARTS` while the UI migrates, but reject unknown legacy keys and invalid values.
- New HTTP paths are `GET /admin/settings` and `PUT /admin/settings`; PUT is partial and upserts only present fields in one transaction.
- Invalid or absent persisted values resolve to safe defaults.
- Preserve existing Auth login/recovery behavior, Practice routes, Review routes, Progress routes, query-key roots, and response envelopes.
- Settings changes affect newly composed sessions only and do not rewrite historical or active session records.

---

### Task 1: Add the Shared Settings wire contract

**Files:**

- Create: `packages/shared/src/types/setting.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/test/shared-root-interface.test.ts`

- [ ] Add a failing root-Interface test that imports `SystemSettings` and `UpdateSystemSettingsPayload` from `@repo/shared` and type-checks the exact eight camelCase fields.
- [ ] Define `SystemSettings` with seven integer fields and `registrationEnabled: boolean`.
- [ ] Define `UpdateSystemSettingsPayload = Partial<SystemSettings>`.
- [ ] Export declarations only through the existing Shared barrels; do not add runtime schemas or storage keys.
- [ ] Run `pnpm --filter @repo/shared test` and `pnpm --filter @repo/shared check-types`.
- [ ] Commit as `feat(shared): add typed system settings contract`.

### Task 2: Build the Settings registry and effective reader

**Files:**

- Create: `apps/api/src/module/settings/system-setting.registry.ts`
- Create: `apps/api/src/module/settings/system-settings.reader.ts`
- Create: `apps/api/src/module/settings/tests/system-setting.registry.spec.ts`
- Create: `apps/api/src/module/settings/tests/system-settings.reader.spec.ts`
- Modify: `apps/api/src/module/settings/settings.module.ts`
- Modify: `apps/api/src/module/settings/index.ts`

- [ ] Write failing tests for all defaults, numeric boundaries, boolean parsing, malformed persisted fallback, storage-key mapping, and complete effective reads.
- [ ] Keep a single API-local registry mapping the eight wire fields to their uppercase storage keys, defaults, parser, serializer, and ranges.
- [ ] Export `SystemSettingsReader` from the Settings public Interface. It provides `get(field)` and `getAll()` and is the only Interface other backend capabilities use.
- [ ] Query only registered keys; unknown database rows never enter the response.
- [ ] Register and export the reader from `SettingsModule`.
- [ ] Run focused Settings tests, API typecheck, and lint.
- [ ] Commit as `feat(api): add typed settings registry`.

### Task 3: Add bulk Admin HTTP delivery and safe legacy compatibility

**Files:**

- Create: `apps/api/src/module/settings/dto/update-system-settings.dto.ts`
- Create: `apps/api/src/module/settings/use-cases/get-system-settings.use-case.ts`
- Create: `apps/api/src/module/settings/use-cases/update-system-settings.use-case.ts`
- Create: `apps/api/src/module/settings/tests/admin-settings.use-cases.spec.ts`
- Create: `apps/api/src/module/settings/tests/update-system-settings.dto.spec.ts`
- Modify: `apps/api/src/module/settings/admin-settings.controller.ts`
- Modify: `apps/api/src/module/settings/use-cases/get-setting.use-case.ts`
- Modify: `apps/api/src/module/settings/use-cases/update-setting.use-case.ts`
- Modify: `apps/api/src/module/settings/settings.module.ts`

- [ ] Write failing tests for complete GET defaults, partial transaction upserts, untouched fields, invalid DTO ranges, valid boundary values, legacy MAX_HEARTS behavior, invalid legacy values, and unknown legacy keys.
- [ ] Implement an optional-field DTO with `IsInt`, `Min`, `Max`, `IsBoolean`, and `IsOptional` at API delivery.
- [ ] Add controller `@Get()` and `@Put()` methods before the parameter routes.
- [ ] Return the complete effective object from GET and after PUT.
- [ ] Serialize only supplied partial fields and send all upserts through one Prisma `$transaction` call.
- [ ] Route legacy MAX_HEARTS parsing through the same registry. Throw stable `INVALID_SETTING_KEY` or `INVALID_SETTING_VALUE` bad requests instead of persisting arbitrary strings.
- [ ] Run focused API Settings tests, API architecture, typecheck, and lint.
- [ ] Commit as `feat(api): expose typed admin settings`.

### Task 4: Connect runtime owners to effective Settings

**Files:**

- Modify: `apps/api/src/module/progress/progress.module.ts`
- Modify: `apps/api/src/module/progress/use-cases/refill-hearts.use-case.ts`
- Delete: `apps/api/src/module/progress/use-cases/get-max-hearts.ts`
- Modify: `apps/api/src/module/practice/practice.module.ts`
- Modify: relevant `apps/api/src/module/practice/use-cases/*.ts`
- Modify: `apps/api/src/module/review/review.module.ts`
- Modify: `apps/api/src/module/review/use-cases/daily-review-source.ts`
- Modify: `apps/api/src/module/review/use-cases/get-daily-review-*.use-case.ts`
- Modify: `apps/api/src/module/auth/auth.module.ts`
- Modify: `apps/api/src/module/auth/auth-failure.ts`
- Modify: `apps/api/src/module/auth/use-cases/register-user.usecase.ts`
- Modify: focused Progress, Practice, Review, and Auth tests

- [ ] Add failing consumer tests proving configured max hearts, per-lesson size, weak-word limit, each daily-review intensity, and disabled registration.
- [ ] Import `SettingsModule` in Progress, Practice, Review, and Auth and inject `SystemSettingsReader` through its public `src/module/settings` Interface.
- [ ] Replace Progress's direct `system_settings` query with `settings.get("maxHearts")`.
- [ ] Replace Practice's static selection constants at every selection/summary boundary with the effective `practiceWordsPerLesson` and `weakWordsLimit` values. Retain defaults in the registry only.
- [ ] Replace Review's intensity ternary literals with the four effective Settings fields.
- [ ] Reject registration before persistence when `registrationEnabled` is false using stable public code `REGISTRATION_DISABLED`; leave all other Auth endpoints unchanged.
- [ ] Update test constructors with explicit Settings reader fakes. Do not hide production dependency changes behind optional injection.
- [ ] Run focused consumer tests plus API test, typecheck, lint, and architecture checks.
- [ ] Commit as `feat(api): apply runtime system settings`.

### Task 5: Migrate the Admin Settings resource and cache contract

**Files:**

- Modify: `apps/admin/app/features/settings/api/setting.api.ts`
- Modify: `apps/admin/app/features/settings/hooks/use-setting.ts`
- Modify: `apps/admin/app/features/settings/tests/setting.api.test.ts`

- [ ] Write failing tests for `GET /admin/settings`, partial `PUT /admin/settings`, typed response preservation, and legacy MAX_HEARTS compatibility.
- [ ] Import payload/response types only from the root `@repo/shared` Interface.
- [ ] Keep `settingKeys.all` as the root and add one effective-object query key without changing the root.
- [ ] Add `useSystemSettings` and `useUpdateSystemSettings`; successful PUT replaces the effective-object cache with the returned complete object.
- [ ] Keep legacy functions until later cleanup, but remove their use from the Settings UI.
- [ ] Run Admin focused tests and typecheck.
- [ ] Commit as `feat(admin): add typed settings resource`.

### Task 6: Rebuild the Settings screen on the Shadcn foundation

**Files:**

- Create: `apps/admin/app/features/settings/components/SystemSettingsScreen.tsx`
- Create: `apps/admin/app/features/settings/components/system-settings.schema.ts`
- Modify: `apps/admin/app/views/settings/SettingsView.tsx`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`

- [ ] Add failing architecture assertions that `SettingsView` is thin, the screen belongs to the Settings feature, and the view no longer contains query or form behavior.
- [ ] Define the same API ranges in an Admin-local Zod schema for immediate form feedback.
- [ ] Use React Hook Form with the complete effective Settings object as reset values.
- [ ] Build three sections: Học tập, Ôn tập, and Truy cập. Desktop uses vertical Tabs; mobile uses Select; all fields remain in one form.
- [ ] Use `PageHeader`, Card, FormField, FormActions, Input, Switch, LoadingState, ErrorState, Tabs, and Select.
- [ ] Build a partial payload from `dirtyFields`, disable save when unchanged, preserve entered values on mutation failure, reset to the returned effective object on success, and use Vietnamese Sonner copy.
- [ ] Explain that new values apply to newly started sessions. Do not display storage keys, secrets, or environment values.
- [ ] Run Admin architecture, tests, typecheck, lint, and build.
- [ ] Commit as `feat(admin): rebuild typed settings screen`.

### Task 7: Document and verify typed Settings

**Files:**

- Modify: `docs/architecture/api.md`
- Modify: `docs/guides/environment-configuration.md`
- Modify: `docs/architecture/frontend.md` only for the Settings screen ownership detail

- [ ] Document the Settings registry/read Interface, the exact safe policy boundary, bulk HTTP behavior, partial transaction rule, runtime consumers, and legacy MAX_HEARTS compatibility.
- [ ] Make the distinction between runtime business Settings and deploy-time environment/secrets explicit in the environment guide.
- [ ] Run `pnpm --filter @repo/shared test`, Admin and API focused gates, `pnpm test`, `pnpm check-types`, `pnpm lint`, `pnpm build`, `pnpm architecture:check`, and `git diff --check`.
- [ ] If the known Web label baseline still fails, confirm it independently and report it without editing Web.
- [ ] Commit as `docs: define typed system settings ownership`.

Plan 2 is complete only when the eight-policy form, bulk API, safe storage registry, and all four runtime owners use the typed Settings Interface.
