# Unclassified Vocabulary Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic `data:audit-unclassified-topics` command that separates unclassified canonical vocabulary into function words, content recovery candidates, and normalization review artifacts without calling AI or PostgreSQL.

**Architecture:** A pure audit module owns POS normalization, mutually exclusive bucketing, stable record projection, and reconciliation invariants. A thin offline CLI validates canonical catalog/taxonomy sources, invokes the pure module, and atomically writes three ignored JSON reports. Package wiring and the canonical vocabulary guide expose the safe operating command.

**Tech Stack:** TypeScript 6, Node.js `node:test`, `tsx`, pnpm workspace scripts, Node `fs/promises`.

## Global Constraints

- Read `data/vocabulary/vocabulary-catalog.json` as the audit subject and `data/vocabulary/topics.json` only for canonical validation.
- Do not read provider credentials, call an AI provider, construct Prisma, or update PostgreSQL.
- Do not mutate `data/vocabulary/vocabulary-catalog.json` or any input object.
- Write only below ignored `data/vocabulary/working/topic-classification/audit/`.
- Keep the three primary buckets mutually exclusive and reconcile their counts with the unclassified total.
- Preserve catalog order and omit timestamps so identical catalog input produces byte-stable reports.
- Preserve the user's existing dirty `data/vocabulary/vocabulary-catalog.json`; stage only files named by each task.

---

## File map

- Create `apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.ts`: pure types, POS rules, projections, buckets, and reconciliation.
- Create `apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts`: behavior tests for all buckets, filtering, ordering, immutability, and determinism.
- Create `apps/api/scripts/vocabulary/topic-classification/audit-unclassified-topics.ts`: filesystem CLI and bounded summary.
- Modify `apps/api/package.json`: expose `data:audit-unclassified-topics` without `dotenv`.
- Modify `docs/data/vocabulary-pipeline.md`: place the audit gate between classification merge and expansion.
- Modify `docs/guides/verification.md`: include the new pure test in the standalone vocabulary gate.

### Task 1: Pure deterministic audit engine

**Files:**

- Create: `apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts`
- Create: `apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.ts`

**Interfaces:**

- Consumes: `VocabularyCatalogItem[]` from `../catalog/vocabulary-catalog.js`.
- Produces: `auditUnclassifiedVocabulary(catalog: VocabularyCatalogItem[]): UnclassifiedVocabularyAudit`.
- Produces categories `function-words`, `content-recovery-candidates`, and `normalization-review` through `reports`.

- [ ] **Step 1: Write failing bucket and filtering tests**

Create the test fixture and first tests:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { auditUnclassifiedVocabulary } from "./unclassified-vocabulary-audit.js";
import type { VocabularyCatalogItem } from "../catalog/vocabulary-catalog.js";

const item = (
  word: string,
  pos: string,
  topics: string[] = []
): VocabularyCatalogItem => ({
  word,
  normalizedWord: word.toLowerCase(),
  pos,
  posVi: null,
  cefrLevel: "A1",
  meaningVi: `${word} full meaning`,
  primaryMeaningVi: `${word} meaning`,
  source: "fixture",
  topics,
});

test("audit separates unclassified vocabulary by deterministic POS rules", () => {
  const result = auditUnclassifiedVocabulary([
    item("in", " Preposition "),
    item("bank", "noun"),
    item("quickly", "adverb"),
    item("airport", "noun", ["airport"]),
  ]);

  assert.equal(result.totalCatalogRecords, 4);
  assert.equal(result.classifiedRecords, 1);
  assert.equal(result.unclassifiedRecords, 3);
  assert.deepEqual(
    result.reports["function-words"].records.map((record) => record.word),
    ["in"]
  );
  assert.deepEqual(
    result.reports["content-recovery-candidates"].records.map(
      (record) => record.word
    ),
    ["bank"]
  );
  assert.deepEqual(
    result.reports["normalization-review"].records.map((record) => record.word),
    ["quickly"]
  );
});

test("audit recognizes every approved function-word POS", () => {
  const partsOfSpeech = [
    "pronoun",
    "preposition",
    "determiner",
    "conjunction",
    "modal auxiliary",
    "be-verb",
    "do-verb",
    "have-verb",
  ];
  const result = auditUnclassifiedVocabulary(
    partsOfSpeech.map((pos, index) => item(`word-${index}`, pos))
  );

  assert.equal(result.reports["function-words"].totalRecords, 8);
  assert.equal(result.reports["content-recovery-candidates"].totalRecords, 0);
  assert.equal(result.reports["normalization-review"].totalRecords, 0);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts
```

Expected: FAIL because `unclassified-vocabulary-audit.js` does not exist.

- [ ] **Step 3: Implement the minimal audit types and bucketing**

Create the pure module with these public shapes and rules:

```ts
import type { VocabularyCatalogItem } from "../catalog/vocabulary-catalog.js";

export const auditCategories = [
  "function-words",
  "content-recovery-candidates",
  "normalization-review",
] as const;

export type AuditCategory = (typeof auditCategories)[number];

export type UnclassifiedVocabularyAuditRecord = {
  catalogIndex: number;
  word: string;
  normalizedWord: string;
  pos: string;
  cefrLevel: string;
  primaryMeaningVi: string;
  meaningVi: string;
  reasons: string[];
};

export type UnclassifiedVocabularyAuditReport = {
  schemaVersion: 1;
  category: AuditCategory;
  totalRecords: number;
  records: UnclassifiedVocabularyAuditRecord[];
};

export type UnclassifiedVocabularyAudit = {
  totalCatalogRecords: number;
  classifiedRecords: number;
  unclassifiedRecords: number;
  reports: Record<AuditCategory, UnclassifiedVocabularyAuditReport>;
};

const functionWordPartsOfSpeech = new Set([
  "pronoun",
  "preposition",
  "determiner",
  "conjunction",
  "modal auxiliary",
  "be-verb",
  "do-verb",
  "have-verb",
]);
const contentPartsOfSpeech = new Set(["noun", "adjective", "verb"]);

const classifyPartOfSpeech = (pos: string): AuditCategory => {
  const normalized = pos.trim().toLowerCase();
  if (functionWordPartsOfSpeech.has(normalized)) return "function-words";
  if (contentPartsOfSpeech.has(normalized)) {
    return "content-recovery-candidates";
  }
  return "normalization-review";
};
```

Implement `auditUnclassifiedVocabulary` by creating empty report envelopes,
iterating the catalog once, skipping records with a non-empty `topics` array,
projecting new record objects, appending exactly once, then asserting:

```ts
const bucketTotal = auditCategories.reduce(
  (total, category) => total + reports[category].records.length,
  0
);
if (bucketTotal !== unclassifiedRecords) {
  throw new Error(
    `Audit bucket count ${bucketTotal} does not match unclassified count ${unclassifiedRecords}`
  );
}
```

For this first green step, copy all scalar fields into a new projection, retain
the one-based `catalogIndex`, and initialize `reasons` as an empty array. Never
return an input object. Stable reason generation is introduced by the next red
test rather than being implemented early.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same focused command. Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Add failing determinism, order, reason, and immutability tests**

Append tests that:

```ts
test("audit preserves catalog order and emits stable reasons", () => {
  const result = auditUnclassifiedVocabulary([
    item("second", "verb"),
    item("first", "noun"),
    item("wow", "interjection"),
  ]);
  assert.deepEqual(
    result.reports["content-recovery-candidates"].records.map((record) => ({
      catalogIndex: record.catalogIndex,
      word: record.word,
      reasons: record.reasons,
    })),
    [
      {
        catalogIndex: 1,
        word: "second",
        reasons: ["content-recovery-pos:verb"],
      },
      {
        catalogIndex: 2,
        word: "first",
        reasons: ["content-recovery-pos:noun"],
      },
    ]
  );
  assert.deepEqual(result.reports["normalization-review"].records[0]?.reasons, [
    "manual-review-pos:interjection",
  ]);
});

test("audit is deterministic and does not mutate catalog input", () => {
  const catalog = [item("bank", "noun")];
  const before = structuredClone(catalog);
  const first = auditUnclassifiedVocabulary(catalog);
  const second = auditUnclassifiedVocabulary(catalog);
  assert.deepEqual(first, second);
  assert.deepEqual(catalog, before);
});
```

- [ ] **Step 6: Run tests and verify RED for stable reasons**

Run the focused command. Expected: FAIL because Step 3 deliberately returns an
empty `reasons` array instead of `content-recovery-pos:verb` and
`manual-review-pos:interjection`.

- [ ] **Step 7: Complete the minimal implementation and rerun GREEN**

Add exactly one stable reason based on the selected category:

```ts
const reasonPrefix: Record<AuditCategory, string> = {
  "function-words": "function-word-pos",
  "content-recovery-candidates": "content-recovery-pos",
  "normalization-review": "manual-review-pos",
};
const reasons = [`${reasonPrefix[category]}:${normalizedPos}`];
```

Run the focused test. Expected: 4 tests pass, 0 fail.

- [ ] **Step 8: Commit Task 1 only**

```powershell
git add apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.ts apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts
git commit -m "feat(data): audit unclassified vocabulary"
```

### Task 2: Safe CLI, package command, and canonical documentation

**Files:**

- Create: `apps/api/scripts/vocabulary/topic-classification/audit-unclassified-topics.ts`
- Modify: `apps/api/package.json`
- Modify: `docs/data/vocabulary-pipeline.md`
- Modify: `docs/guides/verification.md`

**Interfaces:**

- Consumes: `auditUnclassifiedVocabulary` and existing `assertVocabularySourcesValid`.
- Produces: workspace command `pnpm --filter @repo/api data:audit-unclassified-topics`.
- Produces: three schema-version-1 JSON envelopes under the ignored audit directory.

- [ ] **Step 1: Add a failing package-command architecture assertion**

Add a source-layout test to
`apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts`
that reads `apps/api/package.json` relative to the test process and asserts the
script exists without `dotenv`, Prisma, or a provider runner:

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";

test("audit package command is offline and provider independent", async () => {
  const packageJson = JSON.parse(
    await readFile(path.resolve(process.cwd(), "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };
  assert.equal(
    packageJson.scripts?.["data:audit-unclassified-topics"],
    "tsx ./scripts/vocabulary/topic-classification/audit-unclassified-topics.ts"
  );
});
```

- [ ] **Step 2: Run focused test and verify RED**

Run the focused test command. Expected: FAIL because the package script is
undefined.

- [ ] **Step 3: Add the package script and CLI**

Add to `apps/api/package.json`:

```json
"data:audit-unclassified-topics": "tsx ./scripts/vocabulary/topic-classification/audit-unclassified-topics.ts"
```

Create the CLI using these paths:

```ts
const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const auditRoot = path.join(
  vocabularyRoot,
  "working/topic-classification/audit"
);
```

Load catalog and taxonomy with `readFile`/`JSON.parse`, call
`assertVocabularySourcesValid(topics, catalog)`, then call
`auditUnclassifiedVocabulary(catalog)`. Serialize every report as
`${JSON.stringify(report, null, 2)}\n`.

Implement per-file atomic replacement:

```ts
const writeJsonAtomically = async (targetPath: string, value: unknown) => {
  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};
```

Validate the audit completely, create `auditRoot`, then write filenames derived
from the three category constants. Print only:

```ts
console.log(
  JSON.stringify({
    action: "unclassified-vocabulary-audited",
    totalCatalogRecords: audit.totalCatalogRecords,
    classifiedRecords: audit.classifiedRecords,
    unclassifiedRecords: audit.unclassifiedRecords,
    functionWords: audit.reports["function-words"].totalRecords,
    contentRecoveryCandidates:
      audit.reports["content-recovery-candidates"].totalRecords,
    normalizationReview: audit.reports["normalization-review"].totalRecords,
    outputDirectory: auditRoot,
    providerCalled: false,
    databaseUpdated: false,
  })
);
```

Use the repository's standard terminal failure boundary:

```ts
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
```

- [ ] **Step 4: Run focused test and API type/lint gates**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: every command exits 0.

- [ ] **Step 5: Document the operating command**

In `docs/data/vocabulary-pipeline.md`, immediately after the classification
merge section, add:

````markdown
Audit the merged catalog before Topic expansion:

```powershell
pnpm --filter @repo/api data:audit-unclassified-topics
```

The audit is deterministic and local. It separates unclassified function words,
content recovery candidates, and manual/normalization review records below the
ignored `working/topic-classification/audit/` directory. It does not call a
provider, mutate the canonical catalog, or write PostgreSQL. Audit output does
not authorize recovery classification or Topic expansion.
````

In `docs/guides/verification.md`, add
`scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts`
to both standalone vocabulary workflow command examples.

- [ ] **Step 6: Run the real audit on the current catalog**

Run:

```powershell
pnpm --filter @repo/api data:audit-unclassified-topics
```

Expected: exit 0, `providerCalled:false`, `databaseUpdated:false`, and reconciled
counts. Confirm that only ignored files were created:

```powershell
git status --short
```

Expected tracked data state: only the pre-existing modified
`data/vocabulary/vocabulary-catalog.json` plus Task 2 source/docs changes.

- [ ] **Step 7: Run vocabulary and documentation verification**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm exec prettier --check apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.ts apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts apps/api/scripts/vocabulary/topic-classification/audit-unclassified-topics.ts apps/api/package.json docs/data/vocabulary-pipeline.md docs/guides/verification.md
git diff --check
```

Expected: all commands exit 0. Inspect the three report counts and verify their
sum equals `unclassifiedRecords`.

- [ ] **Step 8: Commit Task 2 without the dirty catalog**

```powershell
git add apps/api/package.json apps/api/scripts/vocabulary/topic-classification/audit-unclassified-topics.ts apps/api/scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts docs/data/vocabulary-pipeline.md docs/guides/verification.md
git commit -m "feat(data): expose unclassified vocabulary audit"
```

Before committing, confirm `git diff --cached --name-only` does not contain
`data/vocabulary/vocabulary-catalog.json` or anything below
`data/vocabulary/working/`.

### Task 3: Final regression gate and handoff

**Files:**

- Verify only; no expected source changes.

**Interfaces:**

- Consumes: the complete audit command from Tasks 1 and 2.
- Produces: fresh evidence for handoff and exact local audit counts.

- [ ] **Step 1: Run repository gates relevant to the change**

```powershell
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
pnpm --filter @repo/api architecture:check
```

Expected: all five commands exit 0.

- [ ] **Step 2: Verify repository state and commit boundaries**

```powershell
git diff --check
git status --short
git log -3 --oneline
```

Expected: the only remaining dirty tracked file is the user's pre-existing
`data/vocabulary/vocabulary-catalog.json`; ignored audit artifacts do not appear,
and the two feature commits are present.

- [ ] **Step 3: Report the usable command and counts**

Handoff must include:

- the exact `data:audit-unclassified-topics` command;
- the three generated report paths;
- actual function/content/review counts from the real run;
- explicit confirmation that no provider or database call occurred;
- the unchanged dirty catalog status;
- the next proposed workflow, which remains separately authorized.
