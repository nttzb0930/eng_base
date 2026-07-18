# Vocabulary Pipeline Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the phase-based vocabulary data layout with one validated catalog, one 103-topic taxonomy, reproducible classification/expansion pipelines, and database seed code that consumes only canonical sources.

**Architecture:** Pure functions under `apps/api/scripts/lib` own catalog validation, deterministic classification merging, and expansion validation. CLI scripts only perform file/provider/database I/O around those functions. Canonical JSON files are versioned; generated AI working artifacts are ignored and may replace the catalog only through validated atomic merges.

**Tech Stack:** TypeScript 6, Node.js filesystem APIs, `tsx --test`, Prisma 7, PostgreSQL, pnpm monorepo.

## Global Constraints

- `data/vocabulary/topics.json` is the only topic taxonomy and contains exactly 103 unique topic slugs.
- `data/vocabulary/vocabulary-catalog.json` is the only canonical vocabulary dataset.
- `dictionaryLookupCompleted` means Dictionary API lookup completed; audio/example presence is derived from their fields.
- AI classification assigns zero or one primary topic while the catalog keeps `topics: string[]`.
- AI expansion artifacts require validation and acceptance before merge.
- Generated working files and backups are ignored and never read by runtime or database seed.
- No database write command runs without explicit user confirmation.
- All production behavior follows red-green-refactor.

---

### Task 1: Establish canonical vocabulary files and architecture guard

**Files:**
- Create: `apps/api/test/vocabulary-data-architecture.test.ts`
- Create: `data/vocabulary/topics.json`
- Rename: `data/vocabulary/phase1-vocabulary.json` → `data/vocabulary/vocabulary-catalog.json`
- Move: `data/vocabulary/VOCAB-AI-TOPIC-CLASSIFICATION-PROMPT.md` → `data/vocabulary/prompts/topic-classification.md`
- Move: `data/vocabulary/VOCAB-AI-TOPIC-EXPANSION-PROMPT.md` → `data/vocabulary/prompts/topic-expansion.md`
- Modify: `.gitignore`
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces canonical paths consumed by every later task.
- Produces an architecture test forbidding `phase1-vocabulary.json`, top-level AI prompts, legacy `enriched`, and committed working artifacts.

- [ ] **Step 1: Write the failing architecture test**

Create a Node test that asserts:

```ts
assert.equal(existsSync(catalogPath), true);
assert.equal(existsSync(legacyCatalogPath), false);
assert.equal(topics.length, 103);
assert.equal(new Set(topics.map((topic) => topic.slug)).size, 103);
assert.equal(catalog.some((item) => "enriched" in item), false);
assert.equal(
  catalog.filter((item) => item.dictionaryLookupCompleted === true).length,
  2693,
);
assert.match(gitignore, /data\/vocabulary\/working\//u);
assert.match(gitignore, /data\/vocabulary\/backups\//u);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @repo/api exec tsx --test test/vocabulary-data-architecture.test.ts
```

Expected: FAIL because `vocabulary-catalog.json` and `topics.json` do not yet exist in the isolated branch.

- [ ] **Step 3: Install the approved canonical assets**

Bring the reviewed 103-topic `topics.json` and two prompt sources from the main checkout into the isolated branch. Rename the tracked catalog without changing item order, rename every JSON key `enriched` to `dictionaryLookupCompleted`, and keep its boolean value unchanged. Move prompts under `data/vocabulary/prompts/`.

Add these ignore rules:

```gitignore
# generated vocabulary pipeline artifacts
/data/vocabulary/working/
/data/vocabulary/backups/
```

Add only the five approved pipeline command names to `apps/api/package.json`; their target scripts are implemented in Tasks 3 and 4.

- [ ] **Step 4: Run the architecture test and verify GREEN**

Run the narrow test and confirm 103 topics, 3,000 catalog entries, 2,693 completed dictionary lookups, and no legacy marker/path.

- [ ] **Step 5: Commit**

```bash
git add .gitignore apps/api/package.json apps/api/test/vocabulary-data-architecture.test.ts data/vocabulary
git commit -m "refactor(data): establish canonical vocabulary catalog"
```

---

### Task 2: Add pure catalog and taxonomy validation

**Files:**
- Create: `apps/api/scripts/lib/vocabulary-catalog.ts`
- Create: `apps/api/scripts/lib/vocabulary-catalog.test.ts`

**Interfaces:**
- Produces `VocabularyTopicDefinition`, `VocabularyCatalogItem`, `VocabularyValidationReport`.
- Produces `validateVocabularySources(topics, catalog)` and `assertVocabularySourcesValid(topics, catalog)`.
- Consumed by classification, expansion, and seed tasks.

- [ ] **Step 1: Write failing validation tests**

Cover these behaviors with small in-memory fixtures:

```ts
test("catalog validation rejects an unknown topic slug", () => {
  const report = validateVocabularySources(topics, [item({ topics: ["missing"] })]);
  assert.deepEqual(report.errors, ['Vocabulary "about|adverb|a1" references unknown topic "missing"']);
});

test("catalog validation rejects duplicate vocabulary identity", () => {
  const duplicate = item({ word: "About", normalizedWord: "about" });
  const report = validateVocabularySources(topics, [duplicate, { ...duplicate }]);
  assert.equal(report.duplicateVocabularyIdentities, 1);
});

test("catalog validation reports unclassified items without rejecting them", () => {
  const report = validateVocabularySources(topics, [item({ topics: [] })]);
  assert.equal(report.unclassifiedItems, 1);
  assert.deepEqual(report.errors, []);
});
```

- [ ] **Step 2: Run tests and verify RED**

Expected: module import failure because `vocabulary-catalog.ts` does not exist.

- [ ] **Step 3: Implement minimal pure validation**

Use this public shape:

```ts
export type VocabularyValidationReport = {
  topicCount: number;
  catalogItemCount: number;
  classifiedItems: number;
  unclassifiedItems: number;
  usedTopicSlugs: string[];
  unusedTopicSlugs: string[];
  duplicateVocabularyIdentities: number;
  errors: string[];
};

export const vocabularyIdentity = (item: VocabularyCatalogItem) =>
  `${item.normalizedWord.trim().toLowerCase()}|${item.pos.trim().toLowerCase()}|${item.cefrLevel.trim().toLowerCase()}`;
```

Required fields are `word`, `normalizedWord`, `pos`, `cefrLevel`, `meaningVi`, and `primaryMeaningVi`. Valid CEFR values are `A1`, `A2`, `B1`, `B2`, `C1`, and `C2`.

- [ ] **Step 4: Run narrow tests and full API tests**

```bash
pnpm --filter @repo/api exec tsx --test scripts/lib/vocabulary-catalog.test.ts
pnpm --filter @repo/api test
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/scripts/lib/vocabulary-catalog.ts apps/api/scripts/lib/vocabulary-catalog.test.ts
git commit -m "feat(data): validate canonical vocabulary sources"
```

---

### Task 3: Harden deterministic topic classification

**Files:**
- Create: `apps/api/scripts/lib/topic-classification.ts`
- Create: `apps/api/scripts/lib/topic-classification.test.ts`
- Create: `apps/api/scripts/prepare-vocab-topics.ts`
- Create: `apps/api/scripts/run-vocab-topics-gemini.ts`
- Create: `apps/api/scripts/merge-vocab-topics.ts`

**Interfaces:**
- Produces `createClassificationPlan(catalog, batchSize)`.
- Produces `validateClassificationResults(plan, outputs, topicSlugs)`.
- Produces `mergeClassifications(catalog, validatedRecords)` without mutating input.
- CLI paths live only under `data/vocabulary/working/topic-classification/`.

- [ ] **Step 1: Write failing deterministic batching tests**

```ts
test("classification batches keep stable one-based record IDs", () => {
  const plan = createClassificationPlan([first, second, third], 2);
  assert.deepEqual(plan.batches.map((batch) => batch.records.map((r) => r.id)), [[1, 2], [3]]);
});

test("classification validation rejects duplicated and unknown record IDs", () => {
  const result = validateClassificationResults(plan, outputsWithDuplicateId, new Set(["airport"]));
  assert.match(result.errors.join("\n"), /duplicate record id 1/u);
});

test("classification merge changes only topics", () => {
  const merged = mergeClassifications([first], [{ id: 1, topics: ["airport"] }]);
  assert.deepEqual(merged[0], { ...first, topics: ["airport"] });
  assert.deepEqual(first.topics, []);
});
```

- [ ] **Step 2: Run tests and verify RED**

Expected: missing `topic-classification.ts`.

- [ ] **Step 3: Implement the pure classification boundary**

The plan includes `schemaVersion: 1`, batch hashes, all record IDs, and catalog SHA-256. Validation blocks unknown slugs, more than one topic, missing IDs, duplicate IDs, unknown IDs, and a manifest/catalog hash mismatch. Zero-topic records are valid and reported as unclassified.

- [ ] **Step 4: Adapt the three CLI scripts**

- `prepare` recreates only `working/topic-classification/input` and writes a manifest atomically.
- `run` reads the canonical prompt and taxonomy, resumes existing valid outputs, and writes rejected provider responses separately.
- `merge` validates all outputs, writes a temporary catalog, validates the full result, creates a backup, then atomically renames the temporary catalog.
- Provider secrets and raw responses are never logged.

- [ ] **Step 5: Run narrow tests, typecheck, and lint**

```bash
pnpm --filter @repo/api exec tsx --test scripts/lib/topic-classification.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/scripts/lib/topic-classification.ts apps/api/scripts/lib/topic-classification.test.ts apps/api/scripts/prepare-vocab-topics.ts apps/api/scripts/run-vocab-topics-gemini.ts apps/api/scripts/merge-vocab-topics.ts
git commit -m "feat(data): harden vocabulary topic classification"
```

---

### Task 4: Add review-gated topic expansion

**Files:**
- Create: `apps/api/scripts/lib/topic-expansion.ts`
- Create: `apps/api/scripts/lib/topic-expansion.test.ts`
- Create: `apps/api/scripts/generate-topic-expansion.ts`
- Create: `apps/api/scripts/merge-topic-expansion.ts`

**Interfaces:**
- Produces `calculateTopicDeficits(topics, catalog, minimumWords)`.
- Produces `validateExpansionArtifact(artifact, catalog, topicSlugs)`.
- Produces `mergeAcceptedExpansion(catalog, artifact)`.
- Expansion artifacts include `status: "review" | "accepted" | "rejected"`; only `accepted` merges.

- [ ] **Step 1: Write failing deficit and acceptance tests**

```ts
test("topic deficits request only the number of missing words", () => {
  assert.deepEqual(calculateTopicDeficits(topics, catalogWith18AirportWords, 30), [
    { slug: "airport", existingCount: 18, requestedCount: 12 },
  ]);
});

test("review expansion cannot merge", () => {
  assert.throws(() => mergeAcceptedExpansion(catalog, reviewArtifact), /must be accepted/u);
});

test("accepted AI words retain provenance and await dictionary lookup", () => {
  const merged = mergeAcceptedExpansion(catalog, acceptedArtifact);
  assert.equal(merged.at(-1)?.source, "ai-topic-expansion");
  assert.equal(merged.at(-1)?.exampleSource, "ai-topic-expansion");
  assert.equal(merged.at(-1)?.dictionaryLookupCompleted, false);
});
```

- [ ] **Step 2: Run tests and verify RED**

Expected: missing expansion module.

- [ ] **Step 3: Implement pure expansion behavior**

Reject duplicate `normalizedWord + pos` against either the catalog or the same artifact, invalid CEFR, wrong target topic, missing Vietnamese meaning/example, or provider-created topic slugs. Do not overwrite existing items.

- [ ] **Step 4: Adapt expansion CLIs**

`generate` defaults `VOCAB_TOPIC_MINIMUM_WORDS` to 30, writes `status: "review"`, and creates only the deficit count. `merge` requires `status: "accepted"`, validates again, backs up the catalog, and replaces it atomically.

- [ ] **Step 5: Run narrow and API gates**

```bash
pnpm --filter @repo/api exec tsx --test scripts/lib/topic-expansion.test.ts
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/scripts/lib/topic-expansion.ts apps/api/scripts/lib/topic-expansion.test.ts apps/api/scripts/generate-topic-expansion.ts apps/api/scripts/merge-topic-expansion.ts
git commit -m "feat(data): gate vocabulary topic expansion by review"
```

---

### Task 5: Make seed consume canonical sources only

**Files:**
- Create: `apps/api/scripts/lib/vocabulary-seed-data.ts`
- Create: `apps/api/scripts/lib/vocabulary-seed-data.test.ts`
- Modify: `apps/api/scripts/seed.ts`
- Modify: `apps/api/scripts/seed-vocab-topics.ts`
- Modify: `apps/api/test/vocabulary-data-architecture.test.ts`

**Interfaces:**
- Produces `loadVocabularySeedData(dataDirectory)` returning validated topics, catalog, and relation rows.
- Both database scripts consume this loader; neither declares topic data.

- [ ] **Step 1: Write failing seed-data tests**

```ts
test("seed data builds relations from the canonical topic arrays", async () => {
  const data = await loadVocabularySeedData(fixtureDirectory);
  assert.deepEqual(data.relations, [
    { vocabularyIdentity: "airport|noun|a1", topicSlug: "airport" },
  ]);
});

test("seed data fails before database access when a slug is unknown", async () => {
  await assert.rejects(loadVocabularySeedData(invalidFixtureDirectory), /unknown topic/u);
});
```

Extend the architecture test to assert neither seed script contains `topicDefinitions`, `topicsToSeed`, or any legacy 12-topic slug array.

- [ ] **Step 2: Run tests and verify RED**

Expected: missing loader and existing hard-coded topic definitions detected.

- [ ] **Step 3: Implement loader and refactor seed scripts**

The loader parses both canonical JSON files, calls `assertVocabularySourcesValid`, and returns relation identities without importing Prisma. `seed.ts` resolves inserted vocabulary IDs and inserts relations in chunks of 500 with `skipDuplicates`. `seed-vocab-topics.ts` becomes a thin database adapter using the same canonical loader instead of keyword matching.

- [ ] **Step 4: Verify without writing to the database**

```bash
pnpm --filter @repo/api exec tsx --test scripts/lib/vocabulary-seed-data.test.ts test/vocabulary-data-architecture.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Do not run `db:seed` in this task.

- [ ] **Step 5: Commit**

```bash
git add apps/api/scripts/lib/vocabulary-seed-data.ts apps/api/scripts/lib/vocabulary-seed-data.test.ts apps/api/scripts/seed.ts apps/api/scripts/seed-vocab-topics.ts apps/api/test/vocabulary-data-architecture.test.ts
git commit -m "refactor(data): seed vocabulary from canonical sources"
```

---

### Task 6: Validate and merge the existing 60 classification outputs

**Files:**
- Modify: `data/vocabulary/vocabulary-catalog.json`
- Generated only: `data/vocabulary/working/topic-classification/**`

**Interfaces:**
- Consumes the existing 60 output files from the main checkout as untracked working artifacts.
- Produces a catalog with validated topic arrays and a coverage report.

- [ ] **Step 1: Copy existing artifacts into the ignored working directory**

Copy only classification `input`, `output`, `rejected`, and `manifest.json` from the main checkout. Confirm `git status --short` does not list them.

- [ ] **Step 2: Run classification validation without mutation**

Add and use a `--check` option:

```bash
pnpm --filter @repo/api data:merge-topics -- --check
```

Expected: exit 0 only when all 3,000 IDs are accounted for, hashes match, topic slugs belong to the 103-topic taxonomy, and there are no duplicate/unknown IDs. Unclassified records are reported but do not fail.

- [ ] **Step 3: Handle invalid artifacts safely**

If validation fails, stop this task, preserve the canonical catalog unchanged, and report exact batch IDs requiring regeneration. Do not weaken validation or invoke an AI provider automatically.

- [ ] **Step 4: Merge after successful check**

```bash
pnpm --filter @repo/api data:merge-topics
pnpm --filter @repo/api exec tsx --test test/vocabulary-data-architecture.test.ts
```

Confirm the catalog still has 3,000 entries, all topic slugs are canonical, and every non-topic field is byte-equivalent after JSON normalization.

- [ ] **Step 5: Commit the classified catalog**

```bash
git add data/vocabulary/vocabulary-catalog.json
git commit -m "data: classify vocabulary by canonical topics"
```

---

### Task 7: Update documentation and run final verification

**Files:**
- Modify: `docs/data/vocabulary-phase1.md`
- Create: `docs/data/vocabulary-pipeline.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Documents canonical files, safe commands, review gates, artifact policy, and database-write approval.

- [ ] **Step 1: Extend the architecture test with documentation assertions**

Assert active documentation mentions `vocabulary-catalog.json`, `topics.json`, `dictionaryLookupCompleted`, and `working/`, and does not instruct users to seed from a phase-based filename.

- [ ] **Step 2: Run the test and verify RED**

Expected: existing phase-one documentation still references `phase1-vocabulary.json`.

- [ ] **Step 3: Update active documentation**

Document this operator sequence:

```text
prepare classification -> run provider -> check merge -> merge catalog
measure topic deficits -> generate review artifact -> approve -> merge expansion
validate canonical files -> request approval -> seed PostgreSQL
```

State that `db:seed`, topic sync, and provider calls are never automatic during architecture work.

- [ ] **Step 4: Run complete verification**

```bash
pnpm architecture:check
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
git diff main...HEAD --check
git status --short
```

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md docs/data apps/api/test/vocabulary-data-architecture.test.ts
git commit -m "docs: define canonical vocabulary pipeline"
```

## Database handoff

After all code and data gates pass, request explicit user approval before either command:

```bash
pnpm --filter @repo/api db:seed
pnpm --filter @repo/api data:seed-topics
```

The implementation is complete without executing these commands; database mutation is a separate approved operation.
