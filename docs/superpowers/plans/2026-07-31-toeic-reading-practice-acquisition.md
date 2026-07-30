# TOEIC Reading Practice Acquisition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build offline commands that inventory the 10 newest public/free 2026 Dautoeic mock tests, download only their 1,000 Part 5–7 questions and referenced passages as private canonical JSON, and validate the packages without a database or real source calls during tests.

**Architecture:** A provider adapter exposes bounded mock-test metadata, Reading questions, passages, and optional practice statistics. Pure canonical and inventory modules validate and checksum data, while a private filesystem adapter atomically stores approved inventories and per-test packages; thin CLIs compose these pieces and never import Prisma.

**Tech Stack:** TypeScript 6, Node.js 24 APIs, Zod 4, built-in `fetch`, `crypto`, and `node:test`, pnpm.

## Global Constraints

- Keep the existing `var/licensed-content/dautoeic/reading/` packages untouched.
- The pilot selects source set `2026`, limits selection to 10 public/free tests, and downloads only Parts 5, 6, and 7.
- Each completed package contains exactly 30 Part 5, 16 Part 6, and 54 Part 7 questions numbered `101..200`.
- Do not fetch Listening Parts 1–4, transcripts, or audio.
- Default download writes JSON with Reading media marked `PENDING`; media download is a separate explicit operation.
- Dynamic Level/error-rate statistics are stored separately and never affect content identity or version.
- Inventory, download, and validation do not load `.env`, import Prisma, or connect to PostgreSQL.
- Never log authorization, answer bodies, full question content, or signed URL query parameters.
- Do not run real inventory or download during implementation verification.
- Use only records returned to the configured anonymous/public authorization context; do not enumerate hidden IDs or bypass RLS/product access controls.
- Add no dependency.

---

## File Structure

```text
apps/api/scripts/toeic-reading-practice/
  toeic-reading-practice.types.ts
    Provider-neutral source, canonical package, inventory, storage, and summary types.
  toeic-reading-practice.canonical.ts
    Zod source parsing, canonical mapping, validation, stable JSON, and SHA-256.
  toeic-reading-practice.canonical.test.ts
    Synthetic Part 5–7 mapping, counts, numbering, answer, and checksum tests.
  dautoeic-toeic-reading-source.ts
    Bounded Supabase/PostgREST adapter for sets, tests, questions, passages, and stats.
  dautoeic-toeic-reading-source.test.ts
    Mock-fetch request, pagination, filters, shape, retry, and redaction tests.
  toeic-reading-practice.inventory.ts
    Deterministic 2026/10-test selection and Reading count/size report.
  toeic-reading-practice.inventory.test.ts
    Ordering, free/hidden exclusion, limit, counts, and checksum tests.
  toeic-reading-practice.storage.ts
    Safe private root, atomic inventories/packages, package enumeration, media state.
  toeic-reading-practice.storage.test.ts
    Path safety, atomic files, package identity, and resume tests.
  toeic-reading-practice.download.ts
    Approved-inventory orchestration and per-test canonical package finalization.
  toeic-reading-practice.download.test.ts
    Reading-only requests, stats snapshot, resume, reject, and bounded summary tests.
  toeic-reading-practice.cli.ts
    Profile, private authorization, CLI option, and approved-SHA parsing.
  toeic-reading-practice.profile.json
    Versioned public endpoint, allowlist, license metadata, timeout, retries, concurrency.
  inventory-toeic-reading-practice.ts
    Inventory command composition.
  download-toeic-reading-practice.ts
    JSON-only package download composition.
  validate-toeic-reading-practice.ts
    Offline package validation composition.
  toeic-reading-practice-command-boundary.test.ts
    No-env/no-Prisma/no-network-boundary characterization.
apps/api/package.json
  Adds the three explicit operator commands.
docs/guides/licensed-toeic-reading-practice-operations.md
  Windows CMD commands, expected pilot counts, safety, resume, and inspection.
```

### Task 1: Define canonical Reading-test contracts and validation

**Files:**

- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.types.ts`
- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.canonical.ts`
- Test: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.canonical.test.ts`

**Interfaces:**

- Consumes: unknown source question/passage rows already associated with one selected source test.
- Produces:

```ts
export const TOEIC_READING_PART_COUNTS = { 5: 30, 6: 16, 7: 54 } as const;
export type ToeicReadingPart = keyof typeof TOEIC_READING_PART_COUNTS;

export type ToeicReadingPracticeTest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetId: string;
  sourceTestId: string;
  sourceVersion: string;
  title: string;
  parts: Array<{
    part: ToeicReadingPart;
    stimuli: ToeicReadingStimulus[];
    questions: ToeicReadingQuestion[];
  }>;
  media: ToeicReadingMediaReference[];
};

export function buildToeicReadingPracticeTest(input: {
  sourceSetId: string;
  sourceTestId: string;
  title: string;
  questions: unknown[];
  passages: unknown[];
}): Omit<ToeicReadingPracticeTest, "sourceVersion">;

export function validateToeicReadingPracticeTest(
  value: unknown,
  options?: { requireDownloadedMedia?: boolean },
): { valid: boolean; errors: string[] };

export function sha256Canonical(value: unknown): string;
export function withSourceVersion(
  value: Omit<ToeicReadingPracticeTest, "sourceVersion">,
): ToeicReadingPracticeTest;
```

- [ ] **Step 1: Write failing canonical tests**

Create synthetic rows for numbers `101..200`, with 30/16/54 distribution,
four choices, one correct answer, and Part 6/7 passage relations. Assert:

```ts
assert.deepEqual(
  canonical.parts.map(({ part, questions }) => [part, questions.length]),
  [[5, 30], [6, 16], [7, 54]],
);
assert.equal(validateToeicReadingPracticeTest(canonical).valid, true);
assert.equal(withSourceVersion(input).sourceVersion, withSourceVersion(input).sourceVersion);
```

Also assert rejection of Part 4, missing question 119, duplicate IDs/numbers,
invalid answer labels, two correct choices, missing Part 6/7 passages, and
downloaded-media validation when media remains `PENDING`.

- [ ] **Step 2: Run RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-reading-practice/toeic-reading-practice.canonical.test.ts
```

Expected: FAIL because the canonical module does not exist.

- [ ] **Step 3: Implement strict source mapping and deterministic validation**

Use strict Zod schemas for the known source columns:

```ts
const questionColumns = [
  "id", "test_id", "part", "section", "question_number", "passage_id",
  "image_url", "question_text", "option_a", "option_b", "option_c",
  "option_d", "correct_answer", "order_index", "dich_nghia",
  "explanation_vi",
] as const;
```

Map `correct_answer` labels `A..D` into exactly one `correct: true` choice,
normalize empty optional strings to `null`, sort Parts and questions
numerically, derive unique media references from Reading image URLs, and
exclude mutable statistics from `sha256Canonical`.

- [ ] **Step 4: Run GREEN and commit**

Run the Task 1 test and `pnpm --filter @repo/api check-types`. Expect PASS.

Commit:

```powershell
git add apps/api/scripts/toeic-reading-practice
git commit -m "feat(api): define TOEIC Reading canonical packages"
```

### Task 2: Implement public source inventory and pilot selection

**Files:**

- Create: `apps/api/scripts/toeic-reading-practice/dautoeic-toeic-reading-source.ts`
- Test: `apps/api/scripts/toeic-reading-practice/dautoeic-toeic-reading-source.test.ts`
- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.inventory.ts`
- Test: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.inventory.test.ts`

**Interfaces:**

- Consumes: HTTPS Supabase URL, anonymous key, fixed host allowlist, source set label, and test limit.
- Produces:

```ts
export type ToeicReadingSource = {
  listSets(): Promise<ToeicSourceSet[]>;
  listTests(): Promise<ToeicSourceTest[]>;
  listQuestionIndex(sourceTestId: string): Promise<ToeicQuestionIndexRow[]>;
  readQuestions(sourceTestId: string): Promise<unknown[]>;
  readPassages(sourceTestId: string): Promise<unknown[]>;
  readPracticeStats(part: 5 | 6 | 7): Promise<ToeicPracticeStat[] | null>;
};

export function createDautoeicToeicReadingSource(config: {
  baseUrl: string;
  authorization: string;
  allowedHosts: string[];
  request: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  pageSize?: number;
}): ToeicReadingSource;

export async function inventoryToeicReadingPractice(input: {
  source: Pick<ToeicReadingSource, "listSets" | "listTests" | "listQuestionIndex">;
  sourceSet: string;
  limitTests: number;
  observedAt: string;
}): Promise<ToeicReadingInventory>;
```

- [ ] **Step 1: Write failing adapter tests**

Mock PostgREST pages for `mock_test_sets`, `mock_tests`, and the question index.
Assert fixed requests include:

```text
mock_test_sets?select=id,name,order_index,is_hidden
mock_tests?select=id,set_id,name,order_index,is_free,is_hidden,updated_at
mock_test_questions?select=id,test_id,part,question_number,passage_id,image_url&test_id=eq.<id>&part=in.(5,6,7)
```

Assert deterministic pagination, only HTTPS/allowlisted redirects, one request
after `403`, bounded `429/5xx` retries, response-size limits, and error strings
that contain neither the key nor source content.

- [ ] **Step 2: Run adapter RED**

Run the adapter test. Expected: module-not-found FAIL.

- [ ] **Step 3: Implement bounded PostgREST and RPC access**

Reuse the established Reading adapter conventions:

```ts
headers: {
  Accept: "application/json",
  apikey: authorization,
  Authorization: `Bearer ${authorization}`,
}
```

Use `AbortSignal.timeout`, `limit/offset`, deterministic `order`, retry only
`429/5xx`, and return `null` rather than failing content acquisition when the
optional practice-statistics RPC is unavailable.

- [ ] **Step 4: Write failing inventory tests**

Provide multiple sets and 12 tests. Assert the set named `2026` is selected,
hidden and non-free tests are excluded, source order chooses the newest 10,
and every selected test advertises `30/16/54`:

```ts
assert.equal(inventory.selectedTests.length, 10);
assert.deepEqual(inventory.questionCounts, { "5": 300, "6": 160, "7": 540 });
assert.equal(inventory.totalQuestions, 1000);
assert.match(inventory.inventorySha256, /^[a-f0-9]{64}$/u);
```

- [ ] **Step 5: Implement inventory and run GREEN**

Sort by set/test `order_index` and stable ID tie-breakers. Include selected IDs,
counts, exclusions, media references, observed time, and checksum. Do not read
question bodies or media.

Run both Task 2 tests and typecheck. Expect PASS.

Commit:

```powershell
git add apps/api/scripts/toeic-reading-practice
git commit -m "feat(api): inventory public TOEIC Reading tests"
```

### Task 3: Add private storage and resumable JSON download

**Files:**

- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.storage.ts`
- Test: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.storage.test.ts`
- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.download.ts`
- Test: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.download.test.ts`

**Interfaces:**

- Consumes: approved inventory checksum, source adapter, canonical builder.
- Produces:

```ts
export type ToeicReadingStorage = {
  writeInventory(value: ToeicReadingInventory): Promise<string>;
  readInventory(sha256: string): Promise<ToeicReadingInventory>;
  packageExists(sourceTestId: string, sourceVersion: string): Promise<boolean>;
  writePackageFile(
    sourceTestId: string,
    sourceVersion: string,
    name: "content.json" | "practice-stats.json" | "validation.json" | "manifest.json",
    value: unknown,
  ): Promise<void>;
  listCompletePackages(): Promise<Array<{ sourceTestId: string; sourceVersion: string }>>;
  readPackageFile(sourceTestId: string, sourceVersion: string, name: string): Promise<unknown>;
};

export async function downloadToeicReadingPractice(input: {
  source: ToeicReadingSource;
  storage: ToeicReadingStorage;
  approvedInventorySha256: string;
  now: () => Date;
}): Promise<ToeicReadingDownloadSummary>;
```

- [ ] **Step 1: Write storage RED tests**

Use a temporary directory. Assert roots outside
`var/licensed-content/dautoeic` are rejected unless explicitly configured to a
safe private directory, path traversal is rejected, `.partial` files are
atomically renamed, and packages are complete only when `manifest.json`
exists.

- [ ] **Step 2: Implement private storage and run storage GREEN**

Follow `reading-source.storage.ts`, but store inventory at
`inventories/toeic-reading-practice/<sha>.json` and packages at
`toeic-reading-practice/<sourceTestId>/<sourceVersion>/`.

- [ ] **Step 3: Write downloader RED tests**

With an in-memory source and storage, assert:

- only approved test IDs are requested;
- only question Parts 5–7 are returned;
- only passages referenced by those questions are retained;
- no audio/transcript fetch exists;
- a valid test writes `content.json`, optional `practice-stats.json`,
  `validation.json`, then `manifest.json` last;
- stats changes do not change `sourceVersion`;
- an existing manifest reports the test under `resumed`;
- a 99-question test is rejected without a complete manifest;
- summary arrays are sorted and contain IDs/categories, never content.

- [ ] **Step 4: Implement download orchestration**

For each approved test, fetch questions/passages, build and validate canonical
content, select applicable stats by question/passage IDs, calculate
`sourceVersion`, and atomically finalize. Return:

```ts
export type ToeicReadingDownloadSummary = {
  completed: string[];
  resumed: string[];
  rejected: Array<{ sourceTestId: string; errors: string[] }>;
  failed: Array<{ sourceTestId: string; category: string }>;
  questionCounts: Record<"5" | "6" | "7", number>;
};
```

- [ ] **Step 5: Run GREEN and commit**

Run Task 1–3 tests, API typecheck, and API lint. Expect PASS.

Commit:

```powershell
git add apps/api/scripts/toeic-reading-practice
git commit -m "feat(api): download private TOEIC Reading packages"
```

### Task 4: Compose no-env CLIs, operations guide, and boundaries

**Files:**

- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.cli.ts`
- Create: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.profile.json`
- Create: `apps/api/scripts/toeic-reading-practice/inventory-toeic-reading-practice.ts`
- Create: `apps/api/scripts/toeic-reading-practice/download-toeic-reading-practice.ts`
- Create: `apps/api/scripts/toeic-reading-practice/validate-toeic-reading-practice.ts`
- Test: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice-command-boundary.test.ts`
- Modify: `apps/api/package.json`
- Create: `docs/guides/licensed-toeic-reading-practice-operations.md`

**Interfaces:**

- Consumes: CLI `--set`, `--limit-tests`, `--approved-sha`,
  `--authorization`, and the ignored authorization file.
- Produces operator commands and bounded JSON summaries.

- [ ] **Step 1: Write CLI and boundary RED tests**

Assert:

```ts
assert.deepEqual(parseOptions(["--set=2026", "--limit-tests=10"]), {
  sourceSet: "2026",
  limitTests: 10,
});
assert.throws(() => parseOptions(["--limit-tests=0"]), /positive integer/u);
assert.throws(() => parseOptions(["--approved-sha=bad"]), /SHA-256/u);
```

Read command sources as text and assert inventory does not import downloader or
Prisma, download does not import Prisma, validation does not import source or
Prisma, package scripts contain no `dotenv`, and none of the commands is
invoked by build/test/migration/seed scripts.

- [ ] **Step 2: Implement profile and runtime parsing**

Profile values:

```json
{
  "schemaVersion": 1,
  "source": "dautoeic",
  "sourceWebUrl": "https://dautoeic.com/mock-test",
  "apiBaseUrl": "https://qfhmnlvgweznzcsoijyr.supabase.co",
  "allowedHosts": ["qfhmnlvgweznzcsoijyr.supabase.co"],
  "license": {
    "name": "Public basic/free source access",
    "reference": "https://dautoeic.com/mock-test",
    "intendedUse": "English Base TOEIC Reading review; publication requires admin approval"
  },
  "timeoutMs": 20000,
  "maxRetries": 3,
  "downloadConcurrency": 2
}
```

Read authorization from `--authorization` or
`var/licensed-content/dautoeic/source-authorization.txt`. Never print it.

- [ ] **Step 3: Implement three thin commands**

Add:

```json
"data:inventory-toeic-reading-practice": "tsx ./scripts/toeic-reading-practice/inventory-toeic-reading-practice.ts",
"data:download-toeic-reading-practice": "tsx ./scripts/toeic-reading-practice/download-toeic-reading-practice.ts",
"data:validate-toeic-reading-practice": "tsx ./scripts/toeic-reading-practice/validate-toeic-reading-practice.ts"
```

Inventory defaults to `--set=2026 --limit-tests=10`. Download requires
`--approved-sha=<64 lowercase hex>`. Validation reads complete packages only
and performs no source request. Each command sets a non-zero exit code on safe,
redacted failure.

- [ ] **Step 4: Write the Windows operations guide**

Document:

```cmd
pnpm --filter @repo/api data:inventory-toeic-reading-practice
pnpm --filter @repo/api data:download-toeic-reading-practice -- --approved-sha=PASTE_INVENTORY_SHA
pnpm --filter @repo/api data:validate-toeic-reading-practice
```

Explain expected `300/160/540`, private paths, how to inspect JSON, resume, and
that the first implementation intentionally does not download media despite
the future `--media-only` design.

- [ ] **Step 5: Run feature verification**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test "scripts/toeic-reading-practice/*.test.ts"
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api architecture:check
git check-ignore var/licensed-content/dautoeic/source-authorization.txt
git diff --check
```

Expected: all tests/gates PASS, the private authorization path is ignored, and
no real network/database call occurs.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/package.json apps/api/scripts/toeic-reading-practice docs/guides/licensed-toeic-reading-practice-operations.md
git commit -m "feat(api): add TOEIC Reading acquisition commands"
```

## Final Verification

Do not execute the operator commands. Run:

```powershell
pnpm --filter @repo/api exec tsx --test "scripts/toeic-reading-practice/*.test.ts"
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api architecture:check
git diff --check
git status --short
```

Review tracked files for credentials:

```powershell
git grep -n -E "Bearer [A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}" -- . ":(exclude)docs/superpowers/specs/2026-07-30-licensed-basic-content-acquisition-design.md" ":(exclude)docs/superpowers/plans/2026-07-30-licensed-reading-source-acquisition.md"
```

Expected: feature and API gates PASS; no source credential appears in tracked
files; only the operator performs real inventory/download afterward.
