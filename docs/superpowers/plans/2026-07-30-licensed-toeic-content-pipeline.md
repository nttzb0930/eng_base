# Licensed TOEIC Content Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrieve every authorized Dautoeic TOEIC mock test into private, checksummed canonical packages, validate complete 200-question tests, import them idempotently as Course-owned drafts, and let Admin review and explicitly publish them.

**Architecture:** Offline scripts isolate the provider adapter, private filesystem storage, canonical validation, and database import from runtime HTTP behavior. A dedicated `toeic-content` API capability stores test aggregates linked to Course `toeic-600`; Shared contracts and a thin Admin feature expose read/review and publish/unpublish behavior without learner attempts or progress.

**Tech Stack:** TypeScript 6, Node 24 APIs, Zod 4, NestJS 11, Prisma 7, PostgreSQL, Next.js 16, React Query, pnpm, Node test runner.

## Global Constraints

- Use only source records returned to the configured authorized identity; never guess IDs, bypass RLS, weaken filters, or retry authorization failures under another identity.
- Source and media hosts are explicit HTTPS allowlists.
- Credentials, signed URLs, full questions, transcripts, and answer keys never appear in Git or bounded logs.
- `var/licensed-content/` is private and ignored by Git; `TOEIC_CONTENT_STORAGE_DIR` may override it only after safe-path validation.
- Inventory never downloads media bodies or connects to PostgreSQL.
- Download never connects to PostgreSQL; import never calls the source.
- Every accepted test has exactly 200 questions, contiguous numbers `1..200`, Parts 1–7 with counts `6/25/39/30/30/16/54`, one correct option per question, resolvable stimuli, and verified media.
- Source identity is `source + sourceTestId`; unchanged drafts are skipped, changed drafts are transactionally replaced, and published tests are never modified by import.
- Import fails without writes when Course code `toeic-600` is absent.
- Publication revalidates the database aggregate and never creates learner availability in this phase.
- Do not execute real source inventory/download, apply the migration, import drafts, or publish content during implementation verification.
- Automated tests use synthetic repository-authored fixtures only.
- No dependency is added: use built-in `fetch`, streams, `crypto`, and filesystem APIs plus existing Zod/Prisma packages.
- Before Task 6, read `docs/agents/skills/ui-ux-pro-max/README.md` and its relevant web accessibility/dashboard skill as required by `AGENTS.md`.

---

## File Structure

```text
apps/api/scripts/toeic-content/
  canonical/toeic-canonical.ts
    Strict canonical schemas, 200-question aggregate validation, digests.
  canonical/toeic-canonical.test.ts
    Synthetic validation and deterministic checksum tests.
  source/toeic-source.ts
    Provider-neutral source records and adapter interface.
  source/dautoeic-source.ts
    Authorized Dautoeic/Supabase adapter and strict source mapping.
  source/dautoeic-source.test.ts
    Mock-fetch source parsing, authorization, and pagination tests.
  storage/private-content-storage.ts
    Safe storage-root resolution, atomic JSON/media writes, checkpoints.
  storage/private-content-storage.test.ts
    Traversal, unsafe root, resume, and checksum tests.
  inventory/toeic-inventory.ts
    Pure inventory aggregation and size reporting.
  inventory/toeic-inventory.test.ts
    Known/unknown size and count tests.
  download/toeic-downloader.ts
    Bounded retrieval, normalization, media streaming, package finalization.
  download/toeic-downloader.test.ts
    Retry, rate-limit, resume, rejection, and package tests.
  import/toeic-draft-import.ts
    Persistence-neutral idempotent import orchestration.
  import/toeic-draft-import.test.ts
    Fake-store create/update/skip/rollback tests.
  inventory-toeic-source.ts
    Explicit inventory CLI composition.
  download-toeic-source.ts
    Explicit download CLI composition.
  validate-toeic-content.ts
    Explicit private-package validation CLI.
  import-toeic-drafts.ts
    Explicit Prisma import CLI.
  toeic-command-boundary.test.ts
    Proves package commands remain offline and separated.

apps/api/prisma/
  schema.prisma
    Course-owned TOEIC aggregate models and publication enum.
  migrations/20260730210000_add_toeic_content/migration.sql
    Tables, indexes, uniqueness, foreign keys, and enum.

apps/api/src/module/toeic-content/
  index.ts
  toeic-content.module.ts
  admin-toeic-content.controller.ts
  dto/toeic-content.dto.ts
  repository/toeic-content.repository.ts
  repository/prisma-toeic-content.repository.ts
  mappers/toeic-content.mapper.ts
  use-cases/list-admin-toeic-tests.use-case.ts
  use-cases/get-admin-toeic-test.use-case.ts
  use-cases/publish-admin-toeic-test.use-case.ts
  use-cases/unpublish-admin-toeic-test.use-case.ts
  use-cases/toeic-publication.policy.ts
  tests/*.spec.ts

packages/shared/src/
  constants/toeic-content.ts
  types/toeic-content.ts
  constants/index.ts
  types/index.ts

apps/admin/app/
  (dashboard)/toeic-tests/page.tsx
  views/toeic-tests/ToeicTestsView.tsx
  features/toeic-content/api/toeic-content.api.ts
  features/toeic-content/hooks/use-toeic-content.ts
  features/toeic-content/components/ToeicTestsScreen.tsx
  features/toeic-content/components/ToeicTestReviewDialog.tsx
  features/toeic-content/tests/toeic-content.api.test.ts
  components/layout/admin-navigation.ts
  test/toeic-content-architecture.test.ts

docs/guides/licensed-toeic-content-operations.md
  Operator preflight, inventory, download, validate, import, review, publish.
```

### Task 1: Define canonical contracts and strict aggregate validation

**Files:**

- Create: `apps/api/scripts/toeic-content/canonical/toeic-canonical.ts`
- Create: `apps/api/scripts/toeic-content/canonical/toeic-canonical.test.ts`
- Create: `apps/api/scripts/toeic-content/fixtures/synthetic-toeic-test.ts`

**Interfaces:**

- Consumes: unknown normalized package JSON and verified media metadata.
- Produces:

```ts
export const TOEIC_PART_COUNTS = {
  1: 6,
  2: 25,
  3: 39,
  4: 30,
  5: 30,
  6: 16,
  7: 54,
} as const;

export type ToeicCanonicalTest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetId: string;
  sourceTestId: string;
  title: string;
  description: string | null;
  parts: Array<{
    part: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    stimuli: ToeicCanonicalStimulus[];
    questions: ToeicCanonicalQuestion[];
  }>;
};

export type ToeicCanonicalStimulus = {
  id: string;
  sourceStimulusId: string;
  part: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  order: number;
  passage: string | null;
  transcript: string | null;
  mediaIds: string[];
};

export type ToeicCanonicalQuestion = {
  sourceQuestionId: string;
  number: number;
  part: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  prompt: string | null;
  explanation: string | null;
  stimulusId: string | null;
  options: Array<{
    label: string;
    text: string;
    correct: boolean;
  }>;
};

export type ToeicCanonicalManifest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetId: string;
  sourceTestId: string;
  sourceUrl: string;
  retrievedAt: string;
  sourceVersion: string;
  license: { name: string; reference: string; intendedUse: string };
  files: Array<{
    path: string;
    sha256: string;
    bytes: number;
    mimeType: string;
  }>;
  validation: { status: "VALID"; reportSha256: string };
};

export function parseAndValidateCanonicalTest(
  input: unknown
): ToeicCanonicalTest;
export function parseAndValidateManifest(
  input: unknown
): ToeicCanonicalManifest;
export function validateToeicAggregate(
  test: ToeicCanonicalTest,
  media: ReadonlyMap<
    string,
    { sha256: string; bytes: number; mimeType: string }
  >
): { warnings: string[] };
export function stableJson(value: unknown): string;
export function sha256Text(value: string): string;
```

- [ ] **Step 1: Write the synthetic 200-question fixture**

Create a generator that produces exactly the approved part distribution:

```ts
export function makeSyntheticToeicTest(
  mutate: (test: ToeicCanonicalTest) => void = () => undefined
): ToeicCanonicalTest {
  let questionNumber = 1;
  const test: ToeicCanonicalTest = {
    schemaVersion: 1,
    source: "dautoeic",
    sourceSetId: "synthetic-set",
    sourceTestId: "synthetic-test",
    title: "Synthetic TOEIC Test",
    description: "Repository-authored fixture",
    parts: Object.entries(TOEIC_PART_COUNTS).map(([partText, count]) => {
      const part = Number(partText) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const stimulusId = part <= 4 ? `stimulus-${part}` : null;
      const questions = Array.from({ length: count }, () => {
        const number = questionNumber++;
        return {
          sourceQuestionId: `q-${number}`,
          number,
          part,
          prompt: part <= 2 ? null : `Synthetic prompt ${number}`,
          explanation: null,
          stimulusId,
          options: ["A", "B", "C", "D"]
            .slice(0, part === 2 ? 3 : 4)
            .map((label, index) => ({
              label,
              text: `Synthetic option ${number}-${label}`,
              correct: index === 0,
            })),
        };
      });
      const stimuli =
        stimulusId === null
          ? []
          : [
              {
                id: stimulusId,
                sourceStimulusId: `source-${stimulusId}`,
                part,
                order: 1,
                passage:
                  part >= 3 ? `Synthetic passage for Part ${part}` : null,
                transcript: `Synthetic transcript for Part ${part}`,
                mediaIds: [`media-${part}`],
              },
            ];
      return { part, stimuli, questions };
    }),
  };
  mutate(test);
  return test;
}
```

The fixture contains no source-derived wording or media.

- [ ] **Step 2: Write failing canonical validation tests**

Assert the valid fixture passes, then independently assert failure for 199
questions, duplicate/missing number, wrong part count, duplicate option label,
zero/two correct answers, unresolved stimulus, unresolved media, unexpected
field, unsafe media path, and manifest checksum mismatch:

```ts
const media = new Map(
  [1, 2, 3, 4].map((part) => [
    `media-${part}`,
    {
      sha256: `${part}`.repeat(64),
      bytes: 1024,
      mimeType: part === 1 ? "image/png" : "audio/mpeg",
    },
  ])
);
assert.doesNotThrow(() => validateToeicAggregate(valid, media));
assert.throws(
  () =>
    validateToeicAggregate(makeSyntheticToeicTest(removeQuestion200), media),
  /exactly 200 questions/u
);
assert.throws(
  () => validateToeicAggregate(makeSyntheticToeicTest(duplicateAnswer), media),
  /exactly one correct option/u
);
```

Also prove `stableJson` recursively sorts object keys and identical content
produces the same SHA-256 digest.

- [ ] **Step 3: Run the tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-content/canonical/toeic-canonical.test.ts
```

Expected: FAIL because `toeic-canonical.ts` does not exist.

- [ ] **Step 4: Implement strict Zod parsing and semantic validation**

Use `.strict()` on every object. Flatten all part questions, sort by `number`,
and collect path-specific errors:

```ts
const expectedNumbers = Array.from({ length: 200 }, (_, index) => index + 1);
const actualNumbers = questions
  .map(({ number }) => number)
  .sort((a, b) => a - b);
if (!isDeepStrictEqual(actualNumbers, expectedNumbers)) {
  errors.push("questions: expected unique contiguous numbers 1..200");
}
for (const [part, expected] of Object.entries(TOEIC_PART_COUNTS)) {
  const actual = questions.filter(
    (question) => question.part === Number(part)
  ).length;
  if (actual !== expected) {
    errors.push(
      `part ${part}: expected ${expected} questions, received ${actual}`
    );
  }
}
```

Require text prompts for Parts 3–7, permit media-led prompts for Parts 1–2,
resolve stimulus/media IDs through maps, and return sorted warning strings for
missing optional transcript/explanation.

- [ ] **Step 5: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-content/canonical/toeic-canonical.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS.

Commit:

```powershell
git add apps/api/scripts/toeic-content/canonical apps/api/scripts/toeic-content/fixtures
git commit -m "feat(api): validate canonical TOEIC content"
```

### Task 2: Build safe private storage and inventory

**Files:**

- Modify: `.gitignore`
- Create: `apps/api/scripts/toeic-content/storage/private-content-storage.ts`
- Create: `apps/api/scripts/toeic-content/storage/private-content-storage.test.ts`
- Create: `apps/api/scripts/toeic-content/source/toeic-source.ts`
- Create: `apps/api/scripts/toeic-content/inventory/toeic-inventory.ts`
- Create: `apps/api/scripts/toeic-content/inventory/toeic-inventory.test.ts`

**Interfaces:**

- Consumes: repository root, optional storage-root configuration, provider
  inventory records.
- Produces:

```ts
export type SourceMediaDescriptor = {
  id: string;
  url: string;
  kind: "AUDIO" | "IMAGE";
  declaredBytes: number | null;
  mimeType: string | null;
};

export type SourceTestSet = {
  sourceSetId: string;
  title: string;
  order: number;
};

export type SourceTestSummary = {
  sourceSetId: string;
  sourceTestId: string;
  title: string;
  order: number;
  advertisedQuestionCount: number | null;
};

export type SourcePassage = {
  sourcePassageId: string;
  part: number;
  order: number;
  passage: string | null;
  transcript: string | null;
  mediaIds: string[];
};

export type SourceQuestion = {
  sourceQuestionId: string;
  sourcePassageId: string | null;
  number: number;
  part: number;
  prompt: string | null;
  explanation: string | null;
  options: Array<{ label: string; text: string; correct: boolean }>;
};

export type SourceTestPayload = {
  test: SourceTestSummary;
  description: string | null;
  passages: SourcePassage[];
  questions: SourceQuestion[];
  media: SourceMediaDescriptor[];
};

export type DownloadCheckpoint = {
  sourceTestId: string;
  sourceVersion: string;
  verifiedStorageKeys: Array<{
    storageKey: string;
    bytes: number;
    sha256: string;
  }>;
};

export interface ToeicSource {
  listSets(): Promise<SourceTestSet[]>;
  listTests(setId: string): Promise<SourceTestSummary[]>;
  getTest(testId: string): Promise<SourceTestPayload>;
  inspectMedia(media: SourceMediaDescriptor): Promise<SourceMediaDescriptor>;
}

export function resolvePrivateStorageRoot(input: {
  repositoryRoot: string;
  configuredRoot?: string;
}): string;

export interface PrivateContentStorage {
  readCheckpoint(sourceTestId: string): Promise<DownloadCheckpoint | null>;
  writeCheckpoint(checkpoint: DownloadCheckpoint): Promise<void>;
  writeJsonAtomic(storageKey: string, value: unknown): Promise<void>;
  writeMedia(input: {
    storageKey: string;
    body: ReadableStream<Uint8Array>;
    expectedBytes: number | null;
    expectedSha256?: string;
  }): Promise<{ storageKey: string; bytes: number; sha256: string }>;
  hasVerifiedFile(input: {
    storageKey: string;
    bytes: number;
    sha256: string;
  }): Promise<boolean>;
}

export function buildInventory(
  sets: SourceTestSet[],
  tests: SourceTestSummary[],
  media: SourceMediaDescriptor[]
): ToeicInventoryReport;
```

- [ ] **Step 1: Write failing storage-safety tests**

Use `mkdtemp` test directories and assert the resolver accepts
`<repo>/var/licensed-content/toeic` but rejects repository root, home,
filesystem root, path traversal outside `var/licensed-content`, and a tracked
path:

```ts
assert.throws(
  () =>
    resolvePrivateStorageRoot({
      repositoryRoot,
      configuredRoot: repositoryRoot,
    }),
  /unsafe TOEIC content storage root/u
);
assert.equal(
  resolvePrivateStorageRoot({ repositoryRoot }),
  join(repositoryRoot, "var", "licensed-content", "toeic")
);
```

Test atomic JSON writes, checkpoint round trips, partial-file cleanup, and
streamed SHA-256 verification without loading the full asset into memory.

- [ ] **Step 2: Run storage tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-content/storage/private-content-storage.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement storage safety and ignore private content**

Add:

```gitignore
# licensed content pipeline artifacts
/var/licensed-content/
```

Resolve all paths with `resolve`, require a strict descendant of the configured
safe root, reject symlink escapes after parent creation with `realpath`, write
`*.partial`, verify byte count/digest, then rename atomically. Expose only
relative POSIX storage keys from package APIs.

- [ ] **Step 4: Write failing inventory aggregation tests**

Prove the report distinguishes known and unknown media sizes:

```ts
assert.deepEqual(buildInventory(sets, tests, media), {
  setCount: 8,
  testCount: 75,
  advertisedQuestionCount: 15000,
  media: {
    audioCount: 2,
    imageCount: 1,
    knownBytes: 3072,
    unknownSizeCount: 1,
  },
  incompleteTestIds: [],
});
```

Test stable sorting and duplicate source-ID rejection.

- [ ] **Step 5: Implement provider-neutral source types and inventory**

Use explicit types for set/test/passage/question/media data. `buildInventory`
must be pure, never call `fetch`, filesystem, environment, or Prisma, and never
include source tokens or question content in its return type.

- [ ] **Step 6: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-content/storage/private-content-storage.test.ts scripts/toeic-content/inventory/toeic-inventory.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
git check-ignore var/licensed-content/toeic/example
```

Expected: tests PASS and `git check-ignore` prints the example path.

Commit:

```powershell
git add .gitignore apps/api/scripts/toeic-content/storage apps/api/scripts/toeic-content/source/toeic-source.ts apps/api/scripts/toeic-content/inventory
git commit -m "feat(api): add private TOEIC content storage"
```

### Task 3: Implement the authorized source adapter and resumable downloader

**Files:**

- Create: `apps/api/scripts/toeic-content/source/dautoeic-source.ts`
- Create: `apps/api/scripts/toeic-content/source/dautoeic-source.test.ts`
- Create: `apps/api/scripts/toeic-content/download/toeic-downloader.ts`
- Create: `apps/api/scripts/toeic-content/download/toeic-downloader.test.ts`
- Create: `apps/api/scripts/toeic-content/inventory-toeic-source.ts`
- Create: `apps/api/scripts/toeic-content/download-toeic-source.ts`
- Create: `apps/api/scripts/toeic-content/validate-toeic-content.ts`
- Create: `apps/api/scripts/toeic-content/toeic-command-boundary.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: authorized source configuration, `ToeicSource`, safe storage,
  canonical validator.
- Produces:

```ts
export type DautoeicSourceConfig = {
  supabaseUrl: string;
  authorization: string;
  sourceWebUrl: string;
  allowedMediaHosts: string[];
  timeoutMs: number;
  maxRetries: number;
};

export function createDautoeicSource(
  config: DautoeicSourceConfig,
  request: typeof fetch
): ToeicSource;

export async function downloadAllToeicTests(input: {
  source: ToeicSource;
  storage: PrivateContentStorage;
  license: { name: string; reference: string; intendedUse: string };
  concurrency: number;
  now: () => Date;
}): Promise<ToeicDownloadSummary>;
```

- [ ] **Step 1: Write failing source-adapter tests with mocked fetch**

Mock paginated PostgREST responses for `mock_test_sets`, `mock_tests`,
`mock_test_questions`, and `mock_test_passages`. Assert strict mapping,
pagination, stable source IDs, URL encoding, and redacted errors. Assert:

```ts
await assert.rejects(source.listSets(), /source authorization failed/u);
assert.equal(requestsAfter403.length, 1);
assert.doesNotMatch(capturedLog, /Bearer|apikey|correct_answer/u);
```

Also prove the adapter rejects non-HTTPS source/media hosts, redirects outside
the allowlist, response bodies over the configured limit, and source shape
drift.

- [ ] **Step 2: Run source tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-content/source/dautoeic-source.test.ts
```

Expected: FAIL because `dautoeic-source.ts` does not exist.

- [ ] **Step 3: Implement bounded authorized PostgREST access**

Build requests only from configured base URL and fixed table/RPC names. Send
authorization via headers without serializing config:

```ts
const headers = {
  apikey: config.authorization,
  Authorization: `Bearer ${config.authorization}`,
  Accept: "application/json",
};
```

Use `AbortSignal.timeout`, page with deterministic ordering, honor
`Retry-After`, and retry only `429`/`5xx` with exponential backoff. Convert
`401`, `403`, and source JSON-shape failures into safe typed errors.

- [ ] **Step 4: Write failing downloader tests**

Using the synthetic source and in-memory/temporary storage, prove:

- all sets/tests are enumerated;
- concurrency never exceeds the configured limit;
- verified existing media/checkpoints are skipped;
- interrupted media resumes without finalizing a partial package;
- duplicate media digest reuses content-addressed storage;
- one invalid 199-question test is rejected while another valid test finalizes;
- rejected tests retain a private `validation.json` under a non-importable
  rejected-package path without copying question text into the report;
- a valid package contains `manifest.json`, `test.json`, `validation.json`, and
  verified media entries;
- manifest source version and SHA-256 are deterministic;
- no source calls occur during package-only validation.

- [ ] **Step 5: Implement normalization and package finalization**

Map source rows into `ToeicCanonicalTest`, group stimuli/questions by part,
derive deterministic ordering from source question numbers, stream media, then
call `validateToeicAggregate`. Write validation first, `test.json` second, and
`manifest.json` last so presence of a valid manifest marks a complete package.

Return:

```ts
export type ToeicDownloadSummary = {
  completed: string[];
  resumed: string[];
  rejected: Array<{ sourceTestId: string; errors: string[] }>;
  failed: Array<{ sourceTestId: string; category: string }>;
  downloadedBytes: number;
  reusedBytes: number;
};
```

Sort all arrays before reporting and truncate per-test errors to paths/messages
without copying source content.

- [ ] **Step 6: Compose explicit CLIs and boundary tests**

Add package commands:

```json
"data:inventory-toeic-source": "dotenv -e ../../.env -- tsx ./scripts/toeic-content/inventory-toeic-source.ts",
"data:download-toeic-source": "dotenv -e ../../.env -- tsx ./scripts/toeic-content/download-toeic-source.ts",
"data:validate-toeic-content": "dotenv -e ../../.env -- tsx ./scripts/toeic-content/validate-toeic-content.ts"
```

The CLIs require `TOEIC_SOURCE_URL`, `TOEIC_SOURCE_AUTHORIZATION`,
`TOEIC_LICENSE_NAME`, `TOEIC_LICENSE_REFERENCE`, and
`TOEIC_LICENSE_INTENDED_USE`; parse numeric limits conservatively; print only
bounded JSON summaries; and set `process.exitCode = 1` on failure.

The boundary test asserts inventory does not import downloader/Prisma, download
does not import Prisma, validation does not import source/Prisma, and no command
is referenced by build, seed, migration, test, or CI scripts.

- [ ] **Step 7: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-content/canonical/toeic-canonical.test.ts scripts/toeic-content/storage/private-content-storage.test.ts scripts/toeic-content/inventory/toeic-inventory.test.ts scripts/toeic-content/source/dautoeic-source.test.ts scripts/toeic-content/download/toeic-downloader.test.ts scripts/toeic-content/toeic-command-boundary.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS using mocked fetch; no network or database connection.

Commit:

```powershell
git add apps/api/scripts/toeic-content apps/api/package.json
git commit -m "feat(api): download authorized TOEIC content"
```

### Task 4: Add Course-owned TOEIC persistence and idempotent draft import

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260730210000_add_toeic_content/migration.sql`
- Create: `apps/api/src/module/toeic-content/repository/toeic-content.repository.ts`
- Create: `apps/api/src/module/toeic-content/repository/prisma-toeic-content.repository.ts`
- Create: `apps/api/scripts/toeic-content/import/toeic-draft-import.ts`
- Create: `apps/api/scripts/toeic-content/import/toeic-draft-import.test.ts`
- Create: `apps/api/scripts/toeic-content/import-toeic-drafts.ts`
- Create: `apps/api/src/module/toeic-content/tests/toeic-content-migration.spec.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: validated private canonical packages and Course code `toeic-600`.
- Produces:

```ts
export type ToeicDraftImportSummary = {
  created: string[];
  updated: string[];
  unchanged: string[];
  publishedSkipped: string[];
  rejected: string[];
  failed: Array<{ sourceTestId: string; category: string }>;
};

export type ValidatedToeicPackage = {
  manifest: ToeicCanonicalManifest;
  test: ToeicCanonicalTest;
  storagePrefix: string;
};

export interface ToeicDraftImportStore {
  requireCourseId(code: "toeic-600"): Promise<number>;
  importOne(
    courseId: number,
    packageData: ValidatedToeicPackage
  ): Promise<"CREATED" | "UPDATED" | "UNCHANGED" | "PUBLISHED_SKIPPED">;
}

export async function importToeicDrafts(input: {
  packages: ValidatedToeicPackage[];
  rejectedSourceTestIds: string[];
  store: ToeicDraftImportStore;
}): Promise<ToeicDraftImportSummary>;
```

- [ ] **Step 1: Write the failing migration contract test**

Assert the migration creates the enum and six tables, all snake-case mapped
names, `course_id` ownership, cascading aggregate children, source identity
uniqueness, test/question and question/option uniqueness, publication fields,
and no attempt/progress tables:

```ts
assert.match(sql, /CREATE TYPE "toeic_publication_status"/u);
assert.match(sql, /UNIQUE.*"source".*"source_test_id"/su);
assert.match(sql, /FOREIGN KEY \("course_id"\).*"courses"/su);
assert.doesNotMatch(sql, /attempt|score|progress/iu);
```

- [ ] **Step 2: Run migration test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-content/tests/toeic-content-migration.spec.ts
```

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Define Prisma models and hand-authored migration**

Add `toeic_test_sets`, `toeic_tests`, `toeic_stimuli`, `toeic_questions`,
`toeic_question_options`, and `toeic_media_assets` with mapped foreign keys,
timestamps, indexes, and `toeic_publication_status`. Add the reverse
`toeic_test_sets` relationship to `courses`.

Use database constraints:

```prisma
@@unique([course_id, source, source_set_id])
@@unique([source, source_test_id])
@@unique([test_id, number])
@@unique([question_id, label])
```

Keep the migration deterministic and do not apply it.

- [ ] **Step 4: Write failing import behavior tests**

Use a fake store and assert missing Course aborts before `importOne`, each
package receives the resolved Course ID, all four result categories are sorted,
rejected packages are never passed to the store, and one failed transaction
does not prevent later packages:

```ts
assert.deepEqual(await importToeicDrafts(input), {
  created: ["test-1"],
  updated: ["test-2"],
  unchanged: ["test-3"],
  publishedSkipped: ["test-4"],
  rejected: ["test-5"],
  failed: [],
});
```

- [ ] **Step 5: Implement orchestration and Prisma aggregate replacement**

The repository loads source identity and checksum. For `DRAFT` changes, execute
one `$transaction` that updates the test metadata, deletes old children through
aggregate cascades, and recreates stimuli, questions, options, and media.
For `PUBLISHED`, return `PUBLISHED_SKIPPED` before mutation. Map canonical
relative storage keys only.

Before any package loop:

```ts
const courseId = await store.requireCourseId("toeic-600");
```

Throw `Course toeic-600 does not exist` without creating it.

- [ ] **Step 6: Compose the explicit Prisma importer**

Add:

```json
"data:import-toeic-drafts": "dotenv -e ../../.env -- tsx ./scripts/toeic-content/import-toeic-drafts.ts"
```

Load and validate private packages before opening Prisma, compose the repository
with `scripts/support/script-prisma`, report bounded categories, disconnect in
`finally`, and never migrate or publish.

- [ ] **Step 7: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-content/tests/toeic-content-migration.spec.ts scripts/toeic-content/import/toeic-draft-import.test.ts scripts/toeic-content/toeic-command-boundary.test.ts
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS. `db:generate` updates only ignored/generated client output
and does not connect to PostgreSQL.

Commit:

```powershell
git add apps/api/prisma apps/api/src/module/toeic-content/repository apps/api/src/module/toeic-content/tests apps/api/scripts/toeic-content apps/api/package.json
git commit -m "feat(api): import TOEIC tests as Course drafts"
```

### Task 5: Expose Admin review and publication API

**Files:**

- Create: `packages/shared/src/constants/toeic-content.ts`
- Create: `packages/shared/src/types/toeic-content.ts`
- Modify: `packages/shared/src/constants/index.ts`
- Modify: `packages/shared/src/types/index.ts`
- Create: `apps/api/src/module/toeic-content/index.ts`
- Create: `apps/api/src/module/toeic-content/toeic-content.module.ts`
- Create: `apps/api/src/module/toeic-content/admin-toeic-content.controller.ts`
- Create: `apps/api/src/module/toeic-content/dto/toeic-content.dto.ts`
- Create: `apps/api/src/module/toeic-content/mappers/toeic-content.mapper.ts`
- Create: `apps/api/src/module/toeic-content/use-cases/toeic-publication.policy.ts`
- Create: `apps/api/src/module/toeic-content/use-cases/list-admin-toeic-tests.use-case.ts`
- Create: `apps/api/src/module/toeic-content/use-cases/get-admin-toeic-test.use-case.ts`
- Create: `apps/api/src/module/toeic-content/use-cases/publish-admin-toeic-test.use-case.ts`
- Create: `apps/api/src/module/toeic-content/use-cases/unpublish-admin-toeic-test.use-case.ts`
- Create: `apps/api/src/module/toeic-content/use-cases/get-admin-toeic-media.use-case.ts`
- Create: `apps/api/src/module/toeic-content/storage/toeic-media-storage.ts`
- Create: `apps/api/src/module/toeic-content/storage/filesystem-toeic-media-storage.ts`
- Create: `apps/api/src/module/toeic-content/tests/toeic-publication.policy.spec.ts`
- Create: `apps/api/src/module/toeic-content/tests/admin-toeic-content.use-cases.spec.ts`
- Create: `apps/api/src/module/toeic-content/tests/admin-toeic-content.controller.spec.ts`
- Create: `apps/api/test/toeic-content-architecture.test.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: persisted TOEIC aggregate and Admin JWT guard.
- Produces Admin routes:

```text
GET  /admin/toeic-tests
GET  /admin/toeic-tests/:id
POST /admin/toeic-tests/:id/publish
POST /admin/toeic-tests/:id/unpublish
GET  /admin/toeic-tests/:id/media/:mediaId
```

and Shared types:

```ts
export const TOEIC_PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ToeicPublicationStatus =
  (typeof TOEIC_PUBLICATION_STATUSES)[number];
export type AdminToeicTestSummary = {
  id: number;
  testSetTitle: string;
  source: string;
  sourceTestId: string;
  title: string;
  status: ToeicPublicationStatus;
  sourceVersion: string;
  contentSha256: string;
  licenseReference: string;
  retrievedAt: string;
  publishedAt: string | null;
  validationStatus: "VALID";
  questionCount: number;
  mediaCount: number;
};
export type AdminToeicTestDetail = AdminToeicTestSummary & {
  parts: AdminToeicPart[];
};
export type AdminToeicPart = {
  part: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  stimuli: Array<{
    id: number;
    passage: string | null;
    transcript: string | null;
    media: Array<{
      id: number;
      kind: "AUDIO" | "IMAGE";
      mimeType: string;
      bytes: number;
      previewUrl: string;
    }>;
  }>;
  questions: Array<{
    id: number;
    number: number;
    prompt: string | null;
    explanation: string | null;
    stimulusId: number | null;
    options: Array<{
      id: number;
      label: string;
      text: string;
      correct: boolean;
    }>;
  }>;
};
export type PaginatedAdminToeicTests = {
  data: AdminToeicTestSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};
export type ToeicPublicationAggregate = {
  id: number;
  courseCode: string;
  source: string;
  sourceTestId: string;
  sourceVersion: string;
  contentSha256: string;
  licenseReference: string;
  questionCount: number;
  partCounts: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>;
  questions: Array<{
    number: number;
    part: number;
    correctOptionCount: number;
    stimulusResolved: boolean;
  }>;
  media: Array<{ storageKey: string; databaseResolved: boolean }>;
};
export abstract class ToeicMediaStorage {
  abstract assertReadable(storageKeys: string[]): Promise<void>;
  abstract open(
    storageKey: string
  ): Promise<{ stream: NodeJS.ReadableStream; bytes: number }>;
}
export type AdminToeicTestQuery = {
  page: number;
  limit: number;
  status?: ToeicPublicationStatus;
  source?: string;
  sourceSetId?: string;
  search?: string;
};
```

- [ ] **Step 1: Write failing Shared and publication-policy tests**

Assert root exports work and policy rejects wrong total, part distribution,
answer count, unresolved stimulus/media, missing provenance/license, and a
Course code other than `toeic-600`:

```ts
assert.doesNotThrow(() => assertPublishableToeicTest(validAggregate));
assert.throws(
  () => assertPublishableToeicTest({ ...validAggregate, courseCode: "other" }),
  /toeic-600/u
);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/api exec tsx --test src/module/toeic-content/tests/toeic-publication.policy.spec.ts
```

Expected: FAIL because Shared exports and policy do not exist.

- [ ] **Step 3: Implement Shared contracts, mapper, and pure policy**

Keep runtime arrays in `constants/toeic-content.ts`; keep wire types in
`types/toeic-content.ts`; export through existing root barrels. Reuse the same
part-count constants semantically but do not import an offline script from the
runtime API. Policy input is a small repository result type and emits bounded
validation paths.

- [ ] **Step 4: Write failing use-case and controller tests**

Mock `ToeicContentRepository` and `ToeicMediaStorage`. Prove filters/pagination pass through, detail
maps all parts without absolute paths, publish calls policy before update,
unpublish clears `publishedAt`, missing tests return `NotFoundException`, and
all routes are guarded. Prove the media route resolves a database-owned storage
key for the requested test, rejects cross-test media IDs, and returns a stream
with the persisted MIME type without exposing an absolute path:

```ts
assert.deepEqual(controller.list(query), expectedPromise);
assert.equal(repository.publishCalls.length, 0);
assert.throws(() => publish.execute(invalidId), /not publishable/u);
```

- [ ] **Step 5: Implement repository-driven use cases and controller**

Add explicit repository methods:

```ts
export abstract class ToeicContentRepository {
  abstract list(query: AdminToeicTestQuery): Promise<PaginatedAdminToeicTests>;
  abstract findAggregate(id: number): Promise<ToeicPublicationAggregate | null>;
  abstract findDetail(id: number): Promise<AdminToeicTestDetail | null>;
  abstract publish(id: number, at: Date): Promise<AdminToeicTestDetail>;
  abstract unpublish(id: number): Promise<AdminToeicTestDetail>;
  abstract findMedia(
    testId: number,
    mediaId: number
  ): Promise<{ storageKey: string; mimeType: string; bytes: number } | null>;
}
```

Register the Prisma adapter using `{ provide: ToeicContentRepository, useClass:
PrismaToeicContentRepository }`. Controller methods only receive validated DTOs
and call one goal-named use case. `ToeicMediaStorage` validates the persisted
relative storage key against `TOEIC_CONTENT_STORAGE_DIR`, rejects symlink/path
escapes, and returns a Node readable stream. The controller wraps it in
Nest `StreamableFile` with the stored MIME type and `Content-Length`.
Before updating publication state, `PublishAdminToeicTestUseCase` asks the
storage adapter to verify every aggregate media key is currently readable; a
missing file fails publication even when its database row exists.

- [ ] **Step 6: Add architecture enforcement**

Prove the module is registered, owns Course-linked test content without
importing Course behavior, has `use-cases/`, `repository/`, and mocked
repository tests, exports Shared only from `@repo/shared`, and has no learner,
attempt, scoring, downloader, or provider controller.

Add `test/toeic-content-architecture.test.ts` to the API
`architecture:check` command.

- [ ] **Step 7: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/api exec tsx --test src/module/toeic-content/tests/toeic-publication.policy.spec.ts src/module/toeic-content/tests/admin-toeic-content.use-cases.spec.ts src/module/toeic-content/tests/admin-toeic-content.controller.spec.ts test/toeic-content-architecture.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS.

Commit:

```powershell
git add packages/shared apps/api/src/module/toeic-content apps/api/src/app.module.ts apps/api/test/toeic-content-architecture.test.ts apps/api/package.json
git commit -m "feat(api): review and publish TOEIC tests"
```

### Task 6: Build the Admin TOEIC review interface

**Files:**

- Create: `apps/admin/app/(dashboard)/toeic-tests/page.tsx`
- Create: `apps/admin/app/views/toeic-tests/ToeicTestsView.tsx`
- Create: `apps/admin/app/features/toeic-content/api/toeic-content.api.ts`
- Create: `apps/admin/app/features/toeic-content/hooks/use-toeic-content.ts`
- Create: `apps/admin/app/features/toeic-content/components/ToeicTestsScreen.tsx`
- Create: `apps/admin/app/features/toeic-content/components/ToeicTestReviewDialog.tsx`
- Create: `apps/admin/app/features/toeic-content/tests/toeic-content.api.test.ts`
- Create: `apps/admin/test/toeic-content-architecture.test.ts`
- Modify: `apps/admin/app/components/layout/admin-navigation.ts`

**Interfaces:**

- Consumes: Admin routes and Shared `AdminToeicTest*` contracts.
- Produces: `/toeic-tests` Admin list, filters, detail review, media preview,
  publish/unpublish controls.

- [ ] **Step 1: Read the required UI/UX guidance**

Read:

```powershell
Get-Content -Raw docs/agents/skills/ui-ux-pro-max/README.md
```

Follow its routing instructions to read the relevant dashboard, accessibility,
responsive, and visual-QA skill files completely before changing UI code.
Record the selected references in the implementation commentary.

- [ ] **Step 2: Write failing resource and architecture tests**

Assert exact paths/methods, query keys, mutation invalidation, thin server route
and view, feature-local client state, navigation entry, and root Shared imports:

```ts
assert.deepEqual(calls, [
  { method: "GET", path: "/admin/toeic-tests?page=1&limit=20" },
  { method: "GET", path: "/admin/toeic-tests/7" },
  { method: "POST", path: "/admin/toeic-tests/7/publish" },
  { method: "POST", path: "/admin/toeic-tests/7/unpublish" },
]);
assert.deepEqual(toeicContentKeys.detail(7), ["toeic-tests", "detail", 7]);
```

Architecture tests reject `"use client"` in `page.tsx`, API calls in the view,
and source/provider credentials anywhere under `apps/admin`.

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
pnpm --filter @repo/admin exec tsx --test app/features/toeic-content/tests/toeic-content.api.test.ts test/toeic-content-architecture.test.ts
```

Expected: FAIL because the feature does not exist.

- [ ] **Step 4: Implement API resource and React Query hooks**

Use `adminHttpClient`, encode only defined query fields with
`URLSearchParams`, require detail/mutation response data, and expose:

```ts
export function useToeicTests(query: AdminToeicTestQuery): UseQueryResult<...>;
export function useToeicTest(id: number | null): UseQueryResult<...>;
export function useSetToeicPublication(
  action: "publish" | "unpublish"
): UseMutationResult<...>;
```

Invalidate `toeicContentKeys.all` after publication changes.
Media preview URLs are same-origin authenticated Admin API URLs returned or
constructed from numeric test/media IDs; raw source URLs and filesystem keys
never enter component props.

- [ ] **Step 5: Implement the review UI**

The screen uses the existing Admin shell/data-table/button/dialog primitives:

- filters for search, status, and test set;
- columns for title, set, source ID, version, 200-question count, media count,
  status, retrieved date, and actions;
- truthful empty, loading, and error states;
- detail dialog with provenance/license block, checksum abbreviation with full
  accessible label, Parts 1–7 navigation, stimuli/transcript, question/options,
  correct-answer indicator, image preview, and native audio controls;
- publish confirmation summarizing validation requirements;
- disabled duplicate actions while mutation is pending;
- unpublish action for published tests.

Do not render absolute storage paths, credentials, or raw signed source URLs.
Use semantic buttons, labelled inputs, keyboard-operable part navigation,
visible focus, and no color-only correctness/status signal.

- [ ] **Step 6: Add thin route/view and navigation**

Use:

```tsx
// app/(dashboard)/toeic-tests/page.tsx
import { ToeicTestsView } from "@/app/views/toeic-tests/ToeicTestsView";
export default function ToeicTestsPage() {
  return <ToeicTestsView />;
}
```

The view returns `<ToeicTestsScreen />`. Add a `FileCheck2` navigation item
labelled `Đề TOEIC` and page title `Kiểm duyệt đề TOEIC`.

- [ ] **Step 7: Run functional and visual verification, then commit**

Run:

```powershell
pnpm --filter @repo/admin exec tsx --test app/features/toeic-content/tests/toeic-content.api.test.ts test/toeic-content-architecture.test.ts
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin lint
pnpm --filter @repo/admin build
```

Expected: all PASS.

With mocked/local API data only, inspect the screen at desktop and narrow
viewport, verify keyboard traversal, dialog focus return, visible loading/error
states, and audio/image fallbacks. Do not apply the migration or import source
content for this visual check.

Commit:

```powershell
git add apps/admin
git commit -m "feat(admin): review licensed TOEIC tests"
```

### Task 7: Document operations and run full offline verification

**Files:**

- Create: `docs/guides/licensed-toeic-content-operations.md`
- Modify: `docs/architecture/course-content.md`
- Modify: `docs/features-overview.md`

**Interfaces:**

- Consumes: completed commands, migration, API, and Admin route.
- Produces: safe operator runbook and truthful feature status.

- [ ] **Step 1: Write the operator runbook**

Document local environment variables without values, credential rotation, the
license confirmation checklist, safe storage/free-space preflight, and this
strict sequence:

```powershell
# Read-only source operation; no media body or database write
pnpm --filter @repo/api data:inventory-toeic-source

# Private source/media operation; no database write
pnpm --filter @repo/api data:download-toeic-source
pnpm --filter @repo/api data:validate-toeic-content

# Database operations only after naming and approving the target environment
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-toeic-drafts
```

Include expected summaries, disk cleanup rules that preserve complete packages,
resume behavior, failure categories, Course `toeic-600` prerequisite, Admin
review at `/toeic-tests`, publish/unpublish behavior, and the fact that no
learner route exists in this phase.

- [ ] **Step 2: Update architecture and feature status**

Document dedicated Course-owned TOEIC test aggregates as a justified extension
beside Course lessons, private canonical packages as the operational source,
and mark acquisition/review/publish as implemented but not yet run against a
real source/environment.

- [ ] **Step 3: Run the full offline gate**

Run:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
git diff --check
git status --short
git ls-files var/licensed-content
git grep -n -E "TOEIC_SOURCE_AUTHORIZATION=[^[:space:]]+|Bearer [A-Za-z0-9_-]{20,}" -- . ":(exclude)docs/superpowers/specs/2026-07-30-licensed-toeic-content-pipeline-design.md" ":(exclude)docs/superpowers/plans/2026-07-30-licensed-toeic-content-pipeline.md"
```

Expected: every gate exits zero; `git ls-files` returns no licensed content;
the credential scan returns no secret values or copied source answer-key
payloads. Synthetic test identifiers and property names in tests are allowed,
but no real source content is present.

- [ ] **Step 4: Commit documentation**

```powershell
git add docs
git commit -m "docs: document licensed TOEIC content operations"
```

- [ ] **Step 5: Complete the development branch**

Use `superpowers:verification-before-completion` and
`superpowers:finishing-a-development-branch`. Do not push or run real operating
commands. Report:

- commits created;
- verification evidence;
- migration not applied;
- source inventory/download not executed;
- drafts not imported or published;
- the exact operator commands awaiting separate environment authorization.
