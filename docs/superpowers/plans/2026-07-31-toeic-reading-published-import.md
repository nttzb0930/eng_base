# TOEIC Reading Published Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each valid private TOEIC Reading package as a published, Course-owned aggregate with idempotent create, skip, and transactional replacement.

**Architecture:** A hand-authored Prisma migration introduces the TOEIC content aggregate without applying it. A pure import orchestrator validates packages before delegating one aggregate at a time to a store. A Prisma adapter resolves `toeic-600` once and creates or replaces one test per transaction.

**Tech Stack:** TypeScript 6, Node test runner, Prisma 7, PostgreSQL, Zod 4, pnpm.

## Global Constraints

- Work directly on `develop`; do not create a worktree.
- Do not apply migrations, seed data, fetch source content, or run the real importer during implementation verification.
- The Course code is exactly `toeic-600`; the importer must not create it.
- Valid imports become `PUBLISHED` immediately.
- `(source, source_test_id)` is the idempotent identity.
- An unchanged `source_version` is skipped without database writes.
- A changed version atomically replaces owned content and remains published.
- Private packages and source credentials remain untracked.
- Learner API, attempts, and UI are separate plans.

---

### Task 1: Define the Course-owned TOEIC content schema

**Files:**

- Create: `apps/api/prisma/migrations/20260731040000_add_toeic_reading_content/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/module/toeic-content/tests/toeic-content-migration.spec.ts`

**Interfaces:**

- Consumes: `courses.id`.
- Produces: `toeic_test_sets`, `toeic_tests`, `toeic_stimuli`, `toeic_questions`, `toeic_question_options`, `toeic_media_assets`, and `toeic_publication_status`.

- [ ] **Step 1: Write the failing migration test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260731040000_add_toeic_reading_content/migration.sql"
);

test("creates the Course-owned TOEIC Reading aggregate", () => {
  const sql = readFileSync(migrationPath, "utf8");
  assert.match(sql, /CREATE TYPE "toeic_publication_status"/u);
  for (const table of [
    "toeic_test_sets",
    "toeic_tests",
    "toeic_stimuli",
    "toeic_questions",
    "toeic_question_options",
    "toeic_media_assets",
  ])
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`, "u"));
  assert.match(sql, /UNIQUE ("source", "source_test_id")/u);
  assert.match(sql, /FOREIGN KEY ("course_id").*"courses"/su);
  assert.match(sql, /CHECK ("part" IN (5, 6, 7))/u);
  assert.doesNotMatch(sql, /attempt|score|progress/iu);
});
```

- [ ] **Step 2: Run RED**

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-content/tests/toeic-content-migration.spec.ts
```

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Add Prisma models and relations**

Add `toeic_test_sets` with `@@unique([course_id, source, source_set_id])` and a reverse relation on `courses`. Add `toeic_tests` with `@@unique([source, source_test_id])`, a 64-character source version, `PUBLISHED` status, and `published_at`. Add owned stimuli, questions, options, and media with cascades.

Use these child identities:

```text
toeic_stimuli:          unique(test_id, source_stimulus_id)
toeic_questions:        unique(test_id, source_question_id), unique(test_id, number)
toeic_question_options: unique(question_id, label)
toeic_media_assets:     unique(test_id, source_media_id)
```

Put nullable `difficulty_level`, `error_rate`, and `total_attempts` on questions. Constrain Parts to 5-7, numbers to 101-200, labels to A-D, difficulty to 1-5, error rate to 0-100, and attempts to non-negative values.

- [ ] **Step 4: Hand-author equivalent deterministic SQL**

Create the enum, tables, checks, indexes, and foreign keys. Do not run a database command.

- [ ] **Step 5: Generate and run GREEN**

```powershell
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api exec tsx --test src/module/toeic-content/tests/toeic-content-migration.spec.ts
pnpm --filter @repo/api check-types
```

- [ ] **Step 6: Commit**

```powershell
git add apps/api/prisma apps/api/src/module/toeic-content/tests
git commit -m "feat(api): persist published TOEIC Reading content"
```

### Task 2: Build the validation-first import orchestrator

**Files:**

- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.types.ts`
- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.import.ts`
- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.import.test.ts`

**Interfaces:**

- Consumes: private storage package files and canonical validation.
- Produces:

```ts
export type ToeicReadingImportResult = "CREATED" | "UPDATED" | "SKIPPED";
export type ToeicReadingImportSummary = {
  created: string[];
  updated: string[];
  skipped: string[];
  rejected: Array<{ sourceTestId: string; errors: string[] }>;
  failed: Array<{ sourceTestId: string; category: string }>;
};
export interface ToeicReadingImportStore {
  requireCourseId(courseCode: "toeic-600"): Promise<number>;
  importOne(input: {
    courseId: number;
    content: ToeicReadingPracticeTest;
    practiceStats: ToeicPracticeStat[];
  }): Promise<ToeicReadingImportResult>;
}
export async function importToeicReadingPractice(input: {
  storage: ToeicReadingStorage;
  store: ToeicReadingImportStore;
}): Promise<ToeicReadingImportSummary>;
```

- [ ] **Step 1: Write failing orchestration tests**

Use fake storage and store to prove Course resolution occurs before imports; created, updated, skipped, rejected, and failed results are sorted; invalid content never reaches the store; identity/checksum mismatch is rejected; and missing Course aborts before writes.

```ts
assert.deepEqual(result, {
  created: ["test-a"],
  updated: ["test-b"],
  skipped: ["test-c"],
  rejected: [{ sourceTestId: "test-d", errors: ["invalid"] }],
  failed: [{ sourceTestId: "test-e", category: "DATABASE" }],
});
```

- [ ] **Step 2: Run RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-reading-practice/toeic-reading-practice.import.test.ts
```

- [ ] **Step 3: Implement the orchestrator**

Resolve `toeic-600` once. For every complete package, require valid `validation.json`, revalidate `content.json`, verify package identity and manifest checksums, parse `practice-stats.json`, then call `importOne`. Package validation failures go to `rejected`; store failures go to `failed`. Missing Course remains a command-level failure.

- [ ] **Step 4: Run GREEN and regressions**

```powershell
pnpm --filter @repo/api exec tsx --test "scripts/toeic-reading-practice/*.test.ts"
```

- [ ] **Step 5: Commit**

```powershell
git add apps/api/scripts/toeic-reading-practice
git commit -m "feat(api): validate TOEIC Reading imports"
```

### Task 3: Add transactional Prisma import and the CLI

**Files:**

- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.ts`
- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.test.ts`
- Create: `apps/api/scripts/toeic-reading-practice/import-toeic-reading-practice.ts`
- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice-command-boundary.test.ts`
- Modify: `apps/api/scripts/support/script-prisma.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: `ToeicReadingImportStore` and generated Prisma client.
- Produces: `createPrismaToeicReadingImportStore(prisma)` and `data:import-toeic-reading-practice`.

- [ ] **Step 1: Write failing Prisma-store tests**

Use a transaction-shaped fake client and prove:

```ts
assert.equal(await store.importOne(newPackage), "CREATED");
assert.equal(await store.importOne(sameVersionPackage), "SKIPPED");
assert.equal(await store.importOne(changedVersionPackage), "UPDATED");
```

For `SKIPPED`, assert no transaction. For `UPDATED`, assert one transaction replaces all children, maps practice stats by source question ID, updates the source version, and leaves the test published.

- [ ] **Step 2: Run RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.test.ts
```

- [ ] **Step 3: Implement the Prisma adapter**

`requireCourseId` uses `courses.findUnique({ where: { code } })` and throws `Course toeic-600 does not exist` when absent. `importOne` reads identity/version first and skips an exact match. Otherwise, one transaction upserts the test set, creates or updates the published test, deletes old aggregate children on update, recreates stimuli/media/questions/options/stats, and updates `published_at`.

- [ ] **Step 4: Add the CLI boundary**

Add:

```json
"data:import-toeic-reading-practice": "dotenv -e ../../.env -- tsx ./scripts/toeic-reading-practice/import-toeic-reading-practice.ts"
```

The CLI composes private filesystem storage and Prisma, prints the summary, exits non-zero for rejected/failed packages, and disconnects in `finally`. It must not fetch source data, accept authorization, migrate, seed, or log package contents.

- [ ] **Step 5: Refresh script Prisma cache version**

Set `PRISMA_SCHEMA_VERSION` to `2026-07-31-toeic-reading-content`.

- [ ] **Step 6: Run focused GREEN verification**

```powershell
pnpm --filter @repo/api exec tsx --test "scripts/toeic-reading-practice/*.test.ts" src/module/toeic-content/tests/toeic-content-migration.spec.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

- [ ] **Step 7: Commit**

```powershell
git add apps/api/package.json apps/api/scripts apps/api/src/module/toeic-content
git commit -m "feat(api): import and publish TOEIC Reading packages"
```

### Task 4: Document and verify Phase 1

**Files:**

- Modify: `docs/guides/licensed-toeic-reading-practice-operations.md`
- Modify: `docs/features-overview.md`
- Modify: `docs/architecture/api.md`

**Interfaces:**

- Consumes: migration and importer command.
- Produces: operator runbook and truthful feature status.

- [ ] **Step 1: Document the operator sequence**

```powershell
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-toeic-reading-practice
```

Document the `toeic-600` prerequisite, summary categories, direct publish, same-version skip, changed-version replacement, transaction scope, and the fact that API/UI are not part of Phase 1.

- [ ] **Step 2: Update architecture and feature status**

Record the dedicated Course-owned TOEIC aggregate and mark published import as implemented but not applied by this task.

- [ ] **Step 3: Run Phase 1 gates**

```powershell
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm exec prettier --check apps/api/package.json "apps/api/prisma/**/*.{prisma,sql}" "apps/api/scripts/toeic-reading-practice/**/*.ts" "apps/api/src/module/toeic-content/**/*.ts" docs/guides/licensed-toeic-reading-practice-operations.md docs/features-overview.md docs/architecture/api.md
git diff --check
git ls-files var/licensed-content
```

Expected: all gates pass and no private package is tracked.

- [ ] **Step 4: Scan for credentials**

```powershell
git grep -n -E "Bearer [A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}" -- apps/api docs packages
```

Expected: no real authorization token.

- [ ] **Step 5: Commit documentation**

```powershell
git add docs
git commit -m "docs: operate published TOEIC Reading imports"
```

- [ ] **Step 6: Report the operator checkpoint**

Report commits and test evidence. State that the migration was not applied and the real importer was not run. Wait for explicit database authorization before running the two operator commands.
