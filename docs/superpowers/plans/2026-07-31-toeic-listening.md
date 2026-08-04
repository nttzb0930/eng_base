# TOEIC Listening Parts 1–4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import licensed local media and deliver complete TOEIC Listening Full Test and Part 1–4 practice for the same ten tests that already own Reading Part 5–7.

**Architecture:** Extend the existing Course-owned TOEIC content aggregate with Listening versions, transcripts, and explicit media bindings while preserving Reading rows and versions. Listening owns separate attempts, drafts, APIs, playback policy, and Web views; media bytes remain in ignored local storage and are streamed through authenticated Range-capable API routes.

**Tech Stack:** TypeScript 6, Node.js 22 test runner, PostgreSQL, Prisma 7, NestJS 11, Next.js 16, React 19, React Query 5, browser HTMLAudioElement.

## Global Constraints

- Match the same ten tests only by `(source, sourceTestId)` from the approved Reading inventory.
- A published Listening test has exactly Part counts `1: 6`, `2: 25`, `3: 39`, `4: 30`.
- Store media below `var/licensed-content/dautoeic/toeic-listening-practice`; never commit media, authorization, provider URLs, or tokens.
- Inventory and download run without `.env` or a database connection; import is the only database-writing command.
- Keep `toeic_tests.source_version` as the Reading version and add a separate nullable `listening_source_version`.
- Listening import replaces only Part 1–4 and preserves Reading Part 5–7, attempts, drafts, and version.
- Part practice allows pause, seek, and replay. Full Listening allows pause/resume but no seek/replay in the normal UI.
- Before submission, Parts 1–2 expose labels only; no answer text, transcript, correctness, explanation, provider URL, or filesystem path.
- Learner progress is backend-owned; do not use `localStorage`.
- Do not commit, push, apply migrations, import database content, or contact the provider automatically.

---

### Task 1: Source inventory locked to the approved ten Reading identities

**Files:**

- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.types.ts`
- Create: `apps/api/scripts/toeic-listening-practice/dautoeic-toeic-listening-source.ts`
- Create: `apps/api/scripts/toeic-listening-practice/dautoeic-toeic-listening-source.test.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.inventory.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.inventory.test.ts`
- Create: `apps/api/scripts/toeic-listening-practice/inventory-toeic-listening-practice.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: approved Reading inventory selected test fields
  `{sourceTestId, sourceSetId, title, order}`.
- Produces:

```ts
export const TOEIC_LISTENING_PART_COUNTS = {
  1: 6,
  2: 25,
  3: 39,
  4: 30,
} as const;
export type ToeicListeningPart = keyof typeof TOEIC_LISTENING_PART_COUNTS;
export type ToeicListeningInventory = {
  schemaVersion: 1;
  source: "dautoeic";
  readingInventorySha256: string;
  observedAt: string;
  selectedTests: Array<{
    sourceTestId: string;
    sourceSetId: string;
    title: string;
    order: number;
    questionCounts: Record<"1" | "2" | "3" | "4", number>;
    audioUrls: string[];
    imageUrls: string[];
  }>;
  questionCounts: Record<"1" | "2" | "3" | "4", number>;
  audioCount: number;
  imageCount: number;
  knownMediaBytes: number;
  unknownMediaSizeCount: number;
  inventorySha256: string;
};
```

- [ ] **Step 1: Write failing source and inventory tests**

Use a fake source containing one matching test, one title-only impostor, and Part
1–4 rows. Assert selection uses exact source IDs, rejects source-set/title/order
drift, reports 6/25/39/30 counts, deduplicates media URLs, and computes a stable
SHA after omitting `observedAt` and `inventorySha256`.

- [ ] **Step 2: Verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-listening-practice/dautoeic-toeic-listening-source.test.ts scripts/toeic-listening-practice/toeic-listening-practice.inventory.test.ts
```

Expected: FAIL because the Listening source and inventory modules do not exist.

- [ ] **Step 3: Implement source boundary and inventory**

Keep provider field normalization inside
`dautoeic-toeic-listening-source.ts`. The inventory function must accept the
approved Reading inventory as an argument and fail before writing when any of
the ten identities is absent or changed. Probe media size with `HEAD`; a failed
size probe increments `unknownMediaSizeCount` without downloading bytes.

- [ ] **Step 4: Add operator command**

Add:

```json
"data:inventory-toeic-listening-practice": "tsx ./scripts/toeic-listening-practice/inventory-toeic-listening-practice.ts"
```

The command reads the latest approved Reading inventory SHA from
`--reading-inventory-sha` or an existing private profile, and writes:

```text
var/licensed-content/dautoeic/inventories/toeic-listening-practice/<sha>.json
```

- [ ] **Step 5: Verify Task 1**

Run focused tests, API type-check, lint, and `git diff --check`. Do not execute
the live inventory command.

### Task 2: Resumable local media download and canonical validation

**Files:**

- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.storage.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.storage.test.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.canonical.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.canonical.test.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.download.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.download.test.ts`
- Create: `apps/api/scripts/toeic-listening-practice/download-toeic-listening-practice.ts`
- Create: `apps/api/scripts/toeic-listening-practice/validate-toeic-listening-practice.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: `ToeicListeningInventory` and provider question/stimulus payloads.
- Produces:

```ts
export type ToeicListeningMedia = {
  id: string;
  role: "AUDIO" | "IMAGE";
  sourceUrl: string;
  storagePath: string;
  sha256: string;
  bytes: number;
  contentType: string;
};
export type ToeicListeningPracticeTest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetId: string;
  sourceSetName: string;
  sourceTestId: string;
  listeningSourceVersion: string;
  title: string;
  parts: Array<{
    part: 1 | 2 | 3 | 4;
    stimuli: ToeicListeningStimulus[];
    questions: ToeicListeningQuestion[];
  }>;
  media: ToeicListeningMedia[];
};
```

- [ ] **Step 1: Write failing storage/download tests**

Use temporary directories and fake byte responses. Assert:

- packages use `<sourceTestId>/<version>`;
- `.part` files resume with Range and are atomically renamed;
- existing files are reused only after byte count and SHA match;
- credentials never appear in manifest/error output;
- no database/environment access occurs.

- [ ] **Step 2: Write failing canonical validator tests**

Build complete minimal fixtures for each Part and mutate them one invariant at a
time. Require exact counts, Part 1 image/audio and A–D, Part 2 audio and A–C,
13 three-question Part 3 groups, 10 three-question Part 4 groups, one correct
choice, transcript, supported non-empty media, and matching checksum.

- [ ] **Step 3: Verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test "scripts/toeic-listening-practice/*.test.ts"
```

Expected: new storage/canonical/download suites fail with missing modules.

- [ ] **Step 4: Implement canonicalization and resumable download**

Normalize Part 1/2 transcript at question level and Part 3/4 transcript at
stimulus level. Reference media by canonical media ID. Compute
`listeningSourceVersion` from canonical content plus media checksums, not
timestamps or source URLs.

- [ ] **Step 5: Add download and validation commands**

```json
"data:download-toeic-listening-practice": "tsx ./scripts/toeic-listening-practice/download-toeic-listening-practice.ts",
"data:validate-toeic-listening-practice": "tsx ./scripts/toeic-listening-practice/validate-toeic-listening-practice.ts"
```

Download requires `--approved-sha=<inventory SHA>`. Validation reads local
packages only and returns non-zero when any package is invalid.

- [ ] **Step 6: Verify Task 2**

Run all Listening pipeline tests, type-check, lint, Prettier check, and
`git diff --check`. Do not call the provider.

### Task 2A: Select one active package per source test

**Files:**

- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.packages.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.packages.test.ts`
- Modify: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.import.ts`
- Modify: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.import.test.ts`
- Modify: `apps/api/scripts/toeic-listening-practice/validate-toeic-listening-practice.ts`

**Interfaces:**

- Consumes: complete package identities and each package manifest's ISO `acquiredAt`.
- Produces: `selectLatestToeicListeningPackages(storage)` with physical count,
  one selected package per `sourceTestId`, and the superseded identities.

- [x] **Step 1: Write a failing test** proving two versions of one source test
      select the later `acquiredAt`, while another source test remains selected.
- [x] **Step 2: Run the focused test** and confirm it fails because the selector
      module does not exist.
- [x] **Step 3: Implement the selector** with deterministic version-hash
      tie-breaking and no filesystem deletion.
- [x] **Step 4: Integrate the selector** into validation and import so only the
      ten selected identities are validated/imported and superseded counts are
      reported.
- [x] **Step 5: Run focused tests, all Listening script tests, type-check, lint,
      and the real local validation command.**

### Task 3: Listening schema and Part-preserving importer

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801010000_add_toeic_listening_content/migration.sql`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-content-migration.spec.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.prisma-store.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.prisma-store.test.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.import.ts`
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.import.test.ts`
- Create: `apps/api/scripts/toeic-listening-practice/import-toeic-listening-practice.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: validated `ToeicListeningPracticeTest`.
- Produces:

```ts
type ToeicListeningImportResult = "UPDATED" | "SKIPPED";
async function syncToeicListeningTest(
  tx: Prisma.TransactionClient,
  test: ToeicListeningPracticeTest
): Promise<ToeicListeningImportResult>;
```

- [ ] **Step 1: Write failing migration test**

Assert migration adds Listening version/status/publication fields, transcript
fields, and `toeic_media_bindings` with role check, exactly-one-owner check,
foreign keys, unique/indexes, and cascading cleanup. Assert
`source_version` remains present for Reading.

- [ ] **Step 2: Write failing importer tests**

Mock a test containing Part 1–7. Assert importer:

- finds only `(source, source_test_id)`;
- rejects absent/mismatched existing tests instead of creating;
- deletes/replaces only Part 1–4;
- preserves Part 5–7 rows and Reading version;
- upserts local media metadata and bindings;
- sets Listening PUBLISHED only after validation;
- skips identical Listening version;
- rolls back one test atomically on failure.

- [ ] **Step 3: Verify RED**

Run the migration/import suites and expect missing schema/import behavior.

- [ ] **Step 4: Implement schema and importer**

Use `toeic_publication_status` for `listening_status`. Keep storage paths
relative to the licensed-content root. Never persist authorization headers.

- [ ] **Step 5: Add explicit import command**

```json
"data:import-toeic-listening-practice": "dotenv -e ../../.env -- tsx ./scripts/toeic-listening-practice/import-toeic-listening-practice.ts"
```

The command imports every locally valid complete package and prints
updated/skipped/rejected/failed IDs.

- [ ] **Step 6: Generate and verify without deployment**

```powershell
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api exec dotenv -e ../../.env -- prisma validate
pnpm --filter @repo/api exec tsx --test src/module/toeic-listening/tests/toeic-listening-content-migration.spec.ts "scripts/toeic-listening-practice/*.test.ts"
```

Do not run migrate deploy or the importer.

### Task 4: Shared learner contracts and safe Listening read/media API

**Files:**

- Create: `packages/shared/src/types/toeic-listening.ts`
- Modify: `packages/shared/src/types/index.ts`
- Create: `apps/api/src/module/toeic-listening/toeic-listening.mapper.ts`
- Create: `apps/api/src/module/toeic-listening/dto/toeic-listening.dto.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/get-toeic-listening-overview.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/list-toeic-listening-tests.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/get-toeic-listening-test.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/get-toeic-listening-media.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/toeic-listening-media.controller.ts`
- Create: `apps/api/src/module/toeic-listening/toeic-listening.controller.ts`
- Create: `apps/api/src/module/toeic-listening/toeic-listening.module.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-read.use-cases.spec.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-media.use-case.spec.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening.controller.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**

- Produces `ToeicListeningPart = 1 | 2 | 3 | 4`, overview/test summary/detail,
  learner question/stimulus/media DTOs.
- `GetToeicListeningMediaUseCase.execute(assetId)` returns:

```ts
type LocalMediaDescriptor = {
  absolutePath: string;
  bytes: number;
  contentType: string;
  etag: string;
};
```

- [x] **Step 1: Write failing safe-read tests**

Assert selected Part filtering, natural Test order, exact question counts, and
that learner detail query/result omit correctness, transcript, translation,
explanation, source URL, and storage path. Assert Part 1/2 option text is
replaced by labels while Parts 3/4 keep printable text.

- [x] **Step 2: Write failing media tests**

Use temporary local files. Cover authenticated route metadata, path containment,
DOWNLOADED status, missing files, HEAD, complete GET, valid single Range,
unsatisfiable/multiple Range, correct 200/206/416 headers, and stream errors.

- [x] **Step 3: Implement read use cases and media boundary**

Resolve every candidate path against one licensed-content root and reject it
unless `path.relative(root, candidate)` remains inside the root. Controller
parses Range but the use case owns asset/path validation.

- [x] **Step 4: Register guarded routes**

Expose overview, tests, test detail, and media beneath `toeic/listening`.
Register `ToeicListeningModule` in `AppModule`.

- [x] **Step 5: Verify Task 4**

Run focused tests, shared/API type-check, API lint/build, and architecture tests.

### Task 5: Listening grading, immutable attempts, and results

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801020000_add_toeic_listening_attempts/migration.sql`
- Create: `apps/api/src/module/toeic-listening/use-cases/toeic-listening-grading.policy.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/submit-toeic-listening-attempt.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/list-toeic-listening-attempts.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/get-toeic-listening-attempt.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-attempt-migration.spec.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-grading.policy.spec.ts`
- Create: `apps/api/src/module/toeic-listening/tests/submit-toeic-listening-attempt.use-case.spec.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-history.use-cases.spec.ts`
- Modify: Listening DTO/controller/module and shared types from Task 4.

**Interfaces:**

```ts
type ToeicListeningSubmissionPayload = {
  submissionKey: string;
  testId: number;
  listeningSourceVersion: string;
  practicePart?: 1 | 2 | 3 | 4;
  answers: Array<{ questionId: number; optionId: number }>;
};
```

- [x] **Step 1: Write failing migration and grading tests**

Require immutable answer snapshots, Restrict test deletion, user/submission
unique key, Part index, exact selected-scope coverage, stable order-independent
fingerprint, foreign-option rejection, and per-Part totals.

- [x] **Step 2: Write failing submission/history tests**

Assert server-only answer keys, Listening version conflict, atomic snapshot
creation, identical idempotent retry, conflicting key reuse, account-isolated
history, and result transcript/translation/media review identity.

- [x] **Step 3: Implement attempt schema and use cases**

Do not read live question content when returning stored results. Snapshot hidden
Parts 1/2 text for post-submit review even though learner detail omitted it.

- [x] **Step 4: Register attempt routes**

Add POST/list/detail endpoints and DTO validation for SHA, UUID, supported Part,
unique answers, and maximum 100 answers.

- [x] **Step 5: Verify Task 5**

Generate Prisma, validate schema, run focused/full API tests, type-check, lint,
and build. Do not deploy migrations.

### Task 6: Backend Listening drafts and playback state

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801030000_add_toeic_listening_drafts/migration.sql`
- Create: `apps/api/src/module/toeic-listening/toeic-listening-draft.mapper.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/get-toeic-listening-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/save-toeic-listening-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/use-cases/delete-toeic-listening-draft.use-case.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-draft-migration.spec.ts`
- Create: `apps/api/src/module/toeic-listening/tests/toeic-listening-draft.use-cases.spec.ts`
- Modify: list/submit use cases, DTO/controller/module, and shared types.

**Interfaces:**

```ts
type ToeicListeningDraftPayload = {
  listeningSourceVersion: string;
  practicePart?: 1 | 2 | 3 | 4;
  activeQuestionId: number;
  answers: Array<{ questionId: number; optionId: number }>;
  reviewQuestionIds: number[];
  completedMediaIds: number[];
  activeMediaId: number | null;
  playbackPositionMs: number;
};
```

- [x] **Step 1: Write failing migration/use-case tests**

Cover unique account/test/scope, Full/Part constraints, JSON/array fields,
30-day expiry, cascades/indexes, foreign question/option/media rejection,
duplicate IDs, negative position, stale version behavior, and valid atomic
upsert.

- [x] **Step 2: Add list progress and submit-cleanup tests**

Summary progress uses only matching user/scope/current version. New attempt
deletes draft inside transaction; idempotent retry also cleans it; invalid
submissions preserve it.

- [x] **Step 3: Implement draft lifecycle**

Use scope `FULL` or `PART_<n>`. Validate complete snapshot before writing.
Expired/stale draft reads delete unusable rows. Total count comes from published
questions, never client payload.

- [x] **Step 4: Register draft routes**

Add guarded GET/PUT/DELETE under `tests/:testId/draft`.

- [x] **Step 5: Verify Task 6**

Generate Prisma, validate, run all Listening API tests plus full API gates. Do
not deploy migrations.

### Task 7: Web Listening resource, browser, and route-shaped skeletons

**Files:**

- Create: `apps/web/app/features/toeic-listening/api/toeic-listening.api.ts`
- Create: `apps/web/app/features/toeic-listening/hooks/use-toeic-listening.ts`
- Create: `apps/web/app/features/toeic-listening/toeic-listening-scope.ts`
- Create: resource/scope tests under `apps/web/app/features/toeic-listening/tests/`
- Create: `apps/web/app/features/toeic-listening/components/ToeicListeningScopeTabs.tsx`
- Create: `apps/web/app/features/toeic-listening/components/ToeicListeningListSkeleton.tsx`
- Create: `apps/web/app/views/toeic-listening/ToeicListeningListView.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/listening/page.tsx`
- Create: corresponding `loading.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicOverviewView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/test/toeic-reading-architecture.test.ts` or create
  `apps/web/test/toeic-listening-architecture.test.ts`

**Interfaces:**

- Resource methods mirror API routes with cache keys separated by Part.
- Browser consumes `ToeicListeningTestSummary.draftProgress`.

- [x] **Step 1: Write failing resource/route/message tests**

Require exact paths/keys, Full + Parts 1–4, default Part 1, thin server pages,
Listening-specific skeleton, matching EN/VI keys, enabled overview card, card
progressbar, and Start/Continue/Retry labels.

- [x] **Step 2: Implement resource hooks and routes**

Submission success clears matching draft cache and invalidates overview, lists,
attempts, and result.

- [x] **Step 3: Implement truthful browser**

Render natural Test order, exact selected-scope count, backend progress,
answered/remaining, latest result, and localized actions. Do not invent levels,
years, premium state, or client progress.

- [x] **Step 4: Verify Task 7**

Run focused Web tests, architecture, type-check, lint, and build.

### Task 8: Listening session, audio policy, autosave, and result

**Files:**

- Create: `apps/web/app/features/toeic-listening/toeic-listening-session-state.ts`
- Create: `apps/web/app/features/toeic-listening/toeic-listening-playback-policy.ts`
- Create: `apps/web/app/features/toeic-listening/toeic-listening-draft-queue.ts`
- Create: tests for each pure module.
- Create: `apps/web/app/features/toeic-listening/components/ToeicListeningPlayer.tsx`
- Create: Part question/group, navigation, session skeleton, result skeleton components.
- Create: `apps/web/app/views/toeic-listening/ToeicListeningSessionView.tsx`
- Create: `apps/web/app/views/toeic-listening/ToeicListeningResultView.tsx`
- Create: localized session/result page and loading routes.
- Modify: EN/VI catalogs and Listening architecture test.

**Interfaces:**

```ts
type ListeningPlaybackMode = "PRACTICE" | "FULL";
type ListeningPlaybackState = {
  activeMediaId: number | null;
  positionMs: number;
  completedMediaIds: number[];
  status: "IDLE" | "LOADING" | "PLAYING" | "PAUSED" | "ERROR" | "ENDED";
};
```

- [x] **Step 1: Write failing pure-state tests**

Cover draft restore filtering, answers/review, Part grouping, Full consumed media
cannot restart, practice replay/seek, Full pause/resume, ended transition,
network-error retry of the same incomplete asset, and serialized save collapse.

- [x] **Step 2: Write failing UI/architecture tests**

Require Part 1 image + A–D labels, Part 2 A–C labels with no text, Part 3/4
three-question group, Full Start gesture, absence/presence of seek/replay by
mode, transcript absent in session, transcript/result audio in result,
accessible playback/navigation states, and no `localStorage`.

- [x] **Step 3: Implement player and session lifecycle**

Wait for test and draft queries before initialization. In Full mode, preflight
the first media asset, require one Start click, follow numeric media order,
checkpoint position at a bounded interval plus pause/end, and enqueue full
snapshots through one latest-collapsing queue. Flush queue before submit.

- [x] **Step 4: Implement result review**

Render immutable total/per-Part scores, selected/correct answers, transcript,
translation, explanation, Part 1 image, and replayable review audio.

- [x] **Step 5: Verify Task 8**

Run all Listening Web tests, Web architecture, type-check, lint, production
build, Prettier, and `git diff --check`.

### Task 9: Documentation, operator handoff, and full regression

**Files:**

- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/features-overview.md`
- Create: `docs/data/toeic-listening-pipeline.md`

**Interfaces:**

- Documents local paths, exact commands, approved-SHA gate, schema ownership,
  playback policy, and recovery.

- [ ] **Step 1: Document exact operator workflow**

Record commands in this order:

```powershell
pnpm --filter @repo/api data:inventory-toeic-listening-practice -- --reading-inventory-sha=<approved-reading-sha>
pnpm --filter @repo/api data:download-toeic-listening-practice -- --approved-sha=<approved-listening-sha>
pnpm --filter @repo/api data:validate-toeic-listening-practice
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-toeic-listening-practice
```

Clarify that only the final two commands write the database and that the agent
does not execute them without operator approval.

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
pnpm exec prettier --check apps/api/scripts/toeic-listening-practice apps/api/src/module/toeic-listening apps/web/app/features/toeic-listening apps/web/app/views/toeic-listening packages/shared/src/types/toeic-listening.ts docs/architecture/api.md docs/architecture/frontend.md docs/features-overview.md docs/data/toeic-listening-pipeline.md
git diff --check
git status --short
```

- [ ] **Step 3: Report handoff**

Report test totals, migrations created but not applied, live commands not run,
private expected storage path, and the first required operator command. Do not
claim any provider data or database state was changed.
