# Vocabulary Audio Catalog Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, confirmation-gated command that copies only valid database-only Vocabulary audio pairs into the canonical catalog without writing PostgreSQL.

**Architecture:** A pure planner owns identity matching, validation, classification, fingerprints, confirmation, and catalog transformation. A thin CLI loads validated canonical sources and a bounded Prisma projection, writes a read-only ignored plan report, and performs a backup plus atomic catalog replacement only for a confirmed current plan.

**Tech Stack:** TypeScript, Node.js test runner, Prisma, PostgreSQL, pnpm workspace scripts, JSON canonical data.

## Global Constraints

- Vocabulary identity is exactly `normalizedWord + pos + cefrLevel` through the existing `vocabularyIdentity` helper.
- The workflow may change only `audioUrl` and `audioSource` in `vocabulary-catalog.json`.
- `plan` performs no catalog, database, or provider write; writing its ignored report is allowed.
- The command never writes PostgreSQL and never calls an external provider.
- Only HTTPS URLs on exact host `api.dictionaryapi.dev` with source `free-dictionary-api` are importable.
- Apply requires a token bound to sanitized database target, catalog fingerprint, live audio fingerprint, and plan fingerprint.
- Catalog backup and working report remain ignored and must not be committed.
- Database bootstrap apply remains outside this plan and requires separate explicit approval.

---

### Task 1: Pure audio reconciliation planner

**Files:**

- Create: `apps/api/scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.ts`
- Create: `apps/api/scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.test.ts`

**Interfaces:**

- Consumes: `VocabularyCatalogItem`, `vocabularyIdentity`, sanitized `databaseTarget`, and bounded database audio rows.
- Produces: `buildVocabularyAudioReconciliationPlan`, `applyVocabularyAudioImports`, `VocabularyAudioDatabaseRow`, and `VocabularyAudioReconciliationPlan`.

- [ ] **Step 1: Write failing tests for safe imports and field preservation**

Create the test file with a complete catalog fixture and assert that only an absent catalog pair receives a supported database pair:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import type { VocabularyCatalogItem } from "../catalog/vocabulary-catalog.js";
import {
  applyVocabularyAudioImports,
  buildVocabularyAudioReconciliationPlan,
  type VocabularyAudioDatabaseRow,
} from "./vocabulary-audio-reconciliation.js";

const item = (
  normalizedWord: string,
  overrides: Partial<VocabularyCatalogItem> = {}
): VocabularyCatalogItem => ({
  word: normalizedWord,
  normalizedWord,
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "A1",
  meaningVi: `nghĩa ${normalizedWord}`,
  primaryMeaningVi: `nghĩa ${normalizedWord}`,
  source: "fixture",
  topics: ["fixture-topic"],
  ...overrides,
});

const row = (
  id: number,
  normalizedWord: string,
  overrides: Partial<VocabularyAudioDatabaseRow> = {}
): VocabularyAudioDatabaseRow => ({
  id,
  normalizedWord,
  pos: "noun",
  cefrLevel: "A1",
  audioUrl: null,
  audioSource: null,
  ...overrides,
});

test("imports only a supported database pair into an empty catalog pair", () => {
  const catalog = [
    item("apple", { phonetic: "/apple/" }),
    item("book", {
      audioUrl: "https://api.dictionaryapi.dev/media/book.mp3",
      audioSource: "free-dictionary-api",
    }),
  ];
  const databaseRows = [
    row(1, "apple", {
      audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
      audioSource: "free-dictionary-api",
    }),
    row(2, "book", {
      audioUrl: "https://api.dictionaryapi.dev/media/book.mp3",
      audioSource: "free-dictionary-api",
    }),
  ];

  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget: "localhost:5432/eng_base?schema=public",
  });
  const merged = applyVocabularyAudioImports(catalog, plan);

  assert.equal(plan.summary.import, 1);
  assert.equal(plan.summary.unchanged, 1);
  assert.deepEqual(merged[0], {
    ...catalog[0],
    audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
    audioSource: "free-dictionary-api",
  });
  assert.deepEqual(merged[1], catalog[1]);
  assert.equal(merged.length, catalog.length);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.test.ts
```

Expected: FAIL because `vocabulary-audio-reconciliation.ts` does not exist.

- [ ] **Step 3: Add failing classification and blocker tests**

Add separate tests that construct real rows and assert:

```ts
test("reports conflicts, partial pairs, invalid URLs, unsupported sources, missing and external identities", () => {
  const catalog = [
    item("conflict", {
      audioUrl: "https://api.dictionaryapi.dev/media/catalog.mp3",
      audioSource: "free-dictionary-api",
    }),
    item("partial", {
      audioUrl: "https://api.dictionaryapi.dev/media/partial.mp3",
    }),
    item("invalid-url"),
    item("unsupported"),
    item("missing"),
  ];
  const databaseRows = [
    row(1, "conflict", {
      audioUrl: "https://api.dictionaryapi.dev/media/database.mp3",
      audioSource: "free-dictionary-api",
    }),
    row(2, "partial"),
    row(3, "invalid-url", {
      audioUrl: "http://api.dictionaryapi.dev/media/insecure.mp3",
      audioSource: "free-dictionary-api",
    }),
    row(4, "unsupported", {
      audioUrl: "https://cdn.example.test/audio.mp3",
      audioSource: "unknown-provider",
    }),
    row(5, "external"),
  ];

  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget: "localhost:5432/eng_base?schema=public",
  });

  assert.equal(plan.summary.conflict, 1);
  assert.equal(plan.summary.invalidPartial, 1);
  assert.equal(plan.summary.invalidUrl, 1);
  assert.equal(plan.summary.unsupportedSource, 1);
  assert.equal(plan.summary.missingDatabaseIdentity, 1);
  assert.equal(plan.summary.externalDatabaseIdentity, 1);
  assert.equal(plan.blocked, true);
  assert.throws(() => applyVocabularyAudioImports(catalog, plan), /blocked/iu);
});

test("duplicate database identity blocks reconciliation", () => {
  const catalog = [item("apple")];
  const databaseRows = [row(1, "apple"), row(2, "apple")];
  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget: "localhost:5432/eng_base?schema=public",
  });
  assert.equal(plan.summary.duplicateDatabaseIdentity, 1);
  assert.equal(plan.blocked, true);
});
```

- [ ] **Step 4: Implement the minimal pure planner**

Create `vocabulary-audio-reconciliation.ts` with these exact public shapes:

```ts
import { createHash } from "node:crypto";

import {
  vocabularyIdentity,
  type VocabularyCatalogItem,
} from "../catalog/vocabulary-catalog.js";

export type VocabularyAudioDatabaseRow = {
  id: number;
  normalizedWord: string;
  pos: string;
  cefrLevel: string;
  audioUrl: string | null;
  audioSource: string | null;
};

export type VocabularyAudioImport = {
  identity: string;
  databaseId: number;
  audioUrl: string;
  audioSource: "free-dictionary-api";
};

export type VocabularyAudioReconciliationSummary = {
  catalogRecords: number;
  databaseRows: number;
  catalogAudioBefore: number;
  catalogAudioAfter: number;
  import: number;
  unchanged: number;
  catalogOnly: number;
  conflict: number;
  invalidPartial: number;
  invalidUrl: number;
  unsupportedSource: number;
  missingDatabaseIdentity: number;
  externalDatabaseIdentity: number;
  duplicateDatabaseIdentity: number;
};

export type VocabularyAudioReconciliationIssue = {
  kind:
    | "conflict"
    | "invalid-partial"
    | "invalid-url"
    | "unsupported-source"
    | "missing-database-identity"
    | "external-database-identity"
    | "duplicate-database-identity";
  identity: string;
  databaseIds: number[];
};

export type VocabularyAudioReconciliationPlan = {
  version: 1;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  confirmation: string;
  blocked: boolean;
  summary: VocabularyAudioReconciliationSummary;
  imports: VocabularyAudioImport[];
  issues: VocabularyAudioReconciliationIssue[];
};

export function buildVocabularyAudioReconciliationPlan(input: {
  catalog: VocabularyCatalogItem[];
  databaseRows: VocabularyAudioDatabaseRow[];
  databaseTarget: string;
}): VocabularyAudioReconciliationPlan;

export function applyVocabularyAudioImports(
  catalog: VocabularyCatalogItem[],
  plan: VocabularyAudioReconciliationPlan
): VocabularyCatalogItem[];
```

Implementation requirements inside those functions:

1. Hash `JSON.stringify(value)` with SHA-256 and sort database rows by canonical identity then numeric ID before hashing.
2. Build database identity buckets with `vocabularyIdentity` using the row's normalized word, POS, and CEFR.
3. Treat only `null` and `undefined` as absent. Empty strings are invalid partial values.
4. Validate a complete database pair by parsing `new URL(audioUrl)` and requiring protocol `https:`, hostname `api.dictionaryapi.dev`, empty username/password, and source `free-dictionary-api`.
5. Add one classification count for every catalog identity; add external and duplicate database issues independently.
6. Set `blocked` when any issue except `external-database-identity` exists.
7. Hash a core object containing version, target, source/live hashes, summary, sorted imports, and sorted issues; derive confirmation as `RECONCILE_AUDIO_${sha256({ databaseTarget, sourceSha256, liveSha256, planSha256 }).slice(0, 24).toUpperCase()}`.
8. In `applyVocabularyAudioImports`, reject blocked plans, verify the current catalog hash equals `sourceSha256`, map imports by identity, preserve order with `catalog.map`, and spread the original item before setting only the two audio properties.

- [ ] **Step 5: Run planner tests and verify GREEN**

Run the narrow command from Step 2.

Expected: all reconciliation planner tests PASS with no provider or database access.

- [ ] **Step 6: Commit the pure planner**

```powershell
git add apps/api/scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.ts apps/api/scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.test.ts
git commit -m "feat(data): plan vocabulary audio reconciliation"
```

---

### Task 2: Confirmation-gated CLI and atomic catalog writer

**Files:**

- Create: `apps/api/scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.ts`
- Create: `apps/api/scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.test.ts`

**Interfaces:**

- Consumes: planner exports from Task 1, `assertVocabularySourcesValid`, `resolveDatabaseUrl`, and Prisma `vocabulary_items` read projection.
- Produces: `parseVocabularyAudioReconciliationArguments`, `runVocabularyAudioReconciliation`, `writeReconciledVocabularyCatalog`, and the executable CLI.

- [ ] **Step 1: Write failing CLI orchestration tests**

Define a dependency-injected runtime so tests never access PostgreSQL or the real catalog:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseVocabularyAudioReconciliationArguments,
  runVocabularyAudioReconciliation,
  type VocabularyAudioReconciliationRuntime,
} from "./reconcile-vocabulary-audio.js";

test("plan writes a report but never invokes the catalog writer", async () => {
  let catalogWrites = 0;
  let reportWrites = 0;
  const runtime = createRuntime({
    writeReport: async () => {
      reportWrites += 1;
    },
    writeCatalog: async () => {
      catalogWrites += 1;
    },
  });

  const result = await runVocabularyAudioReconciliation(runtime, {
    mode: "plan",
  });

  assert.equal(result.committed, false);
  assert.equal(reportWrites, 1);
  assert.equal(catalogWrites, 0);
});

test("apply rejects stale confirmation before catalog write", async () => {
  let catalogWrites = 0;
  const runtime = createRuntime({
    writeCatalog: async () => {
      catalogWrites += 1;
    },
  });
  await assert.rejects(
    runVocabularyAudioReconciliation(runtime, {
      mode: "apply",
      confirmation: "STALE",
    }),
    /confirmation/iu
  );
  assert.equal(catalogWrites, 0);
});

test("CLI accepts exactly plan or confirmed apply", () => {
  assert.deepEqual(parseVocabularyAudioReconciliationArguments(["plan"]), {
    mode: "plan",
  });
  assert.deepEqual(
    parseVocabularyAudioReconciliationArguments([
      "apply",
      "--confirm",
      "TOKEN",
    ]),
    { mode: "apply", confirmation: "TOKEN" }
  );
  assert.throws(() => parseVocabularyAudioReconciliationArguments(["dry-run"]));
});
```

The `createRuntime` fixture must return two valid catalog/database identities, including one eligible import, and expose overrides for `writeReport` and `writeCatalog`.

- [ ] **Step 2: Run CLI tests and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.test.ts
```

Expected: FAIL because the CLI module does not exist.

- [ ] **Step 3: Implement parsing and dependency-injected orchestration**

Expose these exact types and functions:

```ts
export type VocabularyAudioReconciliationArguments = {
  mode: "plan" | "apply";
  confirmation?: string;
  dataDirectory?: string;
};

export type VocabularyAudioReconciliationRuntime = {
  databaseTarget: string;
  loadSources(dataDirectory: string): Promise<{
    catalog: VocabularyCatalogItem[];
    topics: VocabularyTopicDefinition[];
  }>;
  loadDatabaseRows(): Promise<VocabularyAudioDatabaseRow[]>;
  writeReport(plan: VocabularyAudioReconciliationPlan): Promise<string>;
  writeCatalog(input: {
    dataDirectory: string;
    catalog: VocabularyCatalogItem[];
    merged: VocabularyCatalogItem[];
    topics: VocabularyTopicDefinition[];
  }): Promise<{ backupPath: string }>;
  print(value: unknown): void;
};

export function parseVocabularyAudioReconciliationArguments(
  values: string[]
): VocabularyAudioReconciliationArguments;

export async function runVocabularyAudioReconciliation(
  runtime: VocabularyAudioReconciliationRuntime,
  arguments_: VocabularyAudioReconciliationArguments
): Promise<{
  action:
    | "vocabulary-audio-reconciliation-plan"
    | "vocabulary-audio-reconciliation-apply";
  committed: boolean;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  confirmation: string;
  blocked: boolean;
  summary: VocabularyAudioReconciliationSummary;
  reportPath: string;
  backupPath?: string;
}>;
```

`runVocabularyAudioReconciliation` must load and validate topics/catalog first, load the database projection, build a fresh plan, always write the ignored report, return immediately in `plan`, reject blocked plans and mismatched confirmation before catalog writing in `apply`, transform with `applyVocabularyAudioImports`, validate topics with the merged catalog again, then invoke `writeCatalog` exactly once.

- [ ] **Step 4: Add failing filesystem safety tests**

Use `mkdtemp(path.join(tmpdir(), "audio-reconcile-"))` and real JSON files to prove:

```ts
test("catalog writer creates a backup and atomically changes only audio fields", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "audio-reconcile-"));
  const validFixtureTopic: VocabularyTopicDefinition = {
    slug: "fixture-topic",
    title: "Fixture",
    titleVi: "Dữ liệu kiểm thử",
    description: "Fixture topic",
    descriptionVi: "Chủ đề kiểm thử",
    order: 1,
    group: "Fixtures",
    groupVi: "Kiểm thử",
  };
  const catalog = [item("apple")];
  const merged = applyVocabularyAudioImports(catalog, validPlanFor(catalog));
  await writeFile(
    path.join(directory, "vocabulary-catalog.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8"
  );

  const result = await writeReconciledVocabularyCatalog({
    dataDirectory: directory,
    catalog,
    merged,
    topics: [validFixtureTopic],
    now: new Date("2026-08-03T04:05:06.000Z"),
  });

  assert.match(
    result.backupPath,
    /vocabulary-catalog\.before-audio-reconciliation/iu
  );
  assert.deepEqual(
    JSON.parse(
      await readFile(path.join(directory, "vocabulary-catalog.json"), "utf8")
    ),
    merged
  );
  assert.deepEqual(
    JSON.parse(await readFile(result.backupPath, "utf8")),
    catalog
  );
});
```

Also assert that the writer rejects record-count or identity-sequence changes before copying or renaming anything.

- [ ] **Step 5: Implement filesystem and Prisma adapters**

Implement:

```ts
export async function writeReconciledVocabularyCatalog(input: {
  dataDirectory: string;
  catalog: VocabularyCatalogItem[];
  merged: VocabularyCatalogItem[];
  topics: VocabularyTopicDefinition[];
  now?: Date;
}): Promise<{ backupPath: string }>;
```

The writer must validate `topics` with `merged`, compare catalog and merged lengths and identity arrays, create `backups/`, copy the original catalog to `vocabulary-catalog.before-audio-reconciliation.<ISO-safe>.json`, write formatted JSON with one trailing newline to `<catalog>.<pid>.tmp`, then rename the temporary file over the catalog.

In `main`, resolve the default data directory as `../../data/vocabulary`, load `topics.json` and `vocabulary-catalog.json`, validate them, and query only:

```ts
await prisma.vocabulary_items.findMany({
  select: {
    id: true,
    normalized_word: true,
    pos: true,
    cefr_level: true,
    audio_url: true,
    audio_source: true,
  },
  orderBy: { id: "asc" },
});
```

Map snake-case Prisma fields to `VocabularyAudioDatabaseRow`. Resolve and sanitize the database target without logging credentials. Write the full plan report to `working/dictionary-enrichment/audio-reconciliation-plan.json` with formatted JSON and one trailing newline. Disconnect Prisma in `finally`. Guard execution by basename `reconcile-vocabulary-audio.ts` or `.js` so importing the module in tests has no side effects.

- [ ] **Step 6: Run both reconciliation test files and verify GREEN**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.test.ts scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.test.ts
```

Expected: all tests PASS; no live DB or provider access.

- [ ] **Step 7: Commit the CLI and writer**

```powershell
git add apps/api/scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.ts apps/api/scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.test.ts
git commit -m "feat(data): add confirmed audio catalog reconciliation"
```

---

### Task 3: Command wiring, architecture characterization, and canonical docs

**Files:**

- Modify: `apps/api/package.json`
- Modify: `apps/api/test/vocabulary-data-architecture.test.ts`
- Modify: `docs/data/vocabulary-pipeline.md`

**Interfaces:**

- Consumes: executable CLI from Task 2.
- Produces: supported operator command and documented non-destructive workflow.

- [ ] **Step 1: Write the failing architecture characterization**

Add a test that reads the two new source files and API package JSON, then asserts:

```ts
assert.match(
  packageJson.scripts?.["data:reconcile-vocabulary-audio"] ?? "",
  /reconcile-vocabulary-audio\.ts/u
);
assert.doesNotMatch(
  `${plannerSource}\n${cliSource}`,
  /GoogleGenAI|generateContent|OPENAI_API_KEY|GEMINI_API_KEY|\.update\(|\.create\(|\.delete/u
);
assert.match(cliSource, /vocabulary_items\.findMany/u);
assert.match(cliSource, /vocabulary-catalog\.before-audio-reconciliation/u);
```

- [ ] **Step 2: Run the architecture test and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test test/vocabulary-data-architecture.test.ts
```

Expected: FAIL because the package command is absent.

- [ ] **Step 3: Wire the command and document the operator sequence**

Add to `apps/api/package.json`:

```json
"data:reconcile-vocabulary-audio": "dotenv -e ../../.env -- tsx ./scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.ts"
```

Update the Dictionary enrichment section of `docs/data/vocabulary-pipeline.md` with the exact `plan` and confirmed `apply` commands, explain that it changes only canonical catalog audio fields and never PostgreSQL, and warn that `data:export-vocab` has a wider example-field mutation surface. Add the sequence `reconcile plan -> review -> confirmed catalog apply -> bootstrap plan -> bootstrap dry-run` and state that bootstrap apply remains separately approved.

- [ ] **Step 4: Run architecture and reconciliation tests**

```powershell
pnpm --filter @repo/api exec tsx --test test/vocabulary-data-architecture.test.ts scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.test.ts scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit command and documentation**

```powershell
git add apps/api/package.json apps/api/test/vocabulary-data-architecture.test.ts docs/data/vocabulary-pipeline.md
git commit -m "docs(data): document audio catalog reconciliation"
```

---

### Task 4: Verify code and generate the current read-only reconciliation plan

**Files:**

- Generated ignored report: `data/vocabulary/working/dictionary-enrichment/audio-reconciliation-plan.json`
- No committed source data change.

**Interfaces:**

- Consumes: command from Task 3 and the current local PostgreSQL/database catalog state.
- Produces: evidence for a later, explicitly approved catalog apply.

- [ ] **Step 1: Run narrow static gates**

```powershell
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: both commands exit 0.

- [ ] **Step 2: Run the standalone Vocabulary workflow suite**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts scripts/vocabulary/database/bootstrap-vocabulary.test.ts scripts/vocabulary/dictionary-enrichment/vocabulary-audio-reconciliation.test.ts scripts/vocabulary/dictionary-enrichment/reconcile-vocabulary-audio.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
```

Expected: all tests PASS without provider or database writes.

- [ ] **Step 3: Run reconciliation plan against the current DB**

```powershell
pnpm --filter @repo/api data:reconcile-vocabulary-audio -- plan
```

Expected review values: 7,429 catalog records, 7,429 matching database identities, 2,161 catalog audio before, 2,045 imports, 4,206 catalog audio after, zero conflict/invalid/duplicate/missing blockers, `blocked: false`, and `committed: false`.

- [ ] **Step 4: Prove plan did not change canonical source**

```powershell
git status --short data/vocabulary/vocabulary-catalog.json
git diff -- data/vocabulary/vocabulary-catalog.json
```

Expected: no output. Confirm the generated report remains ignored with `git status --short --ignored data/vocabulary/working/dictionary-enrichment`.

- [ ] **Step 5: Stop before catalog apply and request explicit confirmation**

Report the exact summary and confirmation token to the user. Do not run `apply` in this task. A later turn may run confirmed catalog apply, validate the resulting 2,045-entry diff, and then rerun bootstrap plan/dry-run; PostgreSQL bootstrap apply remains a second independent approval.

---

### Task 5: Final source verification before handoff

**Files:**

- No new files unless verification exposes a defect.

**Interfaces:**

- Consumes: all committed implementation tasks.
- Produces: verified branch ready for reviewed catalog reconciliation.

- [ ] **Step 1: Run repository architecture and API tests**

```powershell
pnpm architecture:check
pnpm test
```

Expected: both gates exit 0.

- [ ] **Step 2: Run remaining full gates**

```powershell
pnpm check-types
pnpm lint
pnpm build
```

Expected: all gates exit 0. If an unrelated pre-existing failure occurs, record the exact command and evidence without changing unrelated code.

- [ ] **Step 3: Inspect the final branch diff**

```powershell
git status --short
git log --oneline -8
git diff HEAD~3..HEAD --check
```

Expected: clean worktree except ignored plan/backup artifacts; no catalog diff before explicit apply; implementation, tests, package wiring, and canonical docs are committed.
