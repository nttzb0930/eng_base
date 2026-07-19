# Topic Expansion CLI Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unreadable one-line Topic deficit output with a deterministic bilingual report, add an explicit `--json` mode, and show bounded progress around single-Topic generation.

**Architecture:** A pure `topic-expansion-cli.ts` module owns argument parsing, versioned deficit-report construction, and human formatting. The existing generator remains the only filesystem/provider adapter: it validates canonical inputs, atomically writes the ignored report, selects human or JSON output, and leaves expansion generation/validation unchanged.

**Tech Stack:** TypeScript 6, Node.js `node:test`, `tsx`, Node `fs/promises`, pnpm workspace scripts.

## Global Constraints

- No-slug deficit reporting must not call an AI provider, mutate the canonical catalog, or write PostgreSQL.
- Preserve `VOCAB_TOPIC_MINIMUM_WORDS=30` as the existing default.
- Preserve exact ten-example expansion validation and human `review -> accepted` gating.
- Default output is Windows-terminal-safe plain text without ANSI colors or box-drawing characters.
- `--json` prints compact JSON/JSONL only; the standard pnpm delimiter `--` is accepted, unknown flags and multiple slugs fail.
- Always write the full byte-stable report to ignored `data/vocabulary/working/topic-expansion/deficits.json`.
- Do not call a provider as part of tests or verification.

---

## File map

- Create `apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts`: pure argument parsing, report model construction, and human formatting.
- Modify `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`: report/parser/formatter behavior.
- Modify `apps/api/scripts/vocabulary/topic-expansion/generate-topic-expansion.ts`: atomic report write and output selection.
- Modify `docs/data/vocabulary-pipeline.md`: default table, `--json`, report path, and generation progress.

### Task 1: Pure argument and report Interface

**Files:**

- Create: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts`
- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- Consumes: `VocabularyTopicDefinition[]` and `TopicDeficit[]`.
- Produces: `parseTopicExpansionArguments(args: string[]): TopicExpansionArguments`.
- Produces: `createTopicDeficitReport(input): TopicDeficitReport`.
- Produces: `formatTopicDeficitReport(report, reportPath): string`.
- Produces: `formatGenerationStart(topic, requestedCount): string` and `formatGenerationCreated(topic, generatedWords, outputPath): string`.

- [ ] **Step 1: Write failing parser tests**

Add imports and tests:

```ts
import {
  createTopicDeficitReport,
  formatGenerationCreated,
  formatGenerationStart,
  formatTopicDeficitReport,
  parseTopicExpansionArguments,
} from "./topic-expansion-cli.js";

test("Topic expansion arguments accept pnpm delimiter and JSON mode", () => {
  assert.deepEqual(parseTopicExpansionArguments(["--", "--json"]), {
    json: true,
    topicSlug: null,
  });
  assert.deepEqual(
    parseTopicExpansionArguments(["--", "transportation", "--json"]),
    { json: true, topicSlug: "transportation" }
  );
});

test("Topic expansion arguments reject unknown flags and multiple slugs", () => {
  assert.throws(
    () => parseTopicExpansionArguments(["--verbose"]),
    /Unknown Topic expansion flag "--verbose"/u
  );
  assert.throws(
    () => parseTopicExpansionArguments(["airport", "hotel"]),
    /accepts at most one Topic slug/u
  );
});
```

- [ ] **Step 2: Run focused test and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/topic-expansion/topic-expansion.test.ts
```

Expected: FAIL because `topic-expansion-cli.js` does not exist.

- [ ] **Step 3: Implement the minimal argument parser**

Create:

```ts
export type TopicExpansionArguments = {
  json: boolean;
  topicSlug: string | null;
};

export function parseTopicExpansionArguments(
  args: string[]
): TopicExpansionArguments {
  let json = false;
  const topicSlugs: string[] = [];

  for (const argument of args) {
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown Topic expansion flag "${argument}"`);
    }
    topicSlugs.push(argument);
  }

  if (topicSlugs.length > 1) {
    throw new Error("Topic expansion accepts at most one Topic slug");
  }
  return { json, topicSlug: topicSlugs[0] ?? null };
}
```

- [ ] **Step 4: Run focused test and verify GREEN**

Expected: existing expansion tests plus two parser tests pass.

- [ ] **Step 5: Write failing report and formatter tests**

Extend the fixture taxonomy to include ordered bilingual groups:

```ts
const reportTopics: VocabularyTopicDefinition[] = [
  topics[0]!,
  {
    slug: "technology",
    title: "Technology",
    titleVi: "Công nghệ",
    description: "Technology vocabulary.",
    descriptionVi: "Từ vựng công nghệ.",
    order: 2,
    group: "Technology",
    groupVi: "Công nghệ",
  },
  {
    slug: "artificial-intelligence",
    title: "Artificial Intelligence",
    titleVi: "Trí tuệ nhân tạo",
    description: "Artificial intelligence vocabulary.",
    descriptionVi: "Từ vựng trí tuệ nhân tạo.",
    order: 3,
    group: "Technology",
    groupVi: "Công nghệ",
  },
];

test("deficit report reconciles totals and preserves bilingual taxonomy order", () => {
  const report = createTopicDeficitReport({
    topics: reportTopics,
    deficits: [
      { slug: "airport", existingCount: 29, requestedCount: 1 },
      { slug: "technology", existingCount: 23, requestedCount: 7 },
      {
        slug: "artificial-intelligence",
        existingCount: 0,
        requestedCount: 30,
      },
    ],
    minimumWords: 30,
    catalogItems: 3000,
  });

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.totalTopics, 3);
  assert.equal(report.deficientTopics, 3);
  assert.equal(report.emptyTopics, 1);
  assert.equal(report.requestedNewWords, 38);
  assert.deepEqual(
    report.groups.map((group) => ({
      group: group.group,
      groupVi: group.groupVi,
      slugs: group.topics.map((topic) => topic.slug),
    })),
    [
      { group: "Travel", groupVi: "Du lịch", slugs: ["airport"] },
      {
        group: "Technology",
        groupVi: "Công nghệ",
        slugs: ["technology", "artificial-intelligence"],
      },
    ]
  );
  assert.equal(report.providerCalled, false);
  assert.equal(report.databaseUpdated, false);
});

test("human deficit output is readable and contains every affected Topic", () => {
  const report = createTopicDeficitReport({
    topics: reportTopics,
    deficits: calculateTopicDeficits(reportTopics, [item(1)], 30),
    minimumWords: 30,
    catalogItems: 3000,
  });
  const text = formatTopicDeficitReport(
    report,
    "data/vocabulary/working/topic-expansion/deficits.json"
  );

  assert.match(text, /Vocabulary Topic Expansion Deficits/u);
  assert.match(text, /Technology \/ Công nghệ/u);
  assert.match(text, /artificial-intelligence/u);
  assert.match(text, /Provider called\s+: no/u);
  assert.match(text, /Database updated\s+: no/u);
  assert.equal(
    formatTopicDeficitReport(report, "report.json"),
    formatTopicDeficitReport(report, "report.json")
  );
});

test("human generation messages expose bounded progress without provider data", () => {
  assert.match(
    formatGenerationStart(reportTopics[0]!, 12),
    /Generating 12 words for airport/u
  );
  assert.match(
    formatGenerationCreated(reportTopics[0]!, 12, "airport.json"),
    /Created review artifact.*airport\.json/su
  );
});
```

- [ ] **Step 6: Run focused test and verify RED**

Expected: FAIL because report and formatter exports are missing.

- [ ] **Step 7: Implement the report types and construction**

Add these types:

```ts
import type { TopicDeficit } from "./topic-expansion.js";
import type { VocabularyTopicDefinition } from "../catalog/vocabulary-catalog.js";

export type TopicDeficitReportEntry = TopicDeficit & {
  title: string;
  titleVi: string;
};

export type TopicDeficitReportGroup = {
  group: string;
  groupVi: string;
  topics: TopicDeficitReportEntry[];
};

export type TopicDeficitReport = {
  schemaVersion: 1;
  action: "vocabulary-topic-expansion-deficits";
  minimumWords: number;
  totalTopics: number;
  deficientTopics: number;
  emptyTopics: number;
  requestedNewWords: number;
  catalogItems: number;
  groups: TopicDeficitReportGroup[];
  providerCalled: false;
  databaseUpdated: false;
};
```

Implement `createTopicDeficitReport` by indexing topics by slug, iterating the
already ordered deficits, appending entries to the first-seen taxonomy group,
and throwing `Missing Topic definition for deficit "<slug>"` when a deficit has
no canonical definition. Derive all summary counts from the final entries and
assert their total equals `deficits.length`.

- [ ] **Step 8: Implement plain-text formatting and rerun GREEN**

Use `toLocaleString("en-US")` for summary counts, `padEnd` for slugs, and
`padStart` for numeric columns. Join lines with `\n`; do not emit ANSI codes.
Implement generation messages as pure line arrays joined with `\n` and include
only Topic slug/title, requested/generated count, output path, and database
status. Run the focused test. Expected: all tests pass.

- [ ] **Step 9: Commit Task 1**

```powershell
git add apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts
git commit -m "feat(data): format Topic expansion reports"
```

### Task 2: Wire safe output modes into the generator

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-expansion/generate-topic-expansion.ts`
- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`
- Modify: `docs/data/vocabulary-pipeline.md`

**Interfaces:**

- Consumes Task 1 parser/report/formatters.
- Produces ignored `data/vocabulary/working/topic-expansion/deficits.json`.
- Preserves current review artifact contract for Topic-slug generation.

- [ ] **Step 1: Add a failing source-boundary test for CLI wiring**

Add:

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";

test("Topic expansion generator exposes report artifact and JSON mode", async () => {
  const source = await readFile(
    path.resolve(
      process.cwd(),
      "scripts/vocabulary/topic-expansion/generate-topic-expansion.ts"
    ),
    "utf8"
  );
  assert.match(source, /parseTopicExpansionArguments/u);
  assert.match(source, /deficits\.json/u);
  assert.match(source, /formatTopicDeficitReport/u);
  assert.doesNotMatch(
    source,
    /console\.log\(\s*JSON\.stringify\(\{\s*action:\s*"vocabulary-topic-expansion-deficits"/su
  );
});
```

- [ ] **Step 2: Run focused test and verify RED**

Expected: FAIL because the generator still prints the legacy inline deficit
object and has no report path/parser import.

- [ ] **Step 3: Refactor generator argument parsing and atomic JSON writes**

Import Task 1 functions. Replace the current `topicArgument` parsing with:

```ts
const arguments_ = parseTopicExpansionArguments(process.argv.slice(2));
```

Extract the existing temporary-write pattern into:

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

Add `rm` to the `fs/promises` import and reuse the helper for both deficit and
review artifacts.

- [ ] **Step 4: Wire no-slug report output**

When `arguments_.topicSlug === null`, create the report, create `outputRoot`,
atomically write `path.join(outputRoot, "deficits.json")`, then:

```ts
if (arguments_.json) {
  console.log(JSON.stringify(report));
} else {
  console.log(formatTopicDeficitReport(report, reportPath));
}
return;
```

This branch must execute before any call to `generate()`.

- [ ] **Step 5: Wire generation progress without changing provider behavior**

Before `generate()`, human mode prints `formatGenerationStart`; JSON mode prints:

```ts
console.log(
  JSON.stringify({
    event: "generation-start",
    topic: topic.slug,
    requestedWords: deficit.requestedCount,
  })
);
```

After validating and atomically writing the review artifact, human mode prints
`formatGenerationCreated`; JSON mode prints the existing completion fields with
`event: "generation-created-for-review"`. Do not include prompts, raw provider
responses, meanings, examples, credentials, or URLs.

- [ ] **Step 6: Run focused tests, type-check, and lint**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: all commands exit 0.

- [ ] **Step 7: Document human and JSON modes**

Update the Topic expansion section in `docs/data/vocabulary-pipeline.md` with:

````markdown
The no-slug command prints a bilingual grouped table and atomically writes the
full deterministic report to ignored
`working/topic-expansion/deficits.json`. Automation can request compact JSON:

```powershell
pnpm --filter @repo/api data:generate-topic-expansion -- --json
```

Passing a Topic slug prints bounded generation progress in human mode. Add
`--json` to receive JSONL start/completion events. Neither completion mode writes
PostgreSQL; the generated artifact remains in `review`.
````

- [ ] **Step 8: Run real offline modes and prove deterministic output**

Run the default command and verify readable grouped output. Hash
`working/topic-expansion/deficits.json`, run `--json`, hash it again, and require
equal SHA-256 values. Parse JSON stdout and confirm:

```text
providerCalled=false
databaseUpdated=false
deficientTopics=92 (or the current catalog-derived value)
```

Do not run a Topic-slug command because that calls the provider.

- [ ] **Step 9: Run the vocabulary gate and formatting**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm exec prettier --check apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts apps/api/scripts/vocabulary/topic-expansion/generate-topic-expansion.ts docs/data/vocabulary-pipeline.md
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 10: Commit Task 2**

```powershell
git add apps/api/scripts/vocabulary/topic-expansion/generate-topic-expansion.ts apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts docs/data/vocabulary-pipeline.md
git commit -m "feat(data): improve Topic expansion CLI output"
```

### Task 3: Final verification and handoff

**Files:** Verify only.

- [ ] **Step 1: Run complete API gates**

```powershell
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
pnpm --filter @repo/api architecture:check
```

Expected: all commands exit 0.

- [ ] **Step 2: Verify Git/report boundaries**

```powershell
git diff --check
git status --short
git log -4 --oneline
```

Expected: tracked checkout clean, `deficits.json` absent from status because it
is below ignored `working/`, and both feature commits are present.

- [ ] **Step 3: Handoff**

Report the readable summary counts, report path, JSON command, fresh verification
results, and explicit confirmation that no provider or database call occurred.
Then return to the separately scoped targeted-recovery design.
