# TOEIC Reading Learner API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose authenticated TOEIC Reading discovery, safe test delivery, idempotent server-side grading, and immutable learner attempt history for the ten published tests.

**Architecture:** A dedicated `module/toeic-reading` capability owns learner delivery and behavior while Prisma remains the persistence adapter. Shared publishes JSON-safe wire declarations only. Test detail uses an explicit Prisma `select` that never reads correctness or explanations; grading performs a separate server-only query and stores immutable result snapshots in one transaction.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, TypeScript 6, `class-validator`, Node test runner, `@repo/shared`.

## Global Constraints

- All learner routes require `UserJwtGuard` and explicit `CurrentUserId`.
- Only `PUBLISHED` tests are visible and submittable.
- Test detail must not include option correctness, correct labels, explanations, source authorization, or private storage paths.
- Submission includes the exact `sourceVersion` returned by detail and fails with conflict if content was replaced.
- A repeated `(userId, submissionKey)` with the same payload returns the original result; a different payload returns conflict.
- Completed results use immutable snapshots and never depend on current mutable test content.
- The migration is versioned but is not applied automatically during implementation.

---

### Task 1: Shared Wire Types and Attempt Persistence

**Files:**

- Create: `packages/shared/src/types/toeic-reading.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260731120000_add_toeic_reading_attempts/migration.sql`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-attempt-migration.spec.ts`

**Interfaces:**

- Produces: `ToeicReadingOverview`, `ToeicReadingTestSummary`, `ToeicReadingTestDetail`, `ToeicReadingSubmissionPayload`, `ToeicReadingAttemptSummary`, and `ToeicReadingAttemptResult` from root `@repo/shared`.
- Produces: Prisma models `toeic_reading_attempts` and `toeic_reading_attempt_answers`.

- [ ] **Step 1: Write a failing migration test**

Assert that the migration creates both attempt tables, a unique `(user_id, submission_key)` identity, user/test foreign keys, immutable snapshot columns, and user history indexes.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-attempt-migration.spec.ts
```

Expected: FAIL because the migration file and models do not exist.

- [ ] **Step 3: Add the shared declarations and root export**

Define Parts as `5 | 6 | 7`; keep learner option objects limited to `id`, `label`, and `text`; include `sourceVersion` in detail and submission; represent per-Part totals in both overview and result shapes.

- [ ] **Step 4: Add Prisma models and SQL migration**

Create attempts with UUID submission keys, deterministic fingerprints, version/title snapshots, totals, and timestamps. Create answer rows with question number/Part/prompt, selected/correct option label and text, explanation, and correctness snapshots. Relate attempts to Learner and TOEIC test with restrictive test deletion.

- [ ] **Step 5: Run migration test, Shared checks, and verify GREEN**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-attempt-migration.spec.ts
pnpm --filter @repo/shared architecture:check
pnpm --filter @repo/shared check-types
```

Expected: all pass without applying the migration.

### Task 2: Safe Published Test Reads

**Files:**

- Create: `apps/api/src/module/toeic-reading/toeic-reading.module.ts`
- Create: `apps/api/src/module/toeic-reading/toeic-reading.controller.ts`
- Create: `apps/api/src/module/toeic-reading/toeic-reading.mapper.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/get-toeic-reading-overview.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/list-toeic-reading-tests.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/get-toeic-reading-test.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading.controller.spec.ts`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-read.use-cases.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**

- Produces: `GET /toeic/reading/overview`, `GET /toeic/reading/tests`, and `GET /toeic/reading/tests/:testId`.
- Consumes: shared read response declarations from Task 1.

- [ ] **Step 1: Write failing controller and read-use-case tests**

Assert guarded route metadata, published-only filters, deterministic test/question ordering, accurate Part counts, user-scoped recent attempts, and `NotFoundException` for unavailable tests. Inspect the Prisma detail query and returned object to prove neither `correct` nor `explanation` is selected or exposed.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading.controller.spec.ts src/module/toeic-reading/tests/toeic-reading-read.use-cases.spec.ts
```

Expected: FAIL because the module, controller, and use cases do not exist.

- [ ] **Step 3: Implement the minimal read use cases and mapper**

Use explicit Prisma selects. Overview returns `publishedTestCount`, `totalQuestionCount`, Parts 5–7 counts, Reading availability, Listening unavailable, and the learner's recent attempt summaries. Detail groups ordered stimuli/questions while keeping standalone Part 5 questions valid.

- [ ] **Step 4: Add guarded controller/module composition**

Mount the controller at `toeic/reading`, register all read use cases, and import the module once from `AppModule`.

- [ ] **Step 5: Run focused tests, type check, and verify GREEN**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading.controller.spec.ts src/module/toeic-reading/tests/toeic-reading-read.use-cases.spec.ts
pnpm --filter @repo/api check-types
```

Expected: all pass.

### Task 3: Idempotent Grading and Immutable History

**Files:**

- Create: `apps/api/src/module/toeic-reading/dto/toeic-reading.dto.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/toeic-reading-grading.policy.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/submit-toeic-reading-attempt.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/list-toeic-reading-attempts.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/get-toeic-reading-attempt.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-grading.policy.spec.ts`
- Create: `apps/api/src/module/toeic-reading/tests/submit-toeic-reading-attempt.use-case.spec.ts`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-history.use-cases.spec.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.controller.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.module.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.mapper.ts`

**Interfaces:**

- Produces: `POST /toeic/reading/attempts`, `GET /toeic/reading/attempts`, and `GET /toeic/reading/attempts/:attemptId`.
- Consumes: `ToeicReadingSubmissionPayload`; produces `ToeicReadingAttemptResult` and user-scoped summaries.

- [ ] **Step 1: Write failing policy tests**

Cover complete valid submissions, missing/duplicate questions, options from another question, deterministic submission fingerprints, total/per-Part accuracy, and answer snapshots.

- [ ] **Step 2: Run policy tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-grading.policy.spec.ts
```

Expected: FAIL because the policy does not exist.

- [ ] **Step 3: Implement the pure grading policy**

Validate exact question coverage and option ownership before calculating results. Sort question/option identities before hashing so equivalent answer ordering produces the same fingerprint.

- [ ] **Step 4: Write failing submission and history tests**

Cover published-only lookup, source-version conflict, one-transaction snapshot persistence, identical retry, conflicting key reuse, simulated unique-key race recovery, user-scoped list/detail, and no dependence on current question rows for completed results.

- [ ] **Step 5: Run use-case tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/submit-toeic-reading-attempt.use-case.spec.ts src/module/toeic-reading/tests/toeic-reading-history.use-cases.spec.ts
```

Expected: FAIL because the goal use cases do not exist.

- [ ] **Step 6: Implement DTOs, use cases, mappers, and routes**

Validate UUID/version/answer input with Nest DTOs. Grade only after matching the current source version. Persist attempt and answer snapshots atomically. Scope history/detail queries by `user_id`.

- [ ] **Step 7: Run all TOEIC Reading tests and API gates**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test "src/module/toeic-reading/tests/*.spec.ts"
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
git diff --check
```

Expected: all pass with no database apply.
