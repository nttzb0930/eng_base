# TOEIC Reading Part Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Full Test, Part 5, Part 6, and Part 7 browsing so learners choose one of ten 2026 tests and submit either 100 questions or one complete Part.

**Architecture:** Preserve each imported TOEIC test as one aggregate. Optional `part` query input projects one Part for browsing/session delivery, while nullable `practice_part` on attempts records whether grading covered one Part or the full test. Source-set display metadata flows from the approved inventory through canonical packages into `toeic_test_sets.title`.

**Tech Stack:** TypeScript, NestJS, class-validator, Prisma/PostgreSQL, Next.js 16, React, TanStack Query, next-intl, Tailwind CSS 3, Node test runner.

## Global Constraints

- Part counts remain Part 5 = 30, Part 6 = 16, Part 7 = 54.
- Part 5 is the default browser tab.
- Full Test shows all ten test cards and starts only the learner-selected test.
- Do not invent Level 1-5 or derive the year from `updatedAt`.
- Existing full-test requests and legacy attempts remain valid.
- Do not apply migrations or re-import data without explicit operator action.
- Use existing dependencies and the existing emerald learner design system.

---

### Task 1: Preserve the source-set display name

**Files:**

- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.types.ts`
- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.canonical.ts`
- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.download.ts`
- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.ts`
- Test: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.canonical.test.ts`
- Test: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.test.ts`

**Interfaces:**

- Produces: `ToeicReadingPracticeTest.sourceSetName: string`
- Consumes: `ToeicReadingInventory.sourceSet`, currently `"2026"`

- [ ] **Step 1: Write failing canonical and importer tests**

Assert that canonical content contains `sourceSetName: "2026"` and that the
Prisma store creates/updates `toeic_test_sets.title` with that value instead of
the provider UUID.

- [ ] **Step 2: Run the focused tests and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-reading-practice/toeic-reading-practice.canonical.test.ts scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.test.ts
```

Expected: failures because `sourceSetName` does not exist.

- [ ] **Step 3: Implement the canonical flow**

Add `sourceSetName` to `ToeicReadingPracticeTest`, pass
`inventory.sourceSet` into canonical construction, include it in validation and
hashing, and use it for test-set title upsert.

- [ ] **Step 4: Re-run focused tests and verify GREEN**

Run the Step 2 command. Expected: all focused tests pass.

### Task 2: Add the Part-practice persistence and Shared contract

**Files:**

- Modify: `packages/shared/src/types/toeic-reading.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260731180000_add_toeic_reading_practice_part/migration.sql`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.mapper.ts`
- Modify: `apps/api/src/module/toeic-reading/use-cases/get-toeic-reading-attempt.use-case.ts`
- Test: `apps/api/src/module/toeic-reading/tests/toeic-reading-attempt-migration.spec.ts`
- Test: `apps/api/src/module/toeic-reading/tests/toeic-reading-history.use-cases.spec.ts`

**Interfaces:**

- Produces: `practicePart: ToeicReadingPart | null` on attempt summaries/results.
- Produces: `sourceSetName: string` on test summary/detail.
- Produces: optional `practicePart` on submission payload.

- [ ] **Step 1: Write failing migration and mapper tests**

Require nullable `practice_part`, a check constraint limited to 5/6/7, a
learner/Part history index, and mapped `practicePart`.

- [ ] **Step 2: Verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-attempt-migration.spec.ts src/module/toeic-reading/tests/toeic-reading-history.use-cases.spec.ts
```

Expected: failures for the missing field and wire property.

- [ ] **Step 3: Implement schema, migration, and mapping**

Add:

```prisma
practice_part Int?
```

The SQL migration adds the nullable column, constraint
`practice_part IS NULL OR practice_part IN (5, 6, 7)`, and index
`(user_id, practice_part, submitted_at DESC)`. Select and map the field without
backfilling legacy rows.

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command and `pnpm --filter @repo/api check-types`.

### Task 3: Make learner reads Part-aware

**Files:**

- Modify: `apps/api/src/module/toeic-reading/dto/toeic-reading.dto.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.controller.ts`
- Modify: `apps/api/src/module/toeic-reading/use-cases/list-toeic-reading-tests.use-case.ts`
- Modify: `apps/api/src/module/toeic-reading/use-cases/get-toeic-reading-test.use-case.ts`
- Modify: `apps/api/src/module/toeic-reading/use-cases/list-toeic-reading-attempts.use-case.ts`
- Test: `apps/api/src/module/toeic-reading/tests/toeic-reading.dto.spec.ts`
- Test: `apps/api/src/module/toeic-reading/tests/toeic-reading.controller.spec.ts`
- Test: `apps/api/src/module/toeic-reading/tests/toeic-reading-read.use-cases.spec.ts`
- Test: `apps/api/src/module/toeic-reading/tests/toeic-reading-history.use-cases.spec.ts`

**Interfaces:**

- Consumes: optional query `{ part?: 5 | 6 | 7 }`.
- Produces: Part-scoped list/detail/history when present; full behavior when absent.

- [ ] **Step 1: Write failing DTO/controller/use-case tests**

Cover numeric transform, rejection of Parts other than 5/6/7, controller
delegation, Part-filtered question/stimulus projection, source-set name, and
latest attempt matching `practice_part`.

- [ ] **Step 2: Verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading.dto.spec.ts src/module/toeic-reading/tests/toeic-reading.controller.spec.ts src/module/toeic-reading/tests/toeic-reading-read.use-cases.spec.ts src/module/toeic-reading/tests/toeic-reading-history.use-cases.spec.ts
```

- [ ] **Step 3: Implement query delivery and projections**

Add `ToeicReadingPartQueryDto`, use `@Query()`, filter nested questions and
stimuli at Prisma where possible, scope latest attempts by `practice_part`, and
throw not found when a requested Part has no questions.

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command.

### Task 4: Grade and persist Part attempts

**Files:**

- Modify: `apps/api/src/module/toeic-reading/use-cases/toeic-reading-grading.policy.ts`
- Modify: `apps/api/src/module/toeic-reading/use-cases/submit-toeic-reading-attempt.use-case.ts`
- Test: `apps/api/src/module/toeic-reading/tests/toeic-reading-grading.policy.spec.ts`
- Test: `apps/api/src/module/toeic-reading/tests/submit-toeic-reading-attempt.use-case.spec.ts`

**Interfaces:**

- Consumes: `ToeicReadingSubmissionPayload.practicePart?: 5 | 6 | 7`.
- Persists: `practice_part`.
- Fingerprints: `{ testId, sourceVersion, practicePart, answers }`.

- [ ] **Step 1: Write failing policy/use-case tests**

Cover exact Part completeness, cross-Part answer rejection, Part-separated
fingerprints, persistence, idempotent retry, and unchanged full-test grading.

- [ ] **Step 2: Verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-grading.policy.spec.ts src/module/toeic-reading/tests/submit-toeic-reading-attempt.use-case.spec.ts
```

- [ ] **Step 3: Implement minimal Part-aware grading**

Select the eligible questions from `practicePart` before completeness checks.
Reject answers outside that set, store the Part, and include the Part in the
fingerprint. Keep omission equivalent to all test questions.

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command, then all TOEIC Reading API tests.

### Task 5: Add Part-scoped Web resources

**Files:**

- Modify: `apps/web/app/features/toeic-reading/api/toeic-reading.api.ts`
- Modify: `apps/web/app/features/toeic-reading/hooks/use-toeic-reading.ts`
- Create: `apps/web/app/features/toeic-reading/toeic-reading-scope.ts`
- Test: `apps/web/app/features/toeic-reading/tests/toeic-reading.api.test.ts`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-reading-scope.test.ts`

**Interfaces:**

- Produces UI scope: `type ToeicReadingScope = "full" | 5 | 6 | 7`.
- Produces `scopeToPart(scope): ToeicReadingPart | undefined`.
- Query keys include the normalized scope/Part.

- [ ] **Step 1: Write failing API and scope tests**

Assert `?part=5` URL construction, distinct cache keys, `full` omission, default
Part 5 parsing, and rejection/fallback for unsupported URL values.

- [ ] **Step 2: Verify RED**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading.api.test.ts app/features/toeic-reading/tests/toeic-reading-scope.test.ts
```

- [ ] **Step 3: Implement resource and scope helpers**

Parameterize tests, test detail, and attempts hooks. Invalidate both aggregate
and scoped query prefixes after successful submission.

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command and Web typecheck.

### Task 6: Build the four-scope learner UI

**Files:**

- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingScopeTabs.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicReadingListView.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicReadingSessionView.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicReadingResultView.tsx`
- Modify: `apps/web/app/[locale]/(session)/toeic/reading/tests/[testId]/page.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/test/toeic-reading-architecture.test.ts`
- Test: `apps/web/app/features/toeic-reading/tests/toeic-reading-messages.test.ts`

**Interfaces:**

- Browser query: `scope=full|5|6|7`, default `5`.
- Session API query/submission: `practicePart` omitted for Full Test, numeric for a Part.

- [ ] **Step 1: Write failing architecture/i18n assertions**

Require four semantic tabs, matching catalogs, scope-preserving card links, and
Part-aware result labels.

- [ ] **Step 2: Verify RED**

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-reading-architecture.test.ts app/features/toeic-reading/tests/toeic-reading-messages.test.ts
```

- [ ] **Step 3: Implement the browser**

Render Full Test, Part 5, Part 6, and Part 7 as keyboard-accessible links with
`aria-current`. Part 5 is default. Each scope renders the ten returned cards
with `sourceSetName / title`, scope, count, scoped score, and a link containing
the selected scope.

- [ ] **Step 4: Implement session/result scope behavior**

Parse scope in the thin route, fetch only the requested Part when applicable,
submit `practicePart`, retain scope in back navigation, and show one Part result
card for Part practice versus three cards for Full Test.

- [ ] **Step 5: Verify GREEN**

Run focused tests, Web typecheck, and Web lint.

### Task 7: Update canonical docs and run final verification

**Files:**

- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/features-overview.md`

- [ ] **Step 1: Document current behavior**

Describe Part-aware read/grading contracts, nullable attempt scope, source-set
label provenance, four browser scopes, and explicit migration/re-import
operator actions.

- [ ] **Step 2: Run API gates**

```powershell
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
```

- [ ] **Step 3: Run Web gates**

```powershell
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

- [ ] **Step 4: Validate source only**

```powershell
Set-Location apps/api
pnpm exec dotenv -e ../../.env -- prisma validate
Set-Location ../..
git diff --check
git status --short
```

Do not run migration deploy or data import during verification.
