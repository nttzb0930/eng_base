# TOEIC Writing Part 1-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish 48 TOEIC Writing Part 1 and 50 Part 2 tasks with authenticated discovery, backend autosave, immutable submission, and post-submission reference comparison.

**Architecture:** TOEIC Writing is a Course-owned API capability with dedicated content, draft, and submission persistence. An offline, checksum-approved pipeline imports private licensed packages; Web consumes safe Shared wire shapes through an Auth-owned browser transport and never receives reference answers before an owned submission.

**Tech Stack:** TypeScript 6, NestJS 11, Prisma 7/PostgreSQL, Next.js 16 App Router, React 19, TanStack Query 5, next-intl, Zod 4, class-validator, Node test runner, Tailwind/shadcn primitives.

**Design:** `docs/superpowers/specs/2026-08-02-toeic-writing-part-1-2-design.md`

## Global Constraints

- The owning Course is resolved only by immutable code `toeic-600`; import fails if it is absent.
- Part 1 and Part 2 are supported; Part 3 is not rendered or accepted.
- Pre-submission task responses never contain samples, outlines, chunks, structure suggestions, ideas, or gap references.
- Draft and submission endpoints require an authenticated Learner; learner progress is never stored in `localStorage`.
- Part 1 response length is 1-1,000 Unicode characters after trimming; Part 2 is 1-10,000.
- Submission keys are UUIDs and idempotent per Learner; conflicting reuse returns HTTP 409.
- Licensed text, images, credentials, source payloads, and signed URLs remain under ignored private storage and never enter Git or logs.
- No AI provider is called and no score, correction, or generated feedback is persisted in this phase.
- No source download, migration application, or database import runs as part of automated verification.
- Every production behavior starts with a failing test and follows RED -> GREEN -> REFACTOR.

---

## File Map

### Shared Interface

- `packages/shared/src/types/toeic-writing.ts`: JSON-safe Writing wire types and mutation payloads.
- `packages/shared/src/types/index.ts`: root Interface export.
- `packages/shared/test/toeic-writing-interface.test.ts`: export and answer-gating characterization.

### Offline Content Pipeline

- `apps/api/scripts/toeic-writing/toeic-writing.types.ts`: provider-neutral source, canonical, inventory, storage, and import interfaces.
- `apps/api/scripts/toeic-writing/toeic-writing.canonical.ts`: canonicalization and deterministic SHA-256 helpers.
- `apps/api/scripts/toeic-writing/toeic-writing.validation.ts`: strict Part-aware validation.
- `apps/api/scripts/toeic-writing/toeic-writing.storage.ts`: safe private filesystem packages.
- `apps/api/scripts/toeic-writing/dautoeic-toeic-writing-source.ts`: authorized Dautoeic adapter.
- `apps/api/scripts/toeic-writing/toeic-writing.inventory.ts`: metadata discovery and approved identity.
- `apps/api/scripts/toeic-writing/toeic-writing.download.ts`: normalized content/image acquisition.
- `apps/api/scripts/toeic-writing/toeic-writing.import.ts`: provider-neutral idempotent import orchestration.
- `apps/api/scripts/toeic-writing/toeic-writing.prisma-store.ts`: Course lookup and transactional Prisma writes.
- `apps/api/scripts/toeic-writing/toeic-writing.cli.ts`: safe runtime options and private credential-file loading.
- `apps/api/scripts/toeic-writing/inventory-toeic-writing.ts`: inventory entry point.
- `apps/api/scripts/toeic-writing/download-toeic-writing.ts`: download entry point.
- `apps/api/scripts/toeic-writing/validate-toeic-writing.ts`: offline validation entry point.
- `apps/api/scripts/toeic-writing/import-toeic-writing.ts`: database import entry point.
- `apps/api/scripts/toeic-writing/*.test.ts`: synthetic pipeline tests.
- `apps/api/package.json`: operator commands.
- `docs/data/toeic-writing-pipeline.md`: canonical operating guide.
- `docs/README.md`: data-guide link.

### Persistence and API

- `apps/api/prisma/schema.prisma`: Writing relations and models.
- `apps/api/prisma/migrations/20260802190000_add_toeic_writing_content/migration.sql`: reviewed schema migration.
- `apps/api/src/module/toeic-writing/toeic-writing.module.ts`: Nest composition root.
- `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`: authenticated JSON endpoints.
- `apps/api/src/module/toeic-writing/toeic-writing-media.controller.ts`: authenticated image delivery.
- `apps/api/src/module/toeic-writing/toeic-writing.mapper.ts`: Prisma/canonical JSON to safe wire mapping.
- `apps/api/src/module/toeic-writing/toeic-writing.errors.ts`: stable public error codes.
- `apps/api/src/module/toeic-writing/dto/toeic-writing.dto.ts`: query and mutation validation.
- `apps/api/src/module/toeic-writing/use-cases/*.use-case.ts`: one Learner goal per file.
- `apps/api/src/module/toeic-writing/tests/*.spec.ts`: mapper, DTO, controller, migration, and use-case tests.
- `apps/api/src/app.module.ts`: module registration.
- `apps/api/test/toeic-writing-architecture.test.ts`: capability boundary characterization.

### Learner Web

- `apps/web/app/features/toeic-writing/api/toeic-writing.api.ts`: resource methods and query keys.
- `apps/web/app/features/toeic-writing/hooks/use-toeic-writing.ts`: React Query orchestration.
- `apps/web/app/features/toeic-writing/toeic-writing-draft-queue.ts`: serialized autosave queue.
- `apps/web/app/features/toeic-writing/toeic-writing-session-state.ts`: editor/autosave/submit state transitions.
- `apps/web/app/features/toeic-writing/components/*`: catalog, prompt, editor, result, footer, and route-shaped skeletons.
- `apps/web/app/views/toeic-writing/ToeicWritingCatalogView.tsx`: catalog composition.
- `apps/web/app/views/toeic-writing/ToeicWritingSessionView.tsx`: Part-aware focused session.
- `apps/web/app/views/toeic-writing/ToeicWritingSubmissionView.tsx`: immutable submission comparison.
- `apps/web/app/[locale]/(main)/learn/cert/toeic/writing/{page,loading}.tsx`: thin catalog route.
- `apps/web/app/[locale]/(session)/toeic/writing/part-1/[taskId]/{page,loading}.tsx`: thin Part 1 route.
- `apps/web/app/[locale]/(session)/toeic/writing/part-2/[taskId]/{page,loading}.tsx`: thin Part 2 route.
- `apps/web/app/[locale]/(session)/toeic/writing/submissions/[submissionId]/{page,loading}.tsx`: thin result route.
- `apps/web/app/views/toeic-reading/ToeicOverviewView.tsx`: Writing discovery card.
- `apps/web/app/features/toeic-reading/components/ToeicOverviewSkeleton.tsx`: three-skill skeleton.
- `apps/web/app/messages/{en,vi}.json`: complete `toeicWriting` copy.
- `apps/web/app/features/toeic-writing/tests/*.test.ts`: resource, state, queue, and messages tests.
- `apps/web/test/toeic-writing-architecture.test.ts`: route/layout/answer-gating boundaries.

### Canonical Documentation

- `CONTEXT.md`: Writing task, draft, and submission language.
- `docs/architecture/frontend.md`: Writing routes and autosave ownership.
- `docs/features-overview.md`: Part 1-2 implementation state and AI-grading follow-up.

---

### Task 1: Define the Shared TOEIC Writing Interface

**Files:**

- Create: `packages/shared/src/types/toeic-writing.ts`
- Create: `packages/shared/test/toeic-writing-interface.test.ts`
- Modify: `packages/shared/src/types/index.ts`

**Interfaces:**

- Produces: `ToeicWritingPart`, `ToeicWritingOverview`, `ToeicWritingTaskSummary`, `ToeicWritingTaskDetail`, `ToeicWritingDraft`, `ToeicWritingDraftPayload`, `ToeicWritingSubmissionPayload`, and `ToeicWritingSubmissionResult` from root `@repo/shared`.
- Guarantees: `ToeicWritingTaskDetail` has no reference-answer property; reference material exists only on `ToeicWritingSubmissionResult`.

- [ ] **Step 1: Write the failing Shared Interface test**

```ts
// packages/shared/test/toeic-writing-interface.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import type {
  ToeicWritingPart,
  ToeicWritingSubmissionPayload,
  ToeicWritingTaskDetail,
} from "../src/index.js";

test("TOEIC Writing is exported through the Shared root Interface", () => {
  const part: ToeicWritingPart = 1;
  const payload: ToeicWritingSubmissionPayload = {
    contentVersion: "a".repeat(64),
    responseText: "The worker is checking a report.",
    submissionKey: "00000000-0000-4000-8000-000000000001",
  };
  const detailKeys: Array<keyof ToeicWritingTaskDetail> = [
    "id",
    "part",
    "contentVersion",
    "exercise",
  ];
  assert.equal(part, 1);
  assert.equal(payload.responseText.length > 0, true);
  assert.deepEqual(detailKeys, ["id", "part", "contentVersion", "exercise"]);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @repo/shared test -- toeic-writing-interface.test.ts`

Expected: FAIL because `ToeicWritingPart` and the Writing contracts are not exported.

- [ ] **Step 3: Add discriminated, JSON-safe wire types**

```ts
// packages/shared/src/types/toeic-writing.ts
export type ToeicWritingPart = 1 | 2;
export type ToeicWritingDifficulty = "EASY" | "MEDIUM";

export type ToeicWritingOverview = {
  publishedTaskCount: number;
  submittedTaskCount: number;
  parts: Array<{
    part: ToeicWritingPart;
    publishedTaskCount: number;
    submittedTaskCount: number;
  }>;
};

export type ToeicWritingTaskSummary = {
  id: number;
  part: ToeicWritingPart;
  order: number;
  title: string;
  difficulty: ToeicWritingDifficulty;
  contentVersion: string;
  submitted: boolean;
  hasDraft: boolean;
};

export type ToeicWritingPartOneExercise = {
  imageUrl: string;
  instructionsEn: string;
  instructionsVi: string | null;
  requiredWords: Array<{ en: string; vi: string | null }>;
};

export type ToeicWritingPartTwoExercise = {
  promptEn: string;
  promptVi: string | null;
  requirements: Array<{ order: number; textEn: string; textVi: string | null }>;
};

export type ToeicWritingTaskDetail =
  | (ToeicWritingTaskSummary & {
      part: 1;
      exercise: ToeicWritingPartOneExercise;
    })
  | (ToeicWritingTaskSummary & {
      part: 2;
      exercise: ToeicWritingPartTwoExercise;
    });

export type ToeicWritingDraftPayload = {
  contentVersion: string;
  responseText: string;
};

export type ToeicWritingDraft = ToeicWritingDraftPayload & {
  id: number;
  taskId: number;
  updatedAt: string;
};

export type ToeicWritingSubmissionPayload = ToeicWritingDraftPayload & {
  submissionKey: string;
};

export type ToeicWritingPartOneReference = {
  samplesEn: string[];
  samplesVi: string[];
  structureSuggestions: string[];
  ideas: string[];
};

export type ToeicWritingPartTwoReference = {
  sampleEn: string;
  sampleVi: string | null;
  outlineLevel1: string[];
  outlineLevel2: string[];
  chunksLevel1: string[];
  chunksLevel2: string[];
};

type ToeicWritingSubmissionBase = {
  id: number;
  taskId: number;
  taskTitle: string;
  contentVersion: string;
  responseText: string;
  submittedAt: string;
};

export type ToeicWritingSubmissionResult =
  | (ToeicWritingSubmissionBase & {
      part: 1;
      reference: ToeicWritingPartOneReference;
    })
  | (ToeicWritingSubmissionBase & {
      part: 2;
      reference: ToeicWritingPartTwoReference;
    });
```

Export it with `export * from "./toeic-writing.js";` in `packages/shared/src/types/index.ts`.

- [ ] **Step 4: Run Shared checks and verify GREEN**

Run: `pnpm --filter @repo/shared test && pnpm --filter @repo/shared check-types`

Expected: all Shared tests and type checking pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/toeic-writing.ts packages/shared/src/types/index.ts packages/shared/test/toeic-writing-interface.test.ts
git commit -m "feat(shared): define TOEIC Writing contracts"
```

### Task 2: Build Canonical Writing Types and Part-Aware Validation

**Files:**

- Create: `apps/api/scripts/toeic-writing/toeic-writing.types.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.canonical.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.validation.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.validation.test.ts`

**Interfaces:**

- Produces: `ToeicWritingCanonicalTask`, `ToeicWritingInventory`, `sha256Canonical(value)`, and `validateToeicWritingTask(task)`.
- Consumes later: source adapter, downloader, storage, and importer use only these provider-neutral shapes.

- [ ] **Step 1: Write RED validator tests with synthetic content**

```ts
test("accepts a complete synthetic Part 1 task", () => {
  const result = validateToeicWritingTask(partOneFixture());
  assert.deepEqual(result.errors, []);
});

test("rejects Part 1 without verified image or required words", () => {
  const task = partOneFixture();
  task.payload.requiredWords = [];
  task.media = null;
  assert.deepEqual(validateToeicWritingTask(task).errors, [
    "payload.requiredWords must contain at least one word",
    "media is required for Part 1",
  ]);
});

test("rejects Part 2 with orphaned gap references", () => {
  const task = partTwoFixture();
  task.payload.gapReferences = ["unused"];
  task.payload.chunksLevel2 = [];
  assert.match(
    validateToeicWritingTask(task).errors.join("\n"),
    /gap reference/i
  );
});
```

- [ ] **Step 2: Run the validator test and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test scripts/toeic-writing/toeic-writing.validation.test.ts`

Expected: FAIL because the canonical types and validator do not exist.

- [ ] **Step 3: Implement strict discriminated canonical types and deterministic hashing**

```ts
export type ToeicWritingCanonicalTask =
  | (ToeicWritingCanonicalBase & {
      part: 1;
      media: ToeicWritingCanonicalImage;
      payload: ToeicWritingPartOneCanonicalPayload;
    })
  | (ToeicWritingCanonicalBase & {
      part: 2;
      media: null;
      payload: ToeicWritingPartTwoCanonicalPayload;
    });

export function sha256Canonical(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function validateToeicWritingTask(task: ToeicWritingCanonicalTask) {
  const errors: string[] = [];
  validateBase(task, errors);
  if (task.part === 1) validatePartOne(task, errors);
  else validatePartTwo(task, errors);
  return { valid: errors.length === 0, errors };
}
```

Canonicalization must sort object keys, retain array order, normalize no learner-facing prose, and exclude retrieval timestamps from `contentSha256` while including them in `manifest.json`.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `pnpm --filter @repo/api exec tsx --test scripts/toeic-writing/toeic-writing.validation.test.ts`

Expected: the complete and invalid Part fixtures pass their exact assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/api/scripts/toeic-writing
git commit -m "feat(api): validate canonical TOEIC Writing content"
```

### Task 3: Add Safe Inventory, Download, and Private Storage

**Files:**

- Create: `apps/api/scripts/toeic-writing/toeic-writing.storage.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.storage.test.ts`
- Create: `apps/api/scripts/toeic-writing/dautoeic-toeic-writing-source.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.source.test.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.inventory.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.inventory.test.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.download.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.download.test.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.cli.ts`
- Create: `apps/api/scripts/toeic-writing/inventory-toeic-writing.ts`
- Create: `apps/api/scripts/toeic-writing/download-toeic-writing.ts`
- Create: `apps/api/scripts/toeic-writing/validate-toeic-writing.ts`
- Modify: `apps/api/package.json`
- Create: `docs/data/toeic-writing-pipeline.md`
- Modify: `docs/README.md`

**Interfaces:**

- Consumes: canonical types and validation from Task 2.
- Produces commands: `data:inventory-toeic-writing`, `data:download-toeic-writing`, and `data:validate-toeic-writing`.
- Produces storage API: `writeInventory`, `readInventory`, `writePackageFile`, `readPackageFile`, `writeMediaStream`, and `listPackages`.

- [ ] **Step 1: Write RED tests for authorization, counts, path safety, approved SHA, and resume**

```ts
test("inventory accepts exactly 48 Part 1 and 50 Part 2 visible tasks", async () => {
  const inventory = await inventoryToeicWriting({
    source: fakeSource({ partOne: 48, partTwo: 50 }),
    observedAt: "2026-08-02T00:00:00.000Z",
  });
  assert.deepEqual(inventory.taskCounts, { "1": 48, "2": 50 });
  assert.match(inventory.inventorySha256, /^[a-f0-9]{64}$/u);
});

test("download rejects a non-approved inventory digest", async () => {
  await assert.rejects(
    () =>
      downloadToeicWriting({
        ...fixtureRuntime(),
        approvedSha256: "b".repeat(64),
      }),
    /approved inventory SHA-256 does not match/u
  );
});

test("storage refuses repository root and path traversal", async () => {
  await assert.rejects(
    () => createToeicWritingStorage(repositoryRoot),
    /unsafe/u
  );
  assert.throws(() => safeSegment("../escape", "sourceTaskId"), /unsafe/u);
});
```

- [ ] **Step 2: Run the pipeline tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test "scripts/toeic-writing/*.test.ts"`

Expected: FAIL because source, storage, inventory, and download implementations do not exist.

- [ ] **Step 3: Implement the adapter and fail-closed CLI boundary**

```ts
export interface ToeicWritingSource {
  listPartOneTasks(): Promise<unknown[]>;
  listPartTwoTasks(): Promise<unknown[]>;
  inspectImage(
    url: string
  ): Promise<{ bytes: number | null; contentType: string | null }>;
  downloadImage(url: string): Promise<ReadableStream<Uint8Array>>;
}

export function loadToeicWritingRuntime(argv: string[]) {
  const approvedSha256 = argument(argv, "approved-sha");
  const workers = boundedInteger(argument(argv, "workers") ?? "4", 1, 12);
  return {
    approvedSha256,
    workers,
    source: createDautoeicToeicWritingSource(readPrivateAuthorizationFiles()),
    storage: createToeicWritingStorage(
      resolveLicensedContentRoot("dautoeic/writing")
    ),
  };
}
```

The source adapter validates upstream rows with Zod, accepts only published and non-hidden records visible to the configured identity, refuses `401`/`403` without fallback, never prints request headers, and rejects unknown Part values.

- [ ] **Step 4: Implement deterministic inventory and resumable media download**

```ts
const identity = {
  schemaVersion: 1 as const,
  source: "dautoeic" as const,
  selectedTasks: tasks.map(toInventoryIdentity),
  taskCounts: { "1": partOne.length, "2": partTwo.length },
  imageCount: partOne.length,
  knownImageBytes,
  unknownImageSizeCount,
};
return { ...identity, observedAt, inventorySha256: sha256Canonical(identity) };
```

Download must use a bounded worker pool, stream images to `.partial`, verify bytes/MIME/SHA-256, atomically rename complete files, and classify each source task as `completed`, `resumed`, `rejected`, or `failed`.

- [ ] **Step 5: Register commands and document exact operator flow**

```json
"data:inventory-toeic-writing": "tsx ./scripts/toeic-writing/inventory-toeic-writing.ts",
"data:download-toeic-writing": "tsx ./scripts/toeic-writing/download-toeic-writing.ts",
"data:validate-toeic-writing": "tsx ./scripts/toeic-writing/validate-toeic-writing.ts"
```

The guide must show PowerShell-safe environment variable usage and explicitly state that inventory/download/validate do not require `DATABASE_URL`.

- [ ] **Step 6: Run focused tests, lint the scripts, and verify GREEN**

Run: `pnpm --filter @repo/api exec tsx --test "scripts/toeic-writing/*.test.ts" && pnpm --filter @repo/api exec eslint scripts/toeic-writing --max-warnings=0`

Expected: all synthetic pipeline tests pass and ESLint reports zero warnings.

- [ ] **Step 7: Commit**

```bash
git add apps/api/scripts/toeic-writing apps/api/package.json docs/data/toeic-writing-pipeline.md docs/README.md
git commit -m "feat(api): acquire TOEIC Writing content safely"
```

### Task 4: Add Writing Persistence and Idempotent Import

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260802190000_add_toeic_writing_content/migration.sql`
- Create: `apps/api/src/module/toeic-writing/tests/toeic-writing-content-migration.spec.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.import.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.import.test.ts`
- Create: `apps/api/scripts/toeic-writing/toeic-writing.prisma-store.ts`
- Create: `apps/api/scripts/toeic-writing/import-toeic-writing.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Produces Prisma models: `toeic_writing_sets`, `toeic_writing_tasks`, `toeic_writing_drafts`, and `toeic_writing_submissions`.
- Produces command: `data:import-toeic-writing -- --approved-sha=$env:WRITING_SHA`.
- Preserves: drafts and submissions when source-owned task content changes.

- [ ] **Step 1: Write RED migration and importer tests**

```ts
test("Writing migration enforces source and learner identity", () => {
  const sql = readMigration("20260802190000_add_toeic_writing_content");
  assert.match(sql, /UNIQUE \("source", "source_task_id"\)/u);
  assert.match(sql, /UNIQUE \("user_id", "task_id"\)/u);
  assert.match(sql, /UNIQUE \("user_id", "submission_key"\)/u);
  assert.match(sql, /CHECK \("part" IN \(1, 2\)\)/u);
});

test("unchanged import skips and changed import preserves learner rows", async () => {
  const store = fakeImportStore();
  const first = await importToeicWriting({
    packages: [partOneFixture()],
    store,
  });
  const second = await importToeicWriting({
    packages: [partOneFixture()],
    store,
  });
  assert.deepEqual(first.updated, ["part-1-task-1"]);
  assert.deepEqual(second.skipped, ["part-1-task-1"]);
  assert.equal(store.deletedLearnerRows, 0);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-content-migration.spec.ts scripts/toeic-writing/toeic-writing.import.test.ts`

Expected: FAIL because migration and importer do not exist.

- [ ] **Step 3: Add exact Prisma ownership relations and constraints**

```prisma
enum toeic_writing_publication_status {
  DRAFT
  PUBLISHED
}

model toeic_writing_sets {
  id            Int      @id @default(autoincrement())
  course_id     Int
  source        String
  source_set_id String
  title         String
  order_index   Int
  created_at    DateTime @default(now()) @db.Timestamp(6)
  updated_at    DateTime @default(now()) @updatedAt @db.Timestamp(6)
  courses       courses  @relation(fields: [course_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "toeic_writing_sets_course_id_fkey")
  tasks         toeic_writing_tasks[]

  @@unique([course_id, source, source_set_id], map: "toeic_writing_sets_course_source_key")
  @@index([course_id, order_index], map: "toeic_writing_sets_course_order_idx")
}

model toeic_writing_tasks {
  id                  Int                              @id @default(autoincrement())
  set_id              Int
  source              String
  source_task_id      String
  part                Int
  order_index         Int
  title               String
  difficulty          String
  instructions_en     String                          @db.Text
  instructions_vi     String?                         @db.Text
  payload             Json
  image_storage_path  String?
  image_sha256        String?                         @db.VarChar(64)
  image_bytes         Int?
  image_content_type  String?
  source_version      String                          @db.VarChar(64)
  content_sha256      String                          @db.VarChar(64)
  provenance          Json
  license_reference   String
  status              toeic_writing_publication_status @default(DRAFT)
  published_at        DateTime?                       @db.Timestamp(6)
  created_at          DateTime                        @default(now()) @db.Timestamp(6)
  updated_at          DateTime                        @default(now()) @updatedAt @db.Timestamp(6)
  set                 toeic_writing_sets               @relation(fields: [set_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "toeic_writing_tasks_set_id_fkey")
  drafts              toeic_writing_drafts[]
  submissions         toeic_writing_submissions[]

  @@unique([source, source_task_id], map: "toeic_writing_tasks_source_task_key")
  @@unique([set_id, part, order_index], map: "toeic_writing_tasks_set_part_order_key")
  @@index([status, part, order_index], map: "toeic_writing_tasks_catalog_idx")
}

model toeic_writing_drafts {
  id              Int      @id @default(autoincrement())
  user_id         String
  task_id         Int
  response_text   String   @db.Text
  content_version String   @db.VarChar(64)
  created_at      DateTime @default(now()) @db.Timestamp(6)
  updated_at      DateTime @default(now()) @updatedAt @db.Timestamp(6)
  users           users    @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "toeic_writing_drafts_user_id_fkey")
  task            toeic_writing_tasks @relation(fields: [task_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "toeic_writing_drafts_task_id_fkey")

  @@unique([user_id, task_id], map: "toeic_writing_drafts_user_task_key")
}

model toeic_writing_submissions {
  id              Int      @id @default(autoincrement())
  user_id         String
  task_id         Int
  submission_key  String   @db.Uuid
  response_text   String   @db.Text
  content_version String   @db.VarChar(64)
  submitted_at    DateTime @default(now()) @db.Timestamp(6)
  users           users    @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "toeic_writing_submissions_user_id_fkey")
  task            toeic_writing_tasks @relation(fields: [task_id], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "toeic_writing_submissions_task_id_fkey")

  @@unique([user_id, submission_key], map: "toeic_writing_submissions_user_key")
  @@index([user_id, submitted_at], map: "toeic_writing_submissions_user_submitted_idx")
  @@index([user_id, task_id], map: "toeic_writing_submissions_user_task_idx")
}
```

Add `toeic_writing_sets toeic_writing_sets[]` to `courses`, plus `toeic_writing_drafts` and `toeic_writing_submissions` relations to `users`. Mirror every Prisma invariant in reviewed SQL, including `part IN (1,2)`, 64-character checksums, positive image bytes, Part 1 image presence, Part 2 image absence, and all foreign keys.

- [ ] **Step 4: Implement transactional, idempotent import**

```ts
export async function importToeicWriting(input: ToeicWritingImportInput) {
  const result = {
    updated: [] as string[],
    skipped: [] as string[],
    rejected: [] as ImportFailure[],
    failed: [] as ImportFailure[],
  };
  for (const candidate of selectLatestValidPackages(input.packages)) {
    try {
      const state = await input.store.importOne(candidate);
      result[state === "UPDATED" ? "updated" : "skipped"].push(
        candidate.sourceTaskId
      );
    } catch (error) {
      result.failed.push({
        sourceTaskId: candidate.sourceTaskId,
        category: classifyImportError(error),
      });
    }
  }
  return result;
}
```

`PrismaStore.importOne` resolves `toeic-600`, upserts the Writing set, replaces only source-owned task columns, sets `PUBLISHED`, and never deletes draft/submission rows.

- [ ] **Step 5: Register the import command**

```json
"data:import-toeic-writing": "dotenv -e ../../.env -- tsx ./scripts/toeic-writing/import-toeic-writing.ts"
```

- [ ] **Step 6: Generate Prisma client and run focused tests**

Run: `pnpm --filter @repo/api db:generate && pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-content-migration.spec.ts scripts/toeic-writing/toeic-writing.import.test.ts`

Expected: Prisma generates successfully and all migration/import tests pass. Do not run migrate deploy or import.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma apps/api/scripts/toeic-writing apps/api/package.json apps/api/src/module/toeic-writing/tests/toeic-writing-content-migration.spec.ts
git commit -m "feat(api): persist TOEIC Writing content"
```

### Task 5: Expose Safe Writing Catalog, Task, and Image APIs

**Files:**

- Create: `apps/api/src/module/toeic-writing/toeic-writing.errors.ts`
- Create: `apps/api/src/module/toeic-writing/toeic-writing.mapper.ts`
- Create: `apps/api/src/module/toeic-writing/dto/toeic-writing.dto.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-overview.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/list-toeic-writing-tasks.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-task.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-image.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`
- Create: `apps/api/src/module/toeic-writing/toeic-writing-media.controller.ts`
- Create: `apps/api/src/module/toeic-writing/toeic-writing.module.ts`
- Create: `apps/api/src/module/toeic-writing/tests/toeic-writing-read.use-cases.spec.ts`
- Create: `apps/api/src/module/toeic-writing/tests/toeic-writing.controller.spec.ts`
- Create: `apps/api/src/module/toeic-writing/tests/toeic-writing-media.spec.ts`
- Create: `apps/api/test/toeic-writing-architecture.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**

- Produces: overview, list, safe task detail, and authenticated image endpoints.
- Consumes: Shared contracts from Task 1 and Prisma models from Task 4.
- Security invariant: task mapper has separate `mapExercise` and `mapReference` functions; read use cases call only `mapExercise`.

- [ ] **Step 1: Write RED tests for publication, progress, answer gating, and path containment**

```ts
test("task detail omits Part 1 reference fields", async () => {
  const result = await useCase.execute("learner-1", 11);
  assert.equal(result.part, 1);
  assert.equal("reference" in result, false);
  assert.equal(JSON.stringify(result).includes("samplesEn"), false);
});

test("another unpublished task returns WRITING_TASK_NOT_FOUND", async () => {
  await assert.rejects(
    () => useCase.execute("learner-1", 99),
    (error: unknown) => hasHttpCode(error, 404, "WRITING_TASK_NOT_FOUND")
  );
});

test("image lookup rejects a path outside licensed content root", async () => {
  await assert.rejects(() => imageUseCase.execute(11), /not found/i);
});
```

- [ ] **Step 2: Run read tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test "src/module/toeic-writing/tests/toeic-writing-read.use-cases.spec.ts" "src/module/toeic-writing/tests/toeic-writing.controller.spec.ts" "src/module/toeic-writing/tests/toeic-writing-media.spec.ts"`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement stable error helpers and safe mappers**

```ts
export function writingTaskNotFound(): never {
  throw new NotFoundException({
    statusCode: 404,
    code: "WRITING_TASK_NOT_FOUND",
    message: "TOEIC Writing task not found",
  });
}

export function mapToeicWritingExercise(
  task: WritingTaskRecord
): ToeicWritingTaskDetail {
  const payload = parseStoredWritingPayload(task.part, task.payload);
  return task.part === 1
    ? {
        ...mapSummary(task),
        part: 1,
        exercise: mapPartOneExercise(task, payload),
      }
    : { ...mapSummary(task), part: 2, exercise: mapPartTwoExercise(payload) };
}
```

`mapPartOneExercise` emits the API image URL, required words, and instructions only. `mapPartTwoExercise` emits prompt and ordered requirements only.

- [ ] **Step 4: Implement goal-named use cases and thin controllers**

```ts
@Controller("toeic/writing")
@UseGuards(UserJwtGuard)
export class ToeicWritingController {
  @Get("overview") overview(@CurrentUserId() userId: string) {
    return this.getOverview.execute(userId);
  }

  @Get("tasks") tasks(
    @CurrentUserId() userId: string,
    @Query() query: ToeicWritingPartQueryDto
  ) {
    return this.listTasks.execute(userId, query.part);
  }

  @Get("tasks/:taskId") task(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number
  ) {
    return this.getTask.execute(userId, taskId);
  }
}
```

The media controller mirrors the existing safe local media pattern, verifies `PUBLISHED`, resolves `realpath` under `licensedContentRoot`, sets `Content-Type`, `Content-Length`, and ETag, and streams only the one image owned by the requested task.

- [ ] **Step 5: Register the module and add architecture characterization**

Add `ToeicWritingModule` to `apps/api/src/app.module.ts`. The architecture test asserts `controller -> use case -> Prisma`, forbids Prisma imports in controllers, and verifies every route is guarded.

- [ ] **Step 6: Run focused API tests and verify GREEN**

Run: `pnpm --filter @repo/api exec tsx --test "src/module/toeic-writing/tests/*.spec.ts" test/toeic-writing-architecture.test.ts`

Expected: catalog, mapping, media, controller, and architecture tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/module/toeic-writing apps/api/src/app.module.ts apps/api/test/toeic-writing-architecture.test.ts
git commit -m "feat(api): expose TOEIC Writing catalog"
```

### Task 6: Add Learner-Owned Backend Drafts

**Files:**

- Modify: `apps/api/src/module/toeic-writing/dto/toeic-writing.dto.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/save-toeic-writing-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/delete-toeic-writing-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/tests/toeic-writing-draft.use-cases.spec.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.module.ts`

**Interfaces:**

- Produces: `GET|PUT|DELETE /toeic/writing/tasks/:taskId/draft`.
- Consumes: `ToeicWritingDraftPayload` and returns `ToeicWritingDraft | null`.

- [ ] **Step 1: Write RED ownership, length, and version-conflict tests**

```ts
test("Part 1 draft rejects more than 1000 trimmed characters", async () => {
  await assert.rejects(
    () =>
      save.execute("learner-1", 11, {
        contentVersion: version,
        responseText: "x".repeat(1001),
      }),
    (error: unknown) => hasHttpCode(error, 400, "WRITING_RESPONSE_INVALID")
  );
});

test("stale content version keeps the existing draft", async () => {
  await assert.rejects(
    () =>
      save.execute("learner-1", 11, {
        contentVersion: "b".repeat(64),
        responseText: "answer",
      }),
    (error: unknown) =>
      hasHttpCode(error, 409, "WRITING_CONTENT_VERSION_CONFLICT")
  );
  assert.equal(prisma.toeic_writing_drafts.upsert.mock.callCount(), 0);
});

test("draft reads are scoped to the current learner", async () => {
  await get.execute("learner-2", 11);
  assert.deepEqual(
    prisma.toeic_writing_drafts.findUnique.mock.calls[0].arguments[0].where,
    {
      user_id_task_id: { user_id: "learner-2", task_id: 11 },
    }
  );
});
```

- [ ] **Step 2: Run draft tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-draft.use-cases.spec.ts`

Expected: FAIL because draft use cases are missing.

- [ ] **Step 3: Implement task-aware validation before any write**

```ts
const limits = { 1: 1_000, 2: 10_000 } as const;
const normalized = payload.responseText.trim();
if (normalized.length === 0 || normalized.length > limits[task.part]) {
  return writingResponseInvalid();
}
if (task.source_version !== payload.contentVersion) {
  return writingContentVersionConflict();
}
```

Upsert preserves the original response's internal whitespace, stores the current version, and never queries a draft without both `user_id` and `task_id`.

- [ ] **Step 4: Add DTO and controller routes**

```ts
export class ToeicWritingDraftDto implements ToeicWritingDraftPayload {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  contentVersion!: string;

  @IsString()
  @MaxLength(10_000)
  responseText!: string;
}
```

Controller methods delegate only to `getDraft`, `saveDraft`, and `deleteDraft` use cases.

- [ ] **Step 5: Run draft and controller tests and verify GREEN**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-draft.use-cases.spec.ts src/module/toeic-writing/tests/toeic-writing.controller.spec.ts`

Expected: ownership, validation, conflict, and route tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/module/toeic-writing
git commit -m "feat(api): persist TOEIC Writing drafts"
```

### Task 7: Add Idempotent Submission and Gated Reference Results

**Files:**

- Modify: `apps/api/src/module/toeic-writing/dto/toeic-writing.dto.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/submit-toeic-writing-task.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-submission.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/tests/toeic-writing-submission.use-cases.spec.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.mapper.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.module.ts`

**Interfaces:**

- Produces: `POST /toeic/writing/tasks/:taskId/submissions` and `GET /toeic/writing/submissions/:submissionId`.
- Guarantees: the POST is idempotent; only owned submission detail maps reference content.

- [ ] **Step 1: Write RED tests for idempotency, conflict, draft cleanup, and reference gating**

```ts
test("retrying an identical submission returns the stored row", async () => {
  const first = await submit.execute("learner-1", 11, payload);
  const retry = await submit.execute("learner-1", 11, payload);
  assert.equal(retry.id, first.id);
  assert.equal(prisma.toeic_writing_submissions.create.mock.callCount(), 1);
});

test("reusing a key for another response conflicts", async () => {
  await submit.execute("learner-1", 11, payload);
  await assert.rejects(
    () =>
      submit.execute("learner-1", 11, {
        ...payload,
        responseText: "different",
      }),
    (error: unknown) =>
      hasHttpCode(error, 409, "WRITING_SUBMISSION_KEY_CONFLICT")
  );
});

test("submission result maps reference only after owned lookup", async () => {
  const result = await get.execute("learner-1", 31);
  assert.equal(result.part, 1);
  if (result.part !== 1) throw new Error("Expected Part 1 result");
  assert.deepEqual(result.reference.samplesEn, ["A synthetic reference."]);
  await assert.rejects(() => get.execute("learner-2", 31), /not found/i);
});
```

- [ ] **Step 2: Run submission tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-submission.use-cases.spec.ts`

Expected: FAIL because submission behavior is missing.

- [ ] **Step 3: Implement race-safe idempotency and atomic draft deletion**

```ts
const existing = await findByUserAndKey(userId, payload.submissionKey);
if (existing) return resolveExisting(existing, taskId, payload);

try {
  return await prisma.$transaction(async (tx) => {
    const created = await tx.toeic_writing_submissions.create({
      data: {
        user_id: userId,
        task_id: taskId,
        submission_key: payload.submissionKey,
        response_text: payload.responseText,
        content_version: payload.contentVersion,
      },
      select: writingSubmissionSelect,
    });
    await tx.toeic_writing_drafts.deleteMany({
      where: { user_id: userId, task_id: taskId },
    });
    return created;
  });
} catch (error) {
  if (!isPrismaUniqueConflict(error)) throw error;
  return resolveExisting(
    await findRequiredByUserAndKey(userId, payload.submissionKey),
    taskId,
    payload
  );
}
```

`resolveExisting` compares task, content version, and response text. Result mapping parses the task payload and returns only the Part-specific reference block.

- [ ] **Step 4: Add DTO and routes**

```ts
export class ToeicWritingSubmissionDto
  extends ToeicWritingDraftDto
  implements ToeicWritingSubmissionPayload
{
  @IsUUID()
  submissionKey!: string;
}
```

- [ ] **Step 5: Run the complete Writing API test set and verify GREEN**

Run: `pnpm --filter @repo/api exec tsx --test "src/module/toeic-writing/tests/*.spec.ts" test/toeic-writing-architecture.test.ts`

Expected: all Writing API tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/module/toeic-writing
git commit -m "feat(api): submit TOEIC Writing responses"
```

### Task 8: Add the Web Resource, Catalog, and TOEIC Discovery Card

**Files:**

- Create: `apps/web/app/features/toeic-writing/api/toeic-writing.api.ts`
- Create: `apps/web/app/features/toeic-writing/hooks/use-toeic-writing.ts`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingTaskCard.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingCatalogSkeleton.tsx`
- Create: `apps/web/app/views/toeic-writing/ToeicWritingCatalogView.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/writing/page.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/writing/loading.tsx`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing.api.test.ts`
- Create: `apps/web/test/toeic-writing-architecture.test.ts`
- Modify: `apps/web/app/views/toeic-reading/ToeicOverviewView.tsx`
- Modify: `apps/web/app/features/toeic-reading/components/ToeicOverviewSkeleton.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Consumes: overview/list/task contracts and browser endpoints from Tasks 1 and 5.
- Produces: `toeicWritingApi`, `toeicWritingKeys`, overview/list hooks, and localized catalog route.

- [ ] **Step 1: Write RED resource and architecture tests**

```ts
test("Writing resource preserves catalog, task, draft, and submission routes", async () => {
  const calls: string[] = [];
  const api = createToeicWritingApi(fakeHttp(calls));
  await api.overview();
  await api.tasks(1);
  await api.task(11);
  assert.deepEqual(calls, [
    "GET /toeic/writing/overview",
    "GET /toeic/writing/tasks?part=1",
    "GET /toeic/writing/tasks/11",
  ]);
  assert.deepEqual(toeicWritingKeys.tasks(1), ["toeic-writing", "tasks", 1]);
});

test("Writing catalog route is thin and discoverable from TOEIC overview", () => {
  assert.match(read(catalogPage), /ToeicWritingCatalogView/);
  assert.doesNotMatch(read(catalogPage), /use client/u);
  assert.match(read(toeicOverview), /learn\/cert\/toeic\/writing/u);
});
```

- [ ] **Step 2: Run Web tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing.api.test.ts test/toeic-writing-architecture.test.ts`

Expected: FAIL because the resource and route do not exist.

- [ ] **Step 3: Implement resource methods and stable query keys**

```ts
export const toeicWritingKeys = {
  all: ["toeic-writing"] as const,
  overview: () => [...toeicWritingKeys.all, "overview"] as const,
  tasksRoot: () => [...toeicWritingKeys.all, "tasks"] as const,
  tasks: (part: ToeicWritingPart) =>
    [...toeicWritingKeys.tasksRoot(), part] as const,
  task: (taskId: number) => [...toeicWritingKeys.all, "task", taskId] as const,
  draft: (taskId: number) =>
    [...toeicWritingKeys.all, "draft", taskId] as const,
  submission: (submissionId: number) =>
    [...toeicWritingKeys.all, "submission", submissionId] as const,
};
```

Every API method delegates to `webHttpClient`; no token, Axios instance, or Server Component fetch is introduced.

- [ ] **Step 4: Build the responsive catalog and overview card**

Use `ToeicBrowseContainer`, Part 1/Part 2 URL-backed tabs, backend ordering, `rounded-md` cards, progress text, and localized Start/Continue states. Change the TOEIC overview skill grid to three columns at large width and query Writing overview alongside Reading and Listening.

- [ ] **Step 5: Add English/Vietnamese catalog copy and verify GREEN**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing.api.test.ts test/toeic-writing-architecture.test.ts && pnpm --filter @repo/web check-types`

Expected: resource, route, discovery, and type tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/features/toeic-writing apps/web/app/views/toeic-writing apps/web/app/[locale] apps/web/app/views/toeic-reading/ToeicOverviewView.tsx apps/web/app/features/toeic-reading/components/ToeicOverviewSkeleton.tsx apps/web/app/messages apps/web/test/toeic-writing-architecture.test.ts
git commit -m "feat(web): browse TOEIC Writing tasks"
```

### Task 9: Build the Part-Aware Editor and Serialized Backend Autosave

**Files:**

- Create: `apps/web/app/features/toeic-writing/toeic-writing-draft-queue.ts`
- Create: `apps/web/app/features/toeic-writing/toeic-writing-session-state.ts`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-draft-queue.test.ts`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-session-state.test.ts`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingPromptPane.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingEditorPane.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingSessionFooter.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingSessionSkeleton.tsx`
- Create: `apps/web/app/views/toeic-writing/ToeicWritingSessionView.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/writing/part-1/[taskId]/page.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/writing/part-1/[taskId]/loading.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/writing/part-2/[taskId]/page.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/writing/part-2/[taskId]/loading.tsx`
- Modify: `apps/web/app/features/toeic-writing/api/toeic-writing.api.ts`
- Modify: `apps/web/app/features/toeic-writing/hooks/use-toeic-writing.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Produces: `createToeicWritingDraftQueue`, deterministic session reducer, Part-aware focused route, and autosave status.
- Consumes: task and draft APIs. Submission mutation is wired but final result view lands in Task 10.

- [ ] **Step 1: Write RED queue and session-state tests**

```ts
test("rapid snapshots collapse to the newest pending save", async () => {
  const gate = deferred<void>();
  const saved: string[] = [];
  const queue = createToeicWritingDraftQueue(async (snapshot: string) => {
    saved.push(snapshot);
    if (saved.length === 1) await gate.promise;
  });
  queue.push("first");
  queue.push("second");
  queue.push("latest");
  gate.resolve();
  await queue.flush();
  assert.deepEqual(saved, ["first", "latest"]);
});

test("save failure keeps editor text and marks not-saved", () => {
  const state = reduceWritingSession(
    { ...initialState, responseText: "learner text" },
    { type: "save-failed" }
  );
  assert.equal(state.responseText, "learner text");
  assert.equal(state.saveStatus, "ERROR");
});
```

- [ ] **Step 2: Run focused Web tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing-draft-queue.test.ts app/features/toeic-writing/tests/toeic-writing-session-state.test.ts`

Expected: FAIL because queue and reducer do not exist.

- [ ] **Step 3: Implement serialized queue and reducer**

```ts
export type ToeicWritingSaveStatus = "IDLE" | "SAVING" | "SAVED" | "ERROR";

export function reduceWritingSession(state: State, action: Action): State {
  switch (action.type) {
    case "edit":
      return { ...state, responseText: action.value, saveStatus: "IDLE" };
    case "saving":
      return { ...state, saveStatus: "SAVING" };
    case "saved":
      return { ...state, saveStatus: "SAVED" };
    case "save-failed":
      return { ...state, saveStatus: "ERROR" };
    case "submitting":
      return { ...state, submitting: true };
    case "submit-failed":
      return { ...state, submitting: false };
  }
}
```

The View initializes from server draft once, debounces edits by 600 ms, pushes complete `{ contentVersion, responseText }` snapshots, flushes before navigation/submission, and never clears text on a mutation error.

- [ ] **Step 4: Build the focused two-pane workspace**

Desktop uses prompt left/editor right; mobile stacks prompt above editor. Use shadcn `Button`, `Textarea`, `Badge`, and `Alert`, `rounded-md`, visible focus, character/word count, save status, retry, and sticky footer. Part 1 renders authenticated image and required words; Part 2 renders bilingual email and ordered requirements.

- [ ] **Step 5: Add thin routes, localized copy, and run GREEN checks**

Run: `pnpm --filter @repo/web exec tsx --test "app/features/toeic-writing/tests/*.test.ts" test/toeic-writing-architecture.test.ts && pnpm --filter @repo/web check-types`

Expected: queue, state, API, route, and type tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/features/toeic-writing apps/web/app/views/toeic-writing apps/web/app/[locale]/\(session\)/toeic/writing apps/web/app/messages
git commit -m "feat(web): write and autosave TOEIC responses"
```

### Task 10: Add Submission Comparison, Documentation, and Full Verification

**Files:**

- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingReferencePanel.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingResultSkeleton.tsx`
- Create: `apps/web/app/views/toeic-writing/ToeicWritingSubmissionView.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/writing/submissions/[submissionId]/page.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/writing/submissions/[submissionId]/loading.tsx`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-reference-gating.test.ts`
- Modify: `apps/web/app/features/toeic-writing/api/toeic-writing.api.ts`
- Modify: `apps/web/app/features/toeic-writing/hooks/use-toeic-writing.ts`
- Modify: `apps/web/app/views/toeic-writing/ToeicWritingSessionView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `CONTEXT.md`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/features-overview.md`

**Interfaces:**

- Produces: owned submission result route and complete current architecture documentation.
- Completes: successful submit flushes autosave, posts one idempotent request, clears draft cache, invalidates progress, and navigates to the immutable result.

- [ ] **Step 1: Write RED result and answer-gating tests**

```ts
test("result renders learner response and labels reference as non-scored", () => {
  const source = read(
    "app/features/toeic-writing/components/ToeicWritingReferencePanel.tsx"
  );
  assert.match(source, /reference/i);
  assert.match(source, /notScore|notScored/u);
  assert.doesNotMatch(source, /accuracy|AI score|band score/iu);
});

test("pre-submission task code cannot render reference fields", () => {
  const session = read("app/views/toeic-writing/ToeicWritingSessionView.tsx");
  assert.doesNotMatch(session, /samplesEn|outlineLevel1|chunksLevel1/u);
});
```

- [ ] **Step 2: Run result tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing-reference-gating.test.ts test/toeic-writing-architecture.test.ts`

Expected: FAIL because the result route and reference component do not exist.

- [ ] **Step 3: Implement submit transition and immutable comparison view**

```ts
async function submitResponse() {
  await draftQueue.flush();
  const result = await submitMutation.mutateAsync({
    taskId: task.id,
    payload: {
      contentVersion: task.contentVersion,
      responseText: state.responseText,
      submissionKey: state.submissionKey,
    },
  });
  router.replace(`/toeic/writing/submissions/${result.id}`);
}
```

The result view shows task title, Learner response, and discriminated Part-specific reference material. It says explicitly that reference comparison is not a score, offers Start again and Back to Writing, and never invents correctness or AI feedback.

- [ ] **Step 4: Update canonical documentation**

Add these exact concepts to `CONTEXT.md`: `TOEIC Writing task`, `TOEIC Writing draft`, and `TOEIC Writing submission`. Document the localized catalog/focused routes and serialized backend autosave in `docs/architecture/frontend.md`. Mark Part 1-2 content/draft/submission as implemented and AI grading as the next separate phase in `docs/features-overview.md`.

- [ ] **Step 5: Run narrow verification**

Run:

```bash
pnpm --filter @repo/shared test
pnpm --filter @repo/api exec tsx --test "scripts/toeic-writing/*.test.ts" "src/module/toeic-writing/tests/*.spec.ts" test/toeic-writing-architecture.test.ts
pnpm --filter @repo/web exec tsx --test "app/features/toeic-writing/tests/*.test.ts" test/toeic-writing-architecture.test.ts
```

Expected: every Writing-specific test passes.

- [ ] **Step 6: Run the full repository gate**

Run:

```bash
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

Expected: all commands exit 0. If a baseline failure unrelated to Writing appears, record its exact command and failure without weakening or deleting the gate.

- [ ] **Step 7: Inspect the final diff and commit**

Run: `git diff --check && git status --short`

Commit only Writing and canonical documentation files:

```bash
git add apps/web/app/features/toeic-writing apps/web/app/views/toeic-writing apps/web/app/[locale] apps/web/app/messages CONTEXT.md docs/architecture/frontend.md docs/features-overview.md
git commit -m "feat(web): complete TOEIC Writing Part 1 and Part 2"
```

---

## Operator Checkpoint After Code Review

These commands are intentionally outside automated implementation. Run them only after selecting the database environment and confirming source authorization:

```powershell
pnpm --filter @repo/api data:inventory-toeic-writing
$env:WRITING_SHA = Read-Host "Paste inventorySha256 from the JSON output"
pnpm --filter @repo/api data:download-toeic-writing -- --approved-sha=$env:WRITING_SHA --workers=4
pnpm --filter @repo/api data:validate-toeic-writing
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-toeic-writing -- --approved-sha=$env:WRITING_SHA
```

Expected import summary:

```json
{
  "updatedCount": 98,
  "skippedCount": 0,
  "rejectedCount": 0,
  "failedCount": 0,
  "partCounts": { "1": 48, "2": 50 }
}
```

Re-running import must report `updatedCount: 0`, `skippedCount: 98`, and no rejected or failed tasks. Smoke-test catalog -> Part 1 draft -> submit -> reference result, then repeat for Part 2 with a second Learner account to verify ownership isolation.
