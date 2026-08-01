# TOEIC Reading Backend Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist account-owned TOEIC Reading drafts in PostgreSQL, restore them in sessions, and show truthful card progress.

**Architecture:** A single JSON snapshot row is owned by `(user, test, scope)`. API use cases validate all question and option ownership before atomic upsert; Web loads and serially autosaves complete snapshots through the existing authenticated transport.

**Tech Stack:** PostgreSQL, Prisma 7, NestJS, class-validator, Next.js 16, React Query, React 19, TypeScript, Node test runner.

## Global Constraints

- Full Test, Part 5, Part 6, and Part 7 drafts are independent.
- The authenticated user ID comes only from JWT request context.
- Autosave occurs after answer, review, or active-question changes.
- Saves for one draft are serialized and may collapse queued work to the newest complete snapshot.
- Draft expiry is 30 days after the latest save.
- Successful submission deletes the matching draft.
- No localStorage fallback, token storage, correctness data, or question-content copies.
- Do not commit, push, migrate, or write the database automatically.

---

### Task 1: Shared draft contracts and persistence schema

**Files:**

- Modify: `packages/shared/src/types/toeic-reading.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260731210000_add_toeic_reading_drafts/migration.sql`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-draft-migration.spec.ts`

**Interfaces:**

- Produce `ToeicReadingDraftAnswer`
- Produce `ToeicReadingDraft`
- Produce `ToeicReadingDraftPayload`
- Produce `ToeicReadingDraftProgress`
- Extend `ToeicReadingTestSummary.draftProgress`

- [ ] **Step 1: Write a failing migration test**

Assert the SQL creates `toeic_reading_drafts`, JSON answers, integer review IDs,
30-day expiry storage, user/test cascading foreign keys, scope check, unique
`(user_id, test_id, scope)`, and expiry/user indexes.

- [ ] **Step 2: Verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-draft-migration.spec.ts
```

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Add contracts, Prisma model, relations, and migration**

Use scope values `FULL`, `PART_5`, `PART_6`, and `PART_7`. Store `answers` as
`Json`, `review_question_ids` as `Int[]`, and timestamps as PostgreSQL
`TIMESTAMP(6)`.

- [ ] **Step 4: Generate and verify**

```powershell
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api exec dotenv -e ../../.env -- prisma validate
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-draft-migration.spec.ts
```

Expected: schema valid and migration test PASS. Do not deploy the migration.

### Task 2: Draft validation and authenticated API

**Files:**

- Modify: `apps/api/src/module/toeic-reading/dto/toeic-reading.dto.ts`
- Create: `apps/api/src/module/toeic-reading/toeic-reading-draft.mapper.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/get-toeic-reading-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/save-toeic-reading-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/delete-toeic-reading-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-draft.use-cases.spec.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.controller.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.module.ts`
- Modify: `apps/api/src/module/toeic-reading/tests/toeic-reading.controller.spec.ts`

**Interfaces:**

- `draftScope(part?: ToeicReadingPart): "FULL" | "PART_5" | "PART_6" | "PART_7"`
- `GetToeicReadingDraftUseCase.execute(userId, testId, part)`
- `SaveToeicReadingDraftUseCase.execute(userId, testId, payload)`
- `DeleteToeicReadingDraftUseCase.execute(userId, testId, part)`

- [ ] **Step 1: Write failing use-case tests**

Cover account/scope identity, expired deletion, version conflict, duplicate
question/review rejection, foreign question/option rejection, and valid atomic
upsert with a refreshed 30-day expiry.

- [ ] **Step 2: Verify RED**

Run the new focused use-case test and expect missing implementations.

- [ ] **Step 3: Implement DTO and use cases**

Limit answer and review arrays to 100 entries. Query published test questions
and option IDs, validate the complete snapshot, and only then upsert. Mapper
returns ISO timestamps and typed JSON answers.

- [ ] **Step 4: Write controller tests**

Require:

```text
GET tests/:testId/draft
PUT tests/:testId/draft
DELETE tests/:testId/draft
```

Assert every call forwards `CurrentUserId` and never accepts a payload user ID.

- [ ] **Step 5: Register endpoints and providers**

Use the existing class-level `UserJwtGuard`, `ParseIntPipe`, Part query DTO, and
new draft payload DTO.

- [ ] **Step 6: Verify Task 2**

Run draft use-case, controller, typecheck, and lint gates.

### Task 3: Test-list progress and submission cleanup

**Files:**

- Modify: `apps/api/src/module/toeic-reading/use-cases/list-toeic-reading-tests.use-case.ts`
- Modify: `apps/api/src/module/toeic-reading/tests/toeic-reading-read.use-cases.spec.ts`
- Modify: `apps/api/src/module/toeic-reading/use-cases/submit-toeic-reading-attempt.use-case.ts`
- Modify: `apps/api/src/module/toeic-reading/tests/submit-toeic-reading-attempt.use-case.spec.ts`

**Interfaces:**

- Test summaries return matching `draftProgress`.
- New and idempotently retried successful submissions delete matching scope.

- [ ] **Step 1: Write failing list tests**

Provide Full and Part draft fixtures, assert only the selected scope contributes
progress, expired or source-version-mismatched drafts map to `null`, and total
count comes from the selected test projection.

- [ ] **Step 2: Implement list projection and mapping**

Select only the authenticated user's matching scope row. Return answered count
from validated JSON length and current question/updated time.

- [ ] **Step 3: Write failing submission-cleanup tests**

Assert `deleteMany` runs inside the successful create transaction and after an
identical idempotent retry, while validation/version failures preserve drafts.

- [ ] **Step 4: Implement cleanup**

Use the same scope helper as draft endpoints. Keep attempt creation and draft
deletion in one transaction for new attempts.

- [ ] **Step 5: Verify Task 3**

Run focused read and submission suites, API typecheck, and lint.

### Task 4: Web draft resource and serialized autosave

**Files:**

- Modify: `apps/web/app/features/toeic-reading/api/toeic-reading.api.ts`
- Modify: `apps/web/app/features/toeic-reading/tests/toeic-reading.api.test.ts`
- Modify: `apps/web/app/features/toeic-reading/hooks/use-toeic-reading.ts`
- Create: `apps/web/app/features/toeic-reading/toeic-reading-draft-queue.ts`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-reading-draft-queue.test.ts`

**Interfaces:**

- `toeicReadingApi.draft(testId, part)`
- `toeicReadingApi.saveDraft(testId, payload)`
- `toeicReadingApi.deleteDraft(testId, part)`
- `useToeicReadingDraft`
- `useSaveToeicReadingDraft`
- A queue that serializes saves and replaces pending snapshots with the newest.

- [ ] **Step 1: Write failing API path/key tests**

Extend the mock transport with `put` and `delete`; assert exact draft endpoints,
Part queries, bodies, and query keys.

- [ ] **Step 2: Implement resource methods and hooks**

Keep draft keys under `["toeic-reading", "draft", testId, scope]`. Submission
success removes the matching draft cache and invalidates all scoped test lists.

- [ ] **Step 3: Write failing queue tests**

Use controlled promises to prove only one request is active, rapid queued saves
collapse to the newest snapshot, and an error does not block the next save.

- [ ] **Step 4: Implement queue**

Keep the queue framework-neutral and feature-owned. It accepts complete
snapshots and an async persistence function.

- [ ] **Step 5: Verify Task 4**

Run focused resource/queue tests, Web typecheck, and lint.

### Task 5: Session restore, autosave, and card progress

**Files:**

- Modify: `apps/web/app/features/toeic-reading/toeic-reading-session-state.ts`
- Modify: `apps/web/app/features/toeic-reading/tests/toeic-reading-session-state.test.ts`
- Modify: `apps/web/app/views/toeic-reading/ToeicReadingSessionView.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicReadingListView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/app/features/toeic-reading/tests/toeic-reading-messages.test.ts`
- Modify: `apps/web/test/toeic-reading-architecture.test.ts`

**Interfaces:**

- `restoreToeicReadingSessionState(draft, questionIds)`
- Cards consume `testItem.draftProgress`.

- [ ] **Step 1: Write failing restoration tests**

Assert a valid draft restores answers, review IDs, and active question once;
unknown IDs are ignored defensively.

- [ ] **Step 2: Implement restoration helper**

Convert the draft answer array to the existing answer record without changing
the interactive state shape.

- [ ] **Step 3: Write failing UI/message tests**

Require localized save failure, saving/saved status, progress, answered,
remaining, and Continue labels. Protect progressbar ARIA values and
`draftProgress` use in the card.

- [ ] **Step 4: Implement session draft lifecycle**

Wait for Test and draft queries, initialize once, then create the serialized
queue. Every later state transition enqueues a full payload. Do not autosave the
initial empty state before restoration. Keep local state after save errors.

- [ ] **Step 5: Implement card presentation**

Render `{answered}/{total}`, a proportional emerald bar, answered and remaining
counts, and `Continue test` when draft progress exists. Preserve latest attempt
score as separate information.

- [ ] **Step 6: Verify Task 5**

Run state, message, architecture, resource tests, Web typecheck, lint, and
format.

### Task 6: Documentation and full verification

**Files:**

- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/features-overview.md`

- [ ] **Step 1: Document current behavior**

Record backend ownership, authenticated scope identity, 30-day expiry,
serialized client autosave, restoration, card progress, and submit cleanup.

- [ ] **Step 2: Run full gates**

```powershell
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
pnpm exec prettier --check apps/api/src/module/toeic-reading apps/web/app/features/toeic-reading apps/web/app/views/toeic-reading apps/web/app/messages/en.json apps/web/app/messages/vi.json packages/shared/src/types/toeic-reading.ts docs/architecture/api.md docs/architecture/frontend.md docs/features-overview.md
git diff --check
git status --short
```

Expected: all commands exit zero. Report the migration command to the operator;
do not apply it automatically.
