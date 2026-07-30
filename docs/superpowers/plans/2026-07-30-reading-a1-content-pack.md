# Reading A1 Content Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship twelve manually authored A1 Reading passages as a versioned JSON dataset with strict offline validation and an idempotent draft-only database importer.

**Architecture:** `data/reading/a1/passages.json` is the canonical content source. Pure modules under `apps/api/scripts/reading/content` parse, validate, and audit it without environment or database access; a separate import orchestrator synchronizes validated aggregates through a narrow persistence interface, and the executable Prisma adapter is only composed by an explicit operator command.

**Tech Stack:** TypeScript 6, Node test runner, Zod 4, Prisma 7, pnpm, PostgreSQL.

## Global Constraints

- The pack contains exactly twelve internationally neutral A1 passages.
- Every body has 80–120 whitespace-delimited words, four questions, and three options per question.
- Every question has exactly one correct option and no normalized duplicate prompt or option.
- The canonical Topic slug must exist in `data/vocabulary/topics.json`.
- Vocabulary findings are editorial warnings, never provider calls or silent prose rewrites.
- New and updated records remain `DRAFT`; `PUBLISHED` records are skipped unchanged.
- Import is explicit, idempotent, and transactional; application startup, build, CI, seed, and migration never invoke it.
- Do not apply migrations, connect to PostgreSQL, import content, seed data, or publish passages during implementation verification.
- No new dependency is required.

---

## File Structure

```text
data/reading/a1/passages.json
  Canonical twelve-passage content pack.

apps/api/scripts/reading/content/reading-content.ts
  Strict Zod schema, semantic invariants, canonical file loading, and vocabulary audit.

apps/api/scripts/reading/content/reading-content.test.ts
  Pure validation, audit, and canonical dataset tests.

apps/api/scripts/reading/import/reading-content-import.ts
  Persistence-neutral draft synchronization and result reporting.

apps/api/scripts/reading/import/reading-content-import.test.ts
  Import orchestration tests through a fake store.

apps/api/scripts/reading/import-reading-a1.ts
  Explicit CLI composition using script Prisma; no reusable behavior.

docs/guides/reading-a1-content-import.md
  Operator validation, migration, import, review, publish, and smoke-test checklist.
```

### Task 1: Define the strict offline content contract

**Files:**

- Create: `apps/api/scripts/reading/content/reading-content.ts`
- Create: `apps/api/scripts/reading/content/reading-content.test.ts`

**Interfaces:**

- Consumes: unknown JSON input, `VocabularyTopicDefinition[]`, and `VocabularyCatalogItem[]`.
- Produces:

```ts
export type ReadingContentOption = { text: string; correct: boolean };
export type ReadingContentQuestion = {
  prompt: string;
  options: ReadingContentOption[];
};
export type ReadingContentPassage = {
  slug: string;
  title: string;
  cefrLevel: "A1";
  topicSlug: string;
  estimatedMinutes: number;
  body: string;
  questions: ReadingContentQuestion[];
};
export type ReadingVocabularyAudit = {
  unknownWords: string[];
  aboveA1Words: Array<{ word: string; cefrLevels: string[] }>;
};
export function validateReadingContentPack(
  input: unknown,
  topics: VocabularyTopicDefinition[]
): ReadingContentPassage[];
export function auditReadingVocabulary(
  passages: ReadingContentPassage[],
  catalog: VocabularyCatalogItem[]
): ReadingVocabularyAudit;
export function loadCanonicalReadingContent(): unknown;
```

- [ ] **Step 1: Write failing contract tests**

Add table-driven tests that construct one valid 80-word passage and assert:

```ts
assert.equal(validateReadingContentPack(validPack(), topics).length, 12);
assert.throws(
  () => validateReadingContentPack(validPack({ body: "too short" }), topics),
  /80 to 120 words/u
);
assert.throws(
  () =>
    validateReadingContentPack(
      validPack({
        questions: [
          question({
            options: [
              option("Same", true),
              option(" same ", false),
              option("Other", false),
            ],
          }),
          question(),
          question(),
          question(),
        ],
      }),
      topics
    ),
  /duplicate option/u
);
assert.throws(
  () => validateReadingContentPack(validPack({ topicSlug: "missing" }), topics),
  /unknown Topic/u
);
```

Also assert strict unknown-key rejection, exactly twelve unique slugs, `A1`,
positive minutes, four questions, three options, exactly one correct option,
and normalized prompt uniqueness.

- [ ] **Step 2: Run the contract tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/content/reading-content.test.ts
```

Expected: FAIL because `reading-content.ts` does not exist.

- [ ] **Step 3: Implement the strict schema and semantic validator**

Use strict Zod objects and semantic checks:

```ts
const optionSchema = z
  .object({ text: z.string().trim().min(1), correct: z.boolean() })
  .strict();
const questionSchema = z
  .object({
    prompt: z.string().trim().min(1),
    options: z.array(optionSchema).length(3),
  })
  .strict();
const passageSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    title: z.string().trim().min(1),
    cefrLevel: z.literal("A1"),
    topicSlug: z.string().trim().min(1),
    estimatedMinutes: z.number().int().positive(),
    body: z.string().trim().min(1),
    questions: z.array(questionSchema).length(4),
  })
  .strict();
const packSchema = z.array(passageSchema).length(12);
```

Normalize comparisons with `value.trim().toLocaleLowerCase("en-US")`.
Count body words with `body.trim().split(/\s+/u).filter(Boolean).length`. Gather
all semantic errors and throw one `Error` with newline-separated, path-specific
messages.

- [ ] **Step 4: Add deterministic vocabulary audit tests**

Prove case/punctuation normalization, sorted unique unknown words, and grouped
above-A1 catalog levels:

```ts
assert.deepEqual(auditReadingVocabulary(passages, catalog), {
  unknownWords: ["emma"],
  aboveA1Words: [{ word: "journey", cefrLevels: ["A2", "B1"] }],
});
```

- [ ] **Step 5: Implement the audit and canonical loader**

Tokenize with `/[A-Za-z]+(?:'[A-Za-z]+)?/gu`, lowercase tokens, compare them
with `normalizedWord`, and return sorted unique findings. Load files relative
to the API package root:

```ts
const repositoryRoot = resolve(process.cwd(), "../..");
const readingPath = join(repositoryRoot, "data/reading/a1/passages.json");
return JSON.parse(readFileSync(readingPath, "utf8")) as unknown;
```

The module must not import Prisma, environment configuration, or provider SDKs.

- [ ] **Step 6: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/content/reading-content.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS.

Commit:

```powershell
git add apps/api/scripts/reading/content
git commit -m "feat(api): validate Reading A1 content packs"
```

### Task 2: Author and verify the canonical twelve-passage pack

**Files:**

- Create: `data/reading/a1/passages.json`
- Modify: `apps/api/scripts/reading/content/reading-content.test.ts`

**Interfaces:**

- Consumes: `validateReadingContentPack`, `auditReadingVocabulary`, canonical
  Topic taxonomy, and canonical vocabulary catalog.
- Produces: the twelve exact slugs and Topic associations in the approved spec.

- [ ] **Step 1: Add the failing canonical dataset test**

Load the canonical JSON and assert:

```ts
const passages = validateReadingContentPack(
  loadCanonicalReadingContent(),
  topics
);
assert.deepEqual(
  passages.map(({ slug, topicSlug }) => ({ slug, topicSlug })),
  [
    { slug: "meeting-a-new-neighbor", topicSlug: "personal-information" },
    { slug: "sunday-with-my-family", topicSlug: "family" },
    { slug: "marias-busy-morning", topicSlug: "daily-routine" },
    { slug: "our-small-apartment", topicSlug: "home" },
    { slug: "lunch-at-the-cafe", topicSlug: "restaurant" },
    { slug: "shopping-for-a-birthday", topicSlug: "shopping" },
    { slug: "the-first-day-at-school", topicSlug: "school" },
    { slug: "a-new-part-time-job", topicSlug: "job" },
    { slug: "plans-for-a-rainy-day", topicSlug: "weather" },
    { slug: "taking-the-bus-downtown", topicSlug: "transportation" },
    { slug: "a-visit-to-the-doctor", topicSlug: "health" },
    { slug: "a-weekend-by-the-sea", topicSlug: "travel" },
  ]
);
```

Verify every prompt is answerable from its body and record the expected correct
option text in the test so accidental answer-key changes require review.

- [ ] **Step 2: Run the canonical test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/content/reading-content.test.ts
```

Expected: FAIL with file-not-found for `data/reading/a1/passages.json`.

- [ ] **Step 3: Author the twelve JSON records**

Write complete, internationally neutral A1 prose for the approved subjects.
Each record uses three minutes, 80–120 words, four questions, three plausible
options, and one correct flag. Use the approved first passage as the style
baseline:

```text
Emma lives in a small apartment in Bristol. On Monday evening, she meets her
new neighbor, Leo, in the hall...
```

The remaining records must be independent stories, not template substitutions.
Use only facts present in each passage, avoid idioms and culture-specific
knowledge, and keep names/locations internationally neutral.

- [ ] **Step 4: Review the vocabulary audit**

Run the pure test and print the deterministic audit through a test assertion.
Manually inspect every above-A1 word and unknown word. Replace avoidable
advanced vocabulary; preserve proper names and ordinary inflections when the
sentence remains A1.

- [ ] **Step 5: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/content/reading-content.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS.

Commit:

```powershell
git add data/reading apps/api/scripts/reading/content/reading-content.test.ts
git commit -m "feat(content): add twelve Reading A1 passages"
```

### Task 3: Implement idempotent draft synchronization

**Files:**

- Create: `apps/api/scripts/reading/import/reading-content-import.ts`
- Create: `apps/api/scripts/reading/import/reading-content-import.test.ts`

**Interfaces:**

- Consumes: validated `ReadingContentPassage[]`.
- Produces:

```ts
export type ReadingImportSummary = {
  created: string[];
  updated: string[];
  skipped: string[];
};
export interface ReadingImportStore {
  resolveTopics(slugs: string[]): Promise<Map<string, number>>;
  transaction<T>(work: (writer: ReadingImportWriter) => Promise<T>): Promise<T>;
}
export interface ReadingImportWriter {
  findPassage(slug: string): Promise<{
    id: number;
    status: "DRAFT" | "PUBLISHED";
  } | null>;
  createDraft(passage: ReadingContentPassage, topicId: number): Promise<void>;
  replaceDraft(
    id: number,
    passage: ReadingContentPassage,
    topicId: number
  ): Promise<void>;
}
export async function importReadingContent(
  passages: ReadingContentPassage[],
  store: ReadingImportStore
): Promise<ReadingImportSummary>;
```

- [ ] **Step 1: Write failing importer behavior tests**

Use an in-memory fake store and assert:

```ts
assert.deepEqual(await importReadingContent(pack, store), {
  created: ["new-passage"],
  updated: ["draft-passage"],
  skipped: ["published-passage"],
});
assert.equal(store.records.size, 3);
assert.equal(store.records.get("published-passage"), publishedBefore);
```

Add tests proving missing Topic produces zero transactions, derived
question/option order is one-based at the writer boundary, a thrown write rolls
back the fake transaction, and a second unchanged import creates no duplicate
slug.

- [ ] **Step 2: Run importer tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/import/reading-content-import.test.ts
```

Expected: FAIL because the import module does not exist.

- [ ] **Step 3: Implement minimal orchestration**

Resolve unique Topic slugs before opening the transaction:

```ts
const topicIds = await store.resolveTopics([
  ...new Set(passages.map((passage) => passage.topicSlug)),
]);
const missing = [
  ...new Set(passages.map((passage) => passage.topicSlug)),
].filter((slug) => !topicIds.has(slug));
if (missing.length > 0) {
  throw new Error(`Missing Reading Topics: ${missing.join(", ")}`);
}
```

Inside one transaction, iterate canonical array order. Skip `PUBLISHED`, replace
`DRAFT`, and create missing slugs. Sort each result array before returning so
operator output and tests are deterministic.

- [ ] **Step 4: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/import/reading-content-import.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS.

Commit:

```powershell
git add apps/api/scripts/reading/import
git commit -m "feat(api): synchronize Reading content drafts"
```

### Task 4: Compose the explicit Prisma importer command

**Files:**

- Create: `apps/api/scripts/reading/import-reading-a1.ts`
- Modify: `apps/api/package.json`
- Create: `apps/api/scripts/reading/import-reading-a1.test.ts`

**Interfaces:**

- Consumes: canonical loader/validator/audit, `importReadingContent`, and
  `scripts/support/script-prisma`.
- Produces package command:

```json
"data:import-reading-a1": "dotenv -e ../../.env -- tsx ./scripts/reading/import-reading-a1.ts"
```

- [ ] **Step 1: Write a failing structural command test**

Assert the package command exists and the executable:

```ts
assert.match(source, /loadCanonicalReadingContent/u);
assert.match(source, /validateReadingContentPack/u);
assert.match(source, /auditReadingVocabulary/u);
assert.match(source, /importReadingContent/u);
assert.match(source, /script-prisma/u);
assert.doesNotMatch(
  source,
  /migrate|publish|practice_sessions|user_vocabulary_progress/u
);
```

- [ ] **Step 2: Run the structural test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/import-reading-a1.test.ts
```

Expected: FAIL because the command does not exist.

- [ ] **Step 3: Implement the Prisma store adapter**

The adapter resolves `vocabulary_topics` by slug. Its writer maps arrays to
one-based persistence order:

```ts
reading_questions: {
  create: passage.questions.map((question, questionIndex) => ({
    prompt: question.prompt,
    order: questionIndex + 1,
    reading_options: {
      create: question.options.map((option, optionIndex) => ({
        text: option.text,
        order: optionIndex + 1,
        correct: option.correct,
      })),
    },
  })),
}
```

Draft replacement updates title, body, A1, Topic, minutes, clears and recreates
nested questions within the surrounding pack transaction, and leaves slug and
status unchanged.

The executable validates/audits before importing, prints warnings and summary
as JSON-safe bounded objects, disconnects Prisma in `finally`, and sets
`process.exitCode = 1` on error without printing credentials.

- [ ] **Step 4: Add the package command without executing it**

Modify `apps/api/package.json` with the exact command above. Do not invoke the
new command in tests, builds, seeds, migrations, or this implementation session.

- [ ] **Step 5: Run GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/import-reading-a1.test.ts scripts/reading/import/reading-content-import.test.ts scripts/reading/content/reading-content.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all PASS with no database connection.

Commit:

```powershell
git add apps/api/scripts/reading apps/api/package.json
git commit -m "feat(api): add explicit Reading A1 importer"
```

### Task 5: Document operations and run full offline verification

**Files:**

- Create: `docs/guides/reading-a1-content-import.md`
- Modify: `docs/features-overview.md`
- Modify: `docs/architecture/api.md`

**Interfaces:**

- Consumes: completed canonical pack and explicit package command.
- Produces: operator runbook and accurate feature status.

- [ ] **Step 1: Write the operator runbook**

Document this exact sequence while clearly separating commands that require
environment authorization:

```powershell
# Offline and safe
pnpm --filter @repo/api exec tsx --test scripts/reading/content/reading-content.test.ts

# Operating actions: run only against the explicitly selected environment
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-reading-a1
```

Include preflight database identity confirmation, expected
created/updated/skipped summary, Admin review at `/reading-passages`, individual
publish, learner checks at `/en/reading` and `/vi/reading`, submission/result
verification, and the rule that published passages must be explicitly
unpublished before synchronization.

- [ ] **Step 2: Update canonical architecture and feature docs**

Record `data/reading/a1/passages.json` as the Reading content source and the
importer as an offline API adapter. Change the remaining Reading A1 item from
"author data" to "apply migration/import/review in each operating environment";
do not claim any database has received the pack.

- [ ] **Step 3: Run the full offline gate**

Run:

```powershell
pnpm architecture:check
pnpm test
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm check-types
pnpm lint
pnpm build
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
git diff --check
git status --short
```

Expected: every command exits zero. Git status contains only intended source,
content, tests, and docs; no database dump, generated client, provider artifact,
secret, or local report appears.

- [ ] **Step 4: Commit documentation**

```powershell
git add docs
git commit -m "docs: document Reading A1 content operations"
```

- [ ] **Step 5: Integrate locally**

Use `superpowers:finishing-a-development-branch`, merge the verified feature
branch into local `develop`, prove the merge tree equals the verified feature
tree, and rerun architecture/test on the merge commit. Do not push, apply
migrations, import drafts, seed data, or publish content without a separate
explicit request naming the target environment.
