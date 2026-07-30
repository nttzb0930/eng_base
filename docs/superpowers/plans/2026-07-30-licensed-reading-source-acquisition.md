# Licensed Reading Source Acquisition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acquire the 70 authorized public/free Dautoeic Reading passages into private canonical packages, import versioned review candidates, let Admin assign CEFR/Topic and convert accepted candidates to existing Reading drafts, then expose published passages by CEFR.

**Architecture:** Offline scripts enforce public/free source classification, approved inventory checksums, private filesystem packages, and strict source validation without database access. Reading owns a versioned source-candidate staging aggregate; Admin converts a candidate transactionally into the existing normalized Reading draft, while learner delivery continues to expose only explicitly published passages.

**Tech Stack:** TypeScript 6, Node fetch/crypto/filesystem APIs, Zod 4, NestJS 11, Prisma 7, PostgreSQL, Next.js 16, React Query, pnpm, Node test runner.

## Global Constraints

- This Reading phase runs before the previously planned TOEIC phase.
- Source queries require `is_free = true` and `is_hidden = false`; rows outside that filter are rejected before content download.
- Live source inventory is read-only and must be approved by SHA-256 before download.
- Source credentials, full source content, answers, and signed URLs never enter Git or bounded logs.
- `var/licensed-content/` is ignored by Git and is the only repository-local content storage root.
- Inventory and download never connect to PostgreSQL; import never calls the source.
- Source `level` values `1` and `2` are preserved but are never automatically mapped to CEFR.
- Admin must choose one of `A1`, `A2`, `B1`, or `B2` and a canonical Topic before conversion.
- Candidate import is idempotent by `source + sourceId + sourceVersion`; converted/rejected candidates are immutable.
- Conversion creates an existing `reading_passages` aggregate in `DRAFT`; it never publishes.
- Existing published Reading passages and learner attempts are never modified by source synchronization.
- Source HTML is stored privately and in candidate provenance, but it is never rendered with `dangerouslySetInnerHTML`; Admin edits a plain-text draft before conversion.
- Source translations, explanations, and vocabulary annotations remain in the candidate/canonical package in this phase; existing learner Reading contracts are not expanded to expose them.
- Automated tests use synthetic fixtures and mocked fetch only.
- Do not run a real source inventory/download, apply the migration, import candidates, convert candidates, or publish passages during implementation verification.

---

## File Structure

```text
apps/api/scripts/reading/source/
  reading-source.types.ts
    Provider-neutral source and access-classification types.
  reading-source.policy.ts
    Public/free filtering and approved-inventory comparison.
  reading-source.policy.test.ts
    Free/public acceptance and scope-expansion rejection tests.
  reading-source.canonical.ts
    Strict canonical schema, HTML-to-text derivation, validation, digests.
  reading-source.canonical.test.ts
    Synthetic content, question/answer, HTML, and checksum tests.
  dautoeic-reading-source.ts
    Authorized, paginated, explicit-column PostgREST adapter.
  dautoeic-reading-source.test.ts
    Mock-fetch query, shape, authorization, retry, and redaction tests.
  reading-source.storage.ts
    Safe private root, inventory/package/checkpoint atomic persistence.
  reading-source.storage.test.ts
    Traversal, root, checksum, atomic-write, and resume tests.
  reading-source.inventory.ts
    Read-only inventory aggregation and image-size estimation.
  reading-source.inventory.test.ts
    Deterministic accepted/excluded/size report tests.
  reading-source.download.ts
    Approved-inventory-gated canonical package download.
  reading-source.download.test.ts
    Scope drift, resume, package, image, and rejection tests.
  reading-source.import.ts
    Persistence-neutral candidate import orchestration.
  reading-source.import.test.ts
    Idempotency and immutable-state tests.
  inventory-reading-source.ts
    Explicit read-only inventory command.
  download-reading-source.ts
    Explicit private download command.
  validate-reading-source.ts
    Explicit offline package-validation command.
  import-reading-candidates.ts
    Explicit Prisma candidate-import command.
  reading-source-command-boundary.test.ts
    Prevents source/database/build boundary regressions.

apps/api/prisma/
  schema.prisma
  migrations/20260730220000_add_reading_source_candidates/migration.sql

apps/api/src/module/reading/
  repository/reading-source-candidate.repository.ts
  repository/prisma-reading-source-candidate.repository.ts
  dto/reading-source-candidate.dto.ts
  mappers/reading-source-candidate.mapper.ts
  use-cases/list-reading-source-candidates.use-case.ts
  use-cases/get-reading-source-candidate.use-case.ts
  use-cases/convert-reading-source-candidate.use-case.ts
  use-cases/reject-reading-source-candidate.use-case.ts
  tests/reading-source-candidate*.spec.ts
  admin-reading-source-candidates.controller.ts

packages/shared/src/
  constants/reading.ts
  types/reading.ts

apps/admin/app/
  (dashboard)/reading-source-candidates/page.tsx
  views/reading-source-candidates/ReadingSourceCandidatesView.tsx
  features/reading-source-candidates/api/reading-source-candidate.api.ts
  features/reading-source-candidates/hooks/use-reading-source-candidates.ts
  features/reading-source-candidates/components/ReadingSourceCandidatesScreen.tsx
  features/reading-source-candidates/components/ReadingSourceCandidateReviewDialog.tsx
  features/reading-source-candidates/tests/reading-source-candidate.api.test.ts
  test/reading-source-candidate-architecture.test.ts

apps/web/app/
  views/reading/ReadingListView.tsx
  features/reading/tests/reading-levels.test.ts
  messages/en.json
  messages/vi.json

docs/guides/licensed-reading-source-operations.md
```

### Task 1: Define the public/free source policy and canonical Reading contract

**Files:**

- Create: `apps/api/scripts/reading/source/reading-source.types.ts`
- Create: `apps/api/scripts/reading/source/reading-source.policy.ts`
- Create: `apps/api/scripts/reading/source/reading-source.policy.test.ts`
- Create: `apps/api/scripts/reading/source/reading-source.canonical.ts`
- Create: `apps/api/scripts/reading/source/reading-source.canonical.test.ts`

**Interfaces:**

- Consumes: unknown source rows and an approved inventory checksum.
- Produces:

```ts
export type ReadingSourceAccess = {
  isFree: boolean;
  isHidden: boolean;
  classification: "BASIC_FREE" | "EXCLUDED_NOT_FREE" | "EXCLUDED_HIDDEN";
};

export type ReadingSourceChoice = {
  label: string;
  text: string;
};

export type ReadingSourceQuestion = {
  question: string;
  choices: ReadingSourceChoice[];
  correct: string;
  explanation: string;
  translation: string;
};

export type ReadingSourceRow = {
  sourceId: string;
  title: string;
  topic: string | null;
  sourceLevel: "1" | "2";
  order: number;
  contentHtml: string;
  questions: ReadingSourceQuestion[];
  vocabulary: unknown[];
  access: ReadingSourceAccess;
  updatedAt: string;
};

export type CanonicalReadingSourcePackage = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceId: string;
  sourceVersion: string;
  sourceLevel: "1" | "2";
  title: string;
  sourceTopic: string | null;
  order: number;
  sourceHtml: string;
  plainTextDraft: string;
  questions: ReadingSourceQuestion[];
  vocabulary: unknown[];
  embeddedMedia: Array<{
    id: string;
    sourceUrl: string;
    storageKey: string;
    sha256: string;
    bytes: number;
    mimeType: string;
  }>;
};

export function classifyReadingSourceAccess(input: {
  isFree: boolean;
  isHidden: boolean;
}): ReadingSourceAccess;
export function assertApprovedReadingInventory(input: {
  approvedSha256: string;
  liveSha256: string;
  liveAcceptedSourceIds: string[];
  approvedAcceptedSourceIds: string[];
}): void;
export function parseReadingSourceRow(input: unknown): ReadingSourceRow;
export function buildCanonicalReadingPackage(
  row: ReadingSourceRow,
  media: CanonicalReadingSourcePackage["embeddedMedia"]
): CanonicalReadingSourcePackage;
export function validateCanonicalReadingPackage(
  input: unknown
): CanonicalReadingSourcePackage;
export function sourceHtmlToPlainText(html: string): string;
export function stableJson(value: unknown): string;
export function sha256Text(value: string): string;
```

- [ ] **Step 1: Write failing access-policy tests**

Assert only visible free rows are accepted:

```ts
assert.equal(
  classifyReadingSourceAccess({ isFree: true, isHidden: false }).classification,
  "BASIC_FREE"
);
assert.equal(
  classifyReadingSourceAccess({ isFree: false, isHidden: false })
    .classification,
  "EXCLUDED_NOT_FREE"
);
assert.equal(
  classifyReadingSourceAccess({ isFree: true, isHidden: true }).classification,
  "EXCLUDED_HIDDEN"
);
```

Prove the approved inventory check rejects a changed digest, a newly accepted
source ID, a removed accepted ID, and duplicate IDs. Error messages contain
only IDs/counts/checksum prefixes.

- [ ] **Step 2: Write failing canonical parsing tests**

Use synthetic source content:

```ts
const validRow = {
  id: "source-reading-1",
  title: "Synthetic Office Notice",
  topic: "Office",
  level: "1",
  order_index: 1,
  content_html: "<h1>Notice</h1><p>The office closes at five.</p>",
  questions_json: [
    {
      question: "When does the office close?",
      choices: [
        { label: "A", text: "At four" },
        { label: "B", text: "At five" },
      ],
      correct: "B",
      explanation: "The notice states the closing time.",
      translation: "Văn phòng đóng cửa lúc mấy giờ?",
    },
  ],
  vocabulary_json: [],
  is_free: true,
  is_hidden: false,
  updated_at: "2026-07-30T00:00:00.000Z",
};
```

Assert strict rejection for unknown root/question/choice fields, source level
outside `1|2`, blank title/HTML/question/choice, duplicate choice labels,
correct label absent from choices, no questions, duplicate normalized
questions, invalid timestamps, and non-free/hidden rows.

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/source/reading-source.policy.test.ts scripts/reading/source/reading-source.canonical.test.ts
```

Expected: FAIL because the policy/canonical modules do not exist.

- [ ] **Step 4: Implement strict schemas, validation, and deterministic digests**

Use strict Zod schemas matching the audited Dautoeic row:

```ts
const sourceChoiceSchema = z
  .object({ label: z.string().trim().min(1), text: z.string().trim().min(1) })
  .strict();
const sourceQuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    choices: z.array(sourceChoiceSchema).min(2),
    correct: z.string().trim().min(1),
    explanation: z.string(),
    translation: z.string(),
  })
  .strict();
```

The source row schema maps snake-case fields explicitly and rejects any row not
classified `BASIC_FREE`. Source version is the SHA-256 of stable JSON containing
only normalized source content and `updatedAt`.

- [ ] **Step 5: Implement conservative HTML-to-plain-text derivation**

The function never returns HTML for rendering. It:

1. removes complete `script`, `style`, `template`, `iframe`, `object`, and
   `embed` blocks;
2. converts `br`, `p`, `div`, `li`, `tr`, and headings to line boundaries;
3. strips remaining tags;
4. decodes only `amp`, `lt`, `gt`, `quot`, `apos`, `nbsp`, and numeric
   entities;
5. normalizes spaces while preserving paragraph breaks.

Tests prove scripts/event-handler text does not survive, entities decode
deterministically, repeated whitespace normalizes, and malformed HTML remains
plain text. No `dangerouslySetInnerHTML` consumer is added.

- [ ] **Step 6: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/source/reading-source.policy.test.ts scripts/reading/source/reading-source.canonical.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS.

Commit:

```powershell
git add apps/api/scripts/reading/source
git commit -m "feat(api): validate licensed Reading source content"
```

### Task 2: Implement private storage and read-only source inventory

**Files:**

- Modify: `.gitignore`
- Create: `apps/api/scripts/reading/source/reading-source.storage.ts`
- Create: `apps/api/scripts/reading/source/reading-source.storage.test.ts`
- Create: `apps/api/scripts/reading/source/reading-source.inventory.ts`
- Create: `apps/api/scripts/reading/source/reading-source.inventory.test.ts`
- Create: `apps/api/scripts/reading/source/dautoeic-reading-source.ts`
- Create: `apps/api/scripts/reading/source/dautoeic-reading-source.test.ts`
- Create: `apps/api/scripts/reading/source/inventory-reading-source.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: authorized Dautoeic configuration and mocked/built-in fetch.
- Produces:

```ts
export type ReadingSourceInventory = {
  schemaVersion: 1;
  source: "dautoeic";
  createdAt: string;
  visibleCount: number;
  acceptedCount: number;
  excludedNotFreeCount: number;
  excludedHiddenCount: number;
  sourceLevelCounts: Record<"1" | "2", number>;
  questionCount: number;
  embeddedImageCount: number;
  knownImageBytes: number;
  unknownImageSizeCount: number;
  acceptedSourceIds: string[];
  inventorySha256: string;
};

export interface DautoeicReadingSource {
  listAccessSummaries(): Promise<
    Array<{
      sourceId: string;
      sourceLevel: "1" | "2";
      isFree: boolean;
      isHidden: boolean;
    }>
  >;
  listReadingRows(): Promise<ReadingSourceRow[]>;
  inspectEmbeddedImage(url: string): Promise<{
    url: string;
    bytes: number | null;
    mimeType: string | null;
  }>;
  openEmbeddedImage(url: string): Promise<Response>;
}

export interface ReadingSourceStorage {
  writeInventory(inventory: ReadingSourceInventory): Promise<string>;
  readApprovedInventory(sha256: string): Promise<ReadingSourceInventory>;
  writePackageFile(
    sourceId: string,
    sourceVersion: string,
    name: "content.json" | "manifest.json" | "validation.json",
    value: unknown
  ): Promise<void>;
  writeMedia(input: {
    sourceId: string;
    sourceVersion: string;
    mediaId: string;
    response: Response;
  }): Promise<{
    storageKey: string;
    bytes: number;
    sha256: string;
    mimeType: string;
  }>;
  packageExists(sourceId: string, sourceVersion: string): Promise<boolean>;
}

export function createDautoeicReadingSource(input: {
  baseUrl: string;
  authorization: string;
  allowedHosts: string[];
  request: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
}): DautoeicReadingSource;
export function buildReadingSourceInventory(input: {
  accessSummaries: Array<{
    sourceId: string;
    sourceLevel: "1" | "2";
    isFree: boolean;
    isHidden: boolean;
  }>;
  rows: ReadingSourceRow[];
  images: Array<{ url: string; bytes: number | null; mimeType: string | null }>;
  createdAt: string;
}): ReadingSourceInventory;
```

- [ ] **Step 1: Write failing storage-safety tests**

Use temporary directories and assert the default resolves to
`<repo>/var/licensed-content/dautoeic`, while repository root, filesystem root,
home, traversal, symlink escape, and tracked repository paths are rejected.
Prove inventory/package writes are atomic, partial files never count as
packages, storage keys are relative POSIX paths, and checksum/byte mismatches
delete partial media.

- [ ] **Step 2: Write failing source-adapter tests**

Mock a paginated PostgREST response and assert the adapter uses an explicit
metadata query for `id,level,is_free,is_hidden`, followed by an explicit content
column list and fixed filters:

```text
reading_passages
  ?select=id,title,topic,level,order_index,content_html,questions_json,
          vocabulary_json,is_free,is_hidden,updated_at
  &is_free=eq.true
  &is_hidden=eq.false
  &order=order_index.asc,id.asc
```

Prove page continuation, stable order, strict row parsing, HTTPS/host allowlist,
body-size limit, timeout, `Retry-After`, retry only for `429|5xx`, and no retry
for `401|403|shape drift`. Captured errors/logs must not contain authorization,
question text, answers, or HTML.

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/source/reading-source.storage.test.ts scripts/reading/source/dautoeic-reading-source.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement storage and adapter**

Add:

```gitignore
# licensed content pipeline artifacts
/var/licensed-content/
```

Use built-in `fetch`, `AbortSignal.timeout`, streamed media writes, `crypto`
SHA-256, sibling `*.partial` files, `realpath` checks, and atomic rename.
Authorization remains in headers and is never serialized.

- [ ] **Step 5: Write and implement inventory tests**

Assert a deterministic report for 70 synthetic visible/free rows split across
source levels, question totals, unique embedded image URLs, known bytes, and
unknown sizes. Duplicate source IDs and a row whose access classifier is not
`BASIC_FREE` are blocking.

Inventory extracts only HTTPS `<img src>` URLs from source HTML for metadata
inspection. It does not download image bodies, connect to Prisma, or write
canonical packages.

Excluded counts come from access summaries only. The adapter never requests
title, HTML, questions, vocabulary, or media for a non-free or hidden row.

- [ ] **Step 6: Compose the explicit inventory command**

Add:

```json
"data:inventory-reading-source": "dotenv -e ../../.env -- tsx ./scripts/reading/source/inventory-reading-source.ts"
```

Require `READING_SOURCE_URL`, `READING_SOURCE_AUTHORIZATION`,
`READING_LICENSE_NAME`, `READING_LICENSE_REFERENCE`, and
`READING_LICENSE_INTENDED_USE`. Write the private inventory artifact and print
only counts, bytes, unknown-size count, and checksum.

- [ ] **Step 7: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/source/reading-source.storage.test.ts scripts/reading/source/dautoeic-reading-source.test.ts scripts/reading/source/reading-source.inventory.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
git check-ignore var/licensed-content/dautoeic/inventories/reading/example.json
```

Expected: all PASS and the private inventory path is ignored.

Commit:

```powershell
git add .gitignore apps/api/scripts/reading/source apps/api/package.json
git commit -m "feat(api): inventory public Reading source content"
```

### Task 3: Download and validate approved canonical Reading packages

**Files:**

- Create: `apps/api/scripts/reading/source/reading-source.download.ts`
- Create: `apps/api/scripts/reading/source/reading-source.download.test.ts`
- Create: `apps/api/scripts/reading/source/download-reading-source.ts`
- Create: `apps/api/scripts/reading/source/validate-reading-source.ts`
- Create: `apps/api/scripts/reading/source/reading-source-command-boundary.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: approved inventory, live source rows, private storage, license
  metadata.
- Produces:

```ts
export type ReadingSourceDownloadSummary = {
  approvedInventorySha256: string;
  completed: string[];
  resumed: string[];
  rejected: Array<{ sourceId: string; errors: string[] }>;
  failed: Array<{ sourceId: string; category: string }>;
  downloadedBytes: number;
  reusedBytes: number;
};

export type ReadingSourceManifest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceId: string;
  sourceVersion: string;
  sourceUrl: string;
  retrievedAt: string;
  accessClassification: "BASIC_FREE";
  license: { name: string; reference: string; intendedUse: string };
  approvedInventorySha256: string;
  contentSha256: string;
  files: Array<{
    storageKey: string;
    sha256: string;
    bytes: number;
    mimeType: string;
  }>;
};

export async function downloadReadingSource(input: {
  source: DautoeicReadingSource;
  storage: ReadingSourceStorage;
  approvedInventory: ReadingSourceInventory;
  license: { name: string; reference: string; intendedUse: string };
  concurrency: number;
  now: () => Date;
}): Promise<ReadingSourceDownloadSummary>;
```

- [ ] **Step 1: Write failing downloader tests**

Prove:

- live accepted IDs and digest must equal the approved inventory;
- source scope drift stops before package/media writes;
- all approved items download with bounded concurrency;
- an existing complete source version is resumed/skipped;
- embedded images are streamed and content-address checked;
- unsupported/failed images reject only their owning passage;
- invalid answer labels and malformed source HTML produce private
  `validation.json` under `rejected/`;
- valid package finalization writes `validation.json`, then `content.json`, then
  `manifest.json`;
- manifest includes source/license/version/access/inventory checksum/file
  digests without credentials;
- one rejected passage does not discard valid packages.

- [ ] **Step 2: Run downloader tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/source/reading-source.download.test.ts
```

Expected: FAIL because the downloader does not exist.

- [ ] **Step 3: Implement approved-inventory-gated download**

Recompute live inventory from the same fixed query, call
`assertApprovedReadingInventory`, then process only approved IDs. Build
canonical content, download allowlisted images, validate, and finalize the
manifest last. Sort all summary arrays and bound each rejection to safe
field-path messages.

- [ ] **Step 4: Compose explicit download and validation commands**

Add:

```json
"data:download-reading-source": "dotenv -e ../../.env -- tsx ./scripts/reading/source/download-reading-source.ts",
"data:validate-reading-source": "dotenv -e ../../.env -- tsx ./scripts/reading/source/validate-reading-source.ts"
```

Download additionally requires `READING_APPROVED_INVENTORY_SHA256`.
Package-only validation requires no source URL/credential and never imports
Prisma.

- [ ] **Step 5: Add command-boundary tests**

Assert:

- inventory does not import downloader/Prisma;
- downloader does not import Prisma;
- validation does not import source/Prisma;
- no Reading source command appears in app startup, build, seed, migration,
  tests, or CI;
- scripts contain no literal credential or real source content.

- [ ] **Step 6: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/source/reading-source.policy.test.ts scripts/reading/source/reading-source.canonical.test.ts scripts/reading/source/reading-source.storage.test.ts scripts/reading/source/dautoeic-reading-source.test.ts scripts/reading/source/reading-source.inventory.test.ts scripts/reading/source/reading-source.download.test.ts scripts/reading/source/reading-source-command-boundary.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS without network/database access.

Commit:

```powershell
git add apps/api/scripts/reading/source apps/api/package.json
git commit -m "feat(api): download licensed Reading source packages"
```

### Task 4: Add versioned Reading candidates and expand CEFR support

**Files:**

- Modify: `packages/shared/src/constants/reading.ts`
- Modify: `packages/shared/src/types/reading.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260730220000_add_reading_source_candidates/migration.sql`
- Create: `apps/api/src/module/reading/tests/reading-source-candidate-migration.spec.ts`
- Modify: `apps/api/src/module/reading/tests/reading-content.policy.spec.ts`
- Modify: `apps/api/src/module/reading/use-cases/reading-content.policy.ts`
- Create: `apps/api/scripts/reading/source/reading-source.import.ts`
- Create: `apps/api/scripts/reading/source/reading-source.import.test.ts`
- Create: `apps/api/scripts/reading/source/import-reading-candidates.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: valid canonical packages.
- Produces:

```ts
export const READING_CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export const READING_SOURCE_CANDIDATE_STATUSES = [
  "PENDING",
  "CONVERTED",
  "REJECTED",
] as const;

export type ReadingCandidateImportSummary = {
  created: string[];
  unchanged: string[];
  immutableSkipped: string[];
  rejected: string[];
  failed: Array<{ sourceId: string; category: string }>;
};

export interface ReadingCandidateImportStore {
  importOne(
    sourcePackage: CanonicalReadingSourcePackage,
    manifest: ReadingSourceManifest
  ): Promise<"CREATED" | "UNCHANGED" | "IMMUTABLE_SKIPPED">;
}
```

- [ ] **Step 1: Write failing CEFR and migration tests**

Assert all four CEFR values pass Shared/API policy and an unknown level fails
with `Unsupported Reading CEFR level`.

Assert the migration:

- replaces the old `cefr_level = A1` check with `A1|A2|B1|B2`;
- creates `reading_source_candidate_status`;
- creates `reading_source_candidates`;
- stores source/provider/version/checksum/access/license/inventory/source level,
  source title/topic/HTML/plain draft/canonical JSON/status/rejection reason,
  optional converted passage, and timestamps;
- uniquely constrains `(source, source_id, source_version)`;
- links converted passage with `ON DELETE SET NULL`;
- adds no learner attempt/progress table.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/api exec tsx --test src/module/reading/tests/reading-content.policy.spec.ts src/module/reading/tests/reading-source-candidate-migration.spec.ts
```

Expected: FAIL because levels/migration do not exist.

- [ ] **Step 3: Implement Shared constants and migration**

Update the policy message to `Unsupported Reading CEFR level`. Add the Prisma
model and hand-authored migration without applying it. Candidate
`canonical_json` is JSONB; source HTML is retained for provenance, while
`plain_text_draft` is the editable conversion baseline.

- [ ] **Step 4: Write failing candidate-import tests**

Use a fake store and prove:

- valid package creates `PENDING`;
- identical version/checksum is unchanged;
- an existing `CONVERTED` or `REJECTED` version is immutable;
- a changed source version creates a separate pending candidate;
- invalid/rejected private packages never reach the store;
- one failed candidate does not prevent later candidates;
- summaries are deterministic and sorted.

- [ ] **Step 5: Implement import orchestration and explicit Prisma command**

Add:

```json
"data:import-reading-candidates": "dotenv -e ../../.env -- tsx ./scripts/reading/source/import-reading-candidates.ts"
```

Load/validate packages before Prisma, upsert only candidate rows, never create
`reading_passages`, disconnect in `finally`, and print bounded categories.

- [ ] **Step 6: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/api exec tsx --test src/module/reading/tests/reading-content.policy.spec.ts src/module/reading/tests/reading-source-candidate-migration.spec.ts scripts/reading/source/reading-source.import.test.ts scripts/reading/source/reading-source-command-boundary.test.ts
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS; migration is not applied.

Commit:

```powershell
git add packages/shared apps/api/prisma apps/api/src/module/reading apps/api/scripts/reading/source apps/api/package.json
git commit -m "feat(reading): stage licensed source candidates"
```

### Task 5: Add Admin candidate review, classification, conversion, and rejection

**Files:**

- Create: `apps/api/src/module/reading/repository/reading-source-candidate.repository.ts`
- Create: `apps/api/src/module/reading/repository/prisma-reading-source-candidate.repository.ts`
- Create: `apps/api/src/module/reading/dto/reading-source-candidate.dto.ts`
- Create: `apps/api/src/module/reading/mappers/reading-source-candidate.mapper.ts`
- Create: `apps/api/src/module/reading/use-cases/list-reading-source-candidates.use-case.ts`
- Create: `apps/api/src/module/reading/use-cases/get-reading-source-candidate.use-case.ts`
- Create: `apps/api/src/module/reading/use-cases/convert-reading-source-candidate.use-case.ts`
- Create: `apps/api/src/module/reading/use-cases/reject-reading-source-candidate.use-case.ts`
- Create: `apps/api/src/module/reading/admin-reading-source-candidates.controller.ts`
- Modify: `apps/api/src/module/reading/reading.module.ts`
- Create: `apps/api/src/module/reading/tests/reading-source-candidate.use-cases.spec.ts`
- Create: `apps/api/src/module/reading/tests/reading-source-candidate.controller.spec.ts`
- Modify: `apps/api/test/reading-architecture.test.ts`
- Modify: `packages/shared/src/types/reading.ts`
- Create: `apps/admin/app/(dashboard)/reading-source-candidates/page.tsx`
- Create: `apps/admin/app/views/reading-source-candidates/ReadingSourceCandidatesView.tsx`
- Create: `apps/admin/app/features/reading-source-candidates/api/reading-source-candidate.api.ts`
- Create: `apps/admin/app/features/reading-source-candidates/hooks/use-reading-source-candidates.ts`
- Create: `apps/admin/app/features/reading-source-candidates/components/ReadingSourceCandidatesScreen.tsx`
- Create: `apps/admin/app/features/reading-source-candidates/components/ReadingSourceCandidateReviewDialog.tsx`
- Create: `apps/admin/app/features/reading-source-candidates/tests/reading-source-candidate.api.test.ts`
- Create: `apps/admin/test/reading-source-candidate-architecture.test.ts`
- Modify: `apps/admin/app/components/layout/admin-navigation.ts`

**Interfaces:**

- Consumes: pending source candidates, Topic options, Admin classification and
  edited Reading draft payload.
- Produces:

```text
GET  /admin/reading-source-candidates
GET  /admin/reading-source-candidates/:id
POST /admin/reading-source-candidates/:id/convert
POST /admin/reading-source-candidates/:id/reject
```

```ts
export type AdminReadingSourceCandidateSummary = {
  id: number;
  source: string;
  sourceId: string;
  sourceVersion: string;
  sourceLevel: "1" | "2";
  sourceTitle: string;
  sourceTopic: string | null;
  status: "PENDING" | "CONVERTED" | "REJECTED";
  contentSha256: string;
  licenseReference: string;
  questionCount: number;
  importedAt: string;
  convertedPassageId: number | null;
};

export type AdminReadingSourceCandidateDetail =
  AdminReadingSourceCandidateSummary & {
    sourceHtml: string;
    plainTextDraft: string;
    questions: Array<{
      question: string;
      translation: string;
      explanation: string;
      choices: ReadingSourceChoice[];
      correct: string;
    }>;
    vocabulary: unknown[];
    rejectionReason: string | null;
  };

export type ConvertReadingSourceCandidatePayload = CreateReadingPassagePayload;
export type RejectReadingSourceCandidatePayload = { reason: string };
```

- [ ] **Step 1: Read required UI/UX guidance**

Read `docs/agents/skills/ui-ux-pro-max/README.md` completely, then follow its
routing instructions for dashboard, forms, accessibility, responsive, and
visual-QA guidance before changing Admin UI.

- [ ] **Step 2: Write failing API use-case/controller tests**

Mock `ReadingSourceCandidateRepository`. Prove list/detail mapping, not-found,
status guards, Topic existence, Reading content validation, duplicate slug
conflict, transaction behavior, and rejection reason validation.

Conversion repository contract:

```ts
export abstract class ReadingSourceCandidateRepository {
  abstract list(query: ReadingSourceCandidateQuery): Promise<...>;
  abstract findDetail(id: number): Promise<AdminReadingSourceCandidateDetail | null>;
  abstract topicExists(topicId: number): Promise<boolean>;
  abstract convertToDraft(input: {
    candidateId: number;
    payload: ConvertReadingSourceCandidatePayload;
  }): Promise<{ candidate: AdminReadingSourceCandidateDetail; passage: AdminReadingPassage }>;
  abstract reject(input: {
    candidateId: number;
    reason: string;
  }): Promise<AdminReadingSourceCandidateDetail>;
}
```

`convertToDraft` uses one Prisma transaction to create the normalized existing
Reading aggregate with `DRAFT` status and mark the candidate `CONVERTED`.
`PENDING` is required; converted/rejected candidates cannot convert again.

- [ ] **Step 3: Implement backend and architecture enforcement**

Add goal-named use cases and an Admin-JWT-guarded controller. Register the
repository adapter in `ReadingModule`. Return source HTML only as a string;
never return storage paths, source authorization, or signed URLs.

Extend the architecture test to require the repository/use-case/test profile
for source candidates and to reject provider/downloader imports from runtime
Reading HTTP code.

- [ ] **Step 4: Write failing Admin resource/architecture tests**

Assert exact paths/methods, query keys, invalidation, thin server route/view,
root Shared imports, navigation, and no `dangerouslySetInnerHTML`:

```ts
assert.deepEqual(calls, [
  { method: "GET", path: "/admin/reading-source-candidates?page=1&limit=20" },
  { method: "GET", path: "/admin/reading-source-candidates/7" },
  {
    method: "POST",
    path: "/admin/reading-source-candidates/7/convert",
    body: payload,
  },
  {
    method: "POST",
    path: "/admin/reading-source-candidates/7/reject",
    body: { reason: "Duplicate" },
  },
]);
```

- [ ] **Step 5: Implement Admin review UI**

The screen provides:

- status/source-level/search filters;
- provenance, version/checksum, source topic/level, question count;
- side-by-side escaped source HTML `<pre>` and editable plain-text draft;
- source questions, translations, explanations, choices, and correct labels;
- editable slug/title/body/questions;
- mandatory CEFR and Topic selectors;
- estimated reading minutes;
- `Convert to Reading draft` confirmation;
- rejection dialog with required reason;
- link to the converted passage;
- loading/error/empty states and disabled duplicate actions.

React renders source HTML as text only. Correctness uses icon/text in addition
to color. Controls are labelled, keyboard operable, focus-visible, and usable
at narrow viewport.

- [ ] **Step 6: Run GREEN, visual check, and commit**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/api exec tsx --test src/module/reading/tests/reading-source-candidate.use-cases.spec.ts src/module/reading/tests/reading-source-candidate.controller.spec.ts test/reading-architecture.test.ts
pnpm --filter @repo/admin exec tsx --test app/features/reading-source-candidates/tests/reading-source-candidate.api.test.ts test/reading-source-candidate-architecture.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/admin check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/admin lint
pnpm --filter @repo/admin build
```

Expected: all PASS. Inspect mocked-data desktop/narrow layouts, keyboard flow,
dialog focus return, escaped HTML, long passages, and error states.

Commit:

```powershell
git add packages/shared apps/api/src/module/reading apps/api/test apps/admin
git commit -m "feat(admin): review licensed Reading candidates"
```

### Task 6: Expose published Reading by CEFR and document operations

**Files:**

- Modify: `apps/web/app/views/reading/ReadingListView.tsx`
- Create: `apps/web/app/features/reading/tests/reading-levels.test.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/app/[locale]/(main)/reading/loading.tsx`
- Create: `docs/guides/licensed-reading-source-operations.md`
- Modify: `docs/architecture/course-content.md`
- Modify: `docs/features-overview.md`

**Interfaces:**

- Consumes: existing level-filtered Reading API.
- Produces: truthful A1/A2/B1/B2 learner tabs and operating runbook.

- [ ] **Step 1: Write failing learner level tests**

Assert all four CEFR tabs render from `READING_CEFR_LEVELS`, the selected tab
drives `useReadingPassages(level)`, URL query `?level=A2` initializes A2, invalid
query falls back to A1, level changes preserve locale, and each level has
localized label/empty copy.

- [ ] **Step 2: Implement level-aware learner list and matching skeleton**

Keep `page.tsx` thin. Put URL/query/client state in `ReadingListView`. Render
only published API results for the selected level. The page-specific loading
skeleton mirrors the level selector, header, and reading-card list rather than
using a generic layout.

- [ ] **Step 3: Write the operating runbook**

Document:

```powershell
# Read-only source; no media body/database write
pnpm --filter @repo/api data:inventory-reading-source

# After reviewing and setting READING_APPROVED_INVENTORY_SHA256
pnpm --filter @repo/api data:download-reading-source
pnpm --filter @repo/api data:validate-reading-source

# Only after naming/approving the target database
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-reading-candidates
```

Include license/source environment variables without values, disk preflight,
expected 70-row snapshot as non-binding evidence, checksum approval, resume,
rejected packages, Admin candidate classification, draft conversion, existing
Reading review/publication, learner smoke test by level, and rollback/unpublish.

- [ ] **Step 4: Run the full offline verification gate**

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
git grep -n -E "READING_SOURCE_AUTHORIZATION=[^[:space:]]+|Bearer [A-Za-z0-9_-]{20,}" -- . ":(exclude)docs/superpowers/specs/2026-07-30-licensed-basic-content-acquisition-design.md" ":(exclude)docs/superpowers/plans/2026-07-30-licensed-reading-source-acquisition.md"
```

Expected: every gate exits zero; no private package/credential/source content
is tracked.

- [ ] **Step 5: Commit docs and complete the branch**

Commit:

```powershell
git add apps/web docs
git commit -m "feat(web): browse published Reading by CEFR"
```

Use `superpowers:verification-before-completion` and
`superpowers:finishing-a-development-branch`. Report that migration, real
inventory/download, candidate import/conversion, and publication remain
unexecuted until separately authorized against named environments.
