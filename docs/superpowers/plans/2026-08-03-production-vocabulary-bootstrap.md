# Production Vocabulary Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-safe, idempotent Vocabulary and English Vocabulary curriculum bootstrap while making the existing destructive seed explicitly development-only.

**Architecture:** A pure planner converts validated canonical JSON plus a bounded live database snapshot into a deterministic plan. A Prisma store applies that plan inside one advisory-locked transaction; dry-run executes the same writer and rolls back. A thin CLI owns modes, confirmation, sanitized output, and source-path resolution, while the production API artifact packages the compiled command and exactly the two canonical JSON files.

**Tech Stack:** TypeScript 6, Node.js 22, Prisma 7/PostgreSQL, Node test runner, pnpm, Docker.

## Global Constraints

- Scope is limited to canonical Vocabulary, Topics, and the `english-vocabulary` A1-B2 curriculum.
- TOEIC, Reading, Grammar, Users, Auth, learner progress, practice history, and custom courses are not bootstrap-owned.
- The safe path must contain no `deleteMany`, raw `DELETE`, `TRUNCATE`, reset, or cascade cleanup.
- `plan` is read-only; `dry-run` rolls back; `apply` needs the exact target/source/plan confirmation token.
- No live database apply is authorized by this implementation plan.
- Use `scripts/support/script-prisma.ts`; do not create another Prisma client boundary.
- Canonical data remains `data/vocabulary/vocabulary-catalog.json` and `data/vocabulary/topics.json`.
- Preserve user-owned untracked `artifacts/` and `tools/`.

---

### Task 1: Make destructive seed development-only

**Files:**

- Create: `apps/api/scripts/vocabulary/database/development-seed-guard.ts`
- Create: `apps/api/scripts/vocabulary/database/development-seed-guard.test.ts`
- Rename: `apps/api/scripts/seed.ts` to `apps/api/scripts/seed-dev.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`
- Modify: `apps/api/test/api-source-architecture.test.ts`

**Interfaces:**

- Produces: `assertDevelopmentSeedAllowed(environment: NodeJS.ProcessEnv): void`
- Produces: root and API command `db:seed:dev`; removes ambiguous `db:seed`.

- [ ] **Step 1: Write failing guard and package-interface tests**

```ts
// apps/api/scripts/vocabulary/database/development-seed-guard.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import * as guardModule from "./development-seed-guard.js";

test("development seed rejects production before database access", () => {
  const guard = (
    guardModule as typeof guardModule & {
      assertDevelopmentSeedAllowed?: (environment: NodeJS.ProcessEnv) => void;
    }
  ).assertDevelopmentSeedAllowed;

  assert.throws(
    () => guard?.({ NODE_ENV: "production" }),
    /development-only/iu
  );
});

test("development seed accepts an explicit non-production environment", () => {
  assert.doesNotThrow(() =>
    guardModule.assertDevelopmentSeedAllowed({ NODE_ENV: "development" })
  );
});
```

Add an architecture assertion that parses both package files and verifies
`db:seed` is absent while `db:seed:dev` is present.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/development-seed-guard.test.ts test/api-source-architecture.test.ts
```

Expected: FAIL because the guard module and `db:seed:dev` interface do not exist.

- [ ] **Step 3: Implement the guard and rename the command**

```ts
// apps/api/scripts/vocabulary/database/development-seed-guard.ts
export function assertDevelopmentSeedAllowed(environment: NodeJS.ProcessEnv) {
  if (environment.NODE_ENV === "production") {
    throw new Error(
      "db:seed:dev is development-only and cannot run in production"
    );
  }
}
```

Call `assertDevelopmentSeedAllowed(process.env)` in `seed-dev.ts` before
constructing `PrismaClient`, loading JSON, or hashing the Admin password. Rename
the package scripts to:

```json
{
  "db:seed:dev": "dotenv -e ../../.env -- tsx ./scripts/seed-dev.ts"
}
```

and:

```json
{
  "db:seed:dev": "pnpm --filter @repo/api db:seed:dev"
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json apps/api/package.json apps/api/scripts/seed-dev.ts apps/api/scripts/vocabulary/database/development-seed-guard.ts apps/api/scripts/vocabulary/database/development-seed-guard.test.ts apps/api/test/api-source-architecture.test.ts
git commit -m "refactor(data): isolate destructive development seed"
```

---

### Task 2: Build deterministic desired curriculum and plan

**Files:**

- Create: `apps/api/scripts/vocabulary/database/vocabulary-bootstrap-plan.ts`
- Create: `apps/api/scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts`
- Reuse: `apps/api/scripts/vocabulary/database/vocabulary-seed-data.ts`

**Interfaces:**

- Consumes: `VocabularySeedData`, `VocabularyCatalogItem`, and `vocabularyIdentity`.
- Produces: `buildVocabularyBootstrapPlan(source, live): VocabularyBootstrapPlan`.
- Produces: `buildBootstrapConfirmation(plan): string`.
- Produces: serializable `VocabularyBootstrapLiveState` and action types consumed by Task 3.

- [ ] **Step 1: Write failing planner tests**

Use compact A1/A2 fixtures and assert these independent behaviors:

```ts
test("planner creates only missing canonical and curriculum records", () => {
  const plan = buildVocabularyBootstrapPlan(sourceFixture, emptyLiveState);
  assert.equal(plan.summary.courses.create, 1);
  assert.equal(plan.summary.units.create, 4);
  assert.equal(plan.summary.vocabularyItems.create, 2);
  assert.equal(plan.summary.examples.create, 2);
  assert.equal(plan.summary.topics.create, 1);
  assert.equal(plan.summary.destructiveOperations, 0);
});

test("planner is unchanged when live state already matches desired state", () => {
  const plan = buildVocabularyBootstrapPlan(sourceFixture, matchingLiveState);
  assert.equal(plan.summary.totals.create, 0);
  assert.equal(plan.summary.totals.update, 0);
});

test("planner retains records outside canonical ownership", () => {
  const plan = buildVocabularyBootstrapPlan(
    sourceFixture,
    liveWithToeicAndCustomData
  );
  assert.equal(
    plan.actions.courses.some((action) => action.key === "toeic-600"),
    false
  );
  assert.equal(plan.summary.retainedExternalRecords, 2);
});

test("planner rejects duplicate logical Units instead of guessing", () => {
  assert.throws(
    () => buildVocabularyBootstrapPlan(sourceFixture, liveWithDuplicateA1Units),
    /ambiguous.*A1/iu
  );
});

test("curriculum distractors and fingerprints are deterministic", () => {
  const first = buildVocabularyBootstrapPlan(sourceFixture, emptyLiveState);
  const second = buildVocabularyBootstrapPlan(sourceFixture, emptyLiveState);
  assert.equal(first.sourceSha256, second.sourceSha256);
  assert.equal(first.planSha256, second.planSha256);
  assert.deepEqual(first.desired.curriculum, second.desired.curriculum);
});
```

- [ ] **Step 2: Run planner tests and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts
```

Expected: FAIL because `vocabulary-bootstrap-plan.ts` does not exist.

- [ ] **Step 3: Implement the planner types and deterministic hashing**

Define the public shape exactly:

```ts
export type BootstrapAction<T> = {
  operation: "create" | "update" | "reuse";
  key: string;
  existingId?: number;
  value: T;
};

export type VocabularyBootstrapPlan = {
  version: 1;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  confirmation: string;
  desired: VocabularyBootstrapDesiredState;
  actions: VocabularyBootstrapActions;
  summary: VocabularyBootstrapSummary;
};

export type BootstrapOperationCounts = {
  create: number;
  update: number;
  reuse: number;
};

export type VocabularyBootstrapSummary = {
  vocabularyItems: BootstrapOperationCounts;
  examples: BootstrapOperationCounts;
  topics: BootstrapOperationCounts;
  relations: BootstrapOperationCounts;
  courses: BootstrapOperationCounts;
  units: BootstrapOperationCounts;
  lessons: BootstrapOperationCounts;
  challenges: BootstrapOperationCounts;
  options: BootstrapOperationCounts;
  totals: BootstrapOperationCounts;
  destructiveOperations: 0;
  retainedExternalRecords: number;
};

export function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}
```

Hash sorted canonical data and sorted live snapshots only; exclude timestamps.
Create the confirmation after computing the plan hash:

```ts
export const buildBootstrapConfirmation = (input: {
  databaseTarget: string;
  sourceSha256: string;
  planSha256: string;
}) => `APPLY_VOCABULARY_BOOTSTRAP_${sha256(input).slice(0, 24).toUpperCase()}`;
```

- [ ] **Step 4: Implement desired curriculum generation**

Use exactly `A1`, `A2`, `B1`, and `B2`, 15 words per Lesson, and canonical
catalog order. Generate two Challenges per word. Select three distractors by
walking the same-level catalog circularly from a stable SHA-256-derived offset,
then adjacent levels, rejecting duplicate identity and duplicate answer text.
Sort the final four options by `sha256(challengeKey + "|" + optionText)` so the
result never depends on `Math.random()`.

Match live records by these keys:

```text
course: english-vocabulary
unit: english-vocabulary|<CEFR>
lesson: english-vocabulary|<CEFR>|<ordinal>
challenge: <lesson-key>|<vocabulary-identity>|<type>|<direction>|<order>
option slot: <challenge-key>|<slot 1..4>
topic: <slug>
relation: <vocabulary-identity>|<topic-slug>
example: <vocabulary-identity>|<example-en> (`order` is a managed field)
```

Fail if more than one live row maps to any key. Emit create/update/reuse only;
there is no delete action type.

- [ ] **Step 5: Run planner tests and verify GREEN**

Run Step 2. Expected: all planner tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/scripts/vocabulary/database/vocabulary-bootstrap-plan.ts apps/api/scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts
git commit -m "feat(data): plan idempotent vocabulary bootstrap"
```

---

### Task 3: Add the Prisma snapshot and transactional store

**Files:**

- Create: `apps/api/scripts/vocabulary/database/vocabulary-bootstrap-store.ts`
- Create: `apps/api/scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts`
- Modify: `apps/api/test/api-source-architecture.test.ts`

**Interfaces:**

- Consumes: `VocabularyBootstrapPlan` from Task 2.
- Produces: `loadVocabularyBootstrapState(client, databaseTarget)`.
- Produces: `executeVocabularyBootstrap(client, plan, mode)` where mode is `dry-run | apply`.

- [ ] **Step 1: Write failing store safety tests**

Test through an injected transaction port rather than a live database:

```ts
test("dry-run executes the writer and returns a rolled-back report", async () => {
  const fake = createBootstrapTransactionFixture();
  const report = await executeVocabularyBootstrap(
    fake.client,
    planFixture,
    "dry-run"
  );
  assert.equal(report.committed, false);
  assert.equal(fake.persistentState, fake.initialState);
  assert.equal(fake.calls.includes("write-plan"), true);
});

test("apply refuses live drift before the first mutation", async () => {
  const fake = createBootstrapTransactionFixture({ liveSha256: "changed" });
  await assert.rejects(
    executeVocabularyBootstrap(fake.client, planFixture, "apply"),
    /live database changed/iu
  );
  assert.deepEqual(fake.mutations, []);
});
```

Extend the architecture test to recursively read the safe bootstrap files and
reject `/\.deleteMany\(|\bDELETE\b|\bTRUNCATE\b|db:migrate:reset/iu`.

- [ ] **Step 2: Run tests and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts test/api-source-architecture.test.ts
```

Expected: FAIL because the store does not exist.

- [ ] **Step 3: Implement the bounded live snapshot**

Load only fields needed by the planner from:

```text
vocabulary_items, vocabulary_examples, vocabulary_topics, vocabulary_item_topics,
courses(code = english-vocabulary), units, lessons, challenges,
challenge_options
```

Also load aggregate counts for non-owned courses and protected learner/TOEIC
tables so the report can prove they are retained without loading their rows.
Derive a sanitized target with `URL.hostname`, port, decoded database name, and
schema; never expose username or password.

- [ ] **Step 4: Implement one advisory-locked transaction**

At transaction start execute a fixed PostgreSQL advisory transaction lock:

```ts
await transaction.$queryRaw`SELECT pg_advisory_xact_lock(1162758234)`;
```

Reload live state inside the lock and compare `liveSha256`. Apply topic and
Vocabulary creates/updates, resolve their database IDs, create missing examples
and relations, then apply Course → Unit → Lesson → Challenge → Option actions
in parent-first order. Update canonical-managed columns only. Batch missing
Vocabulary, example, relation, Challenge, and Option inserts in chunks of 500;
perform updates only for actions whose canonical-managed fields differ.

Use an explicit long-running transaction boundary for the reviewed data job:

```ts
await client.$transaction(runBootstrap, {
  isolationLevel: "Serializable",
  maxWait: 30_000,
  timeout: 900_000,
});
```

For `dry-run`, throw and catch a private sentinel carrying the completed report:

```ts
class DryRunRollback extends Error {
  constructor(readonly report: VocabularyBootstrapExecutionReport) {
    super("ROLLBACK_VOCABULARY_BOOTSTRAP_DRY_RUN");
  }
}
```

Prisma rolls the transaction back; only this exact sentinel is converted to a
successful `{ committed: false }` report. All other failures propagate.

- [ ] **Step 5: Run tests and verify GREEN**

Run Step 2. Expected: all store and architecture tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/scripts/vocabulary/database/vocabulary-bootstrap-store.ts apps/api/scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts apps/api/test/api-source-architecture.test.ts
git commit -m "feat(data): apply vocabulary bootstrap transactionally"
```

---

### Task 4: Add plan, dry-run, and confirmed apply CLI

**Files:**

- Create: `apps/api/scripts/vocabulary/database/bootstrap-vocabulary.ts`
- Create: `apps/api/scripts/vocabulary/database/bootstrap-vocabulary.test.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`

**Interfaces:**

- Consumes: planner and Prisma store from Tasks 2-3.
- Produces: `parseBootstrapArguments(values)` and `runVocabularyBootstrap(runtime, arguments)`.
- Produces: local commands `data:bootstrap-vocabulary` at API and root.

- [ ] **Step 1: Write failing CLI tests**

```ts
test("plan loads live state but never invokes the writer", async () => {
  const runtime = createRuntimeFixture();
  const result = await runVocabularyBootstrap(runtime, { mode: "plan" });
  assert.equal(result.action, "vocabulary-bootstrap-plan");
  assert.equal(runtime.writeCalls, 0);
});

test("apply rejects a missing or stale confirmation before writing", async () => {
  const runtime = createRuntimeFixture();
  await assert.rejects(
    runVocabularyBootstrap(runtime, { mode: "apply", confirmation: "STALE" }),
    /confirmation/iu
  );
  assert.equal(runtime.writeCalls, 0);
});

test("CLI accepts only plan, dry-run, and apply", () => {
  assert.deepEqual(parseBootstrapArguments(["plan"]), { mode: "plan" });
  assert.throws(
    () => parseBootstrapArguments(["reset"]),
    /plan.*dry-run.*apply/iu
  );
});
```

- [ ] **Step 2: Run CLI tests and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/bootstrap-vocabulary.test.ts
```

Expected: FAIL because the command module does not exist.

- [ ] **Step 3: Implement dependency-injected orchestration**

The runtime Interface is:

```ts
export type VocabularyBootstrapRuntime = {
  loadSource(dataDirectory: string): Promise<VocabularySeedData>;
  loadLiveState(): Promise<VocabularyBootstrapLiveState>;
  execute(
    plan: VocabularyBootstrapPlan,
    mode: "dry-run" | "apply"
  ): Promise<VocabularyBootstrapExecutionReport>;
  print(value: unknown): void;
};
```

Resolve `--data-dir PATH` when supplied. Otherwise use
`../../data/vocabulary` from local `apps/api` execution. Require the production
compiled package command to pass `--data-dir ./data/vocabulary` explicitly.
Print JSON containing action, sanitized target, counts, fingerprints, and
confirmation. Never print environment variables or URLs with credentials.

- [ ] **Step 4: Wire package commands**

```json
// apps/api/package.json
{
  "data:bootstrap-vocabulary": "dotenv -e ../../.env -- tsx ./scripts/vocabulary/database/bootstrap-vocabulary.ts"
}
```

```json
// package.json
{
  "data:bootstrap-vocabulary": "pnpm --filter @repo/api data:bootstrap-vocabulary"
}
```

- [ ] **Step 5: Run CLI tests and the read-only live plan**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/bootstrap-vocabulary.test.ts
pnpm data:bootstrap-vocabulary -- plan
```

Expected: tests PASS; live command prints a plan for `eng_base/public` and does
not modify any table. Record the proposed counts, but do not run live dry-run or
apply without a separate explicit database-write confirmation.

- [ ] **Step 6: Commit**

```powershell
git add package.json apps/api/package.json apps/api/scripts/vocabulary/database/bootstrap-vocabulary.ts apps/api/scripts/vocabulary/database/bootstrap-vocabulary.test.ts
git commit -m "feat(data): expose safe vocabulary bootstrap CLI"
```

---

### Task 5: Package the bootstrap command and canonical JSON

**Files:**

- Create: `apps/api/tsconfig.data-bootstrap.json`
- Modify: `apps/api/package.json`
- Modify: `apps/api/Dockerfile`
- Modify: `apps/api/test/docker-architecture.test.ts`

**Interfaces:**

- Consumes: bootstrap entrypoint from Task 4.
- Produces: `dist-data/scripts/vocabulary/database/bootstrap-vocabulary.js`.
- Produces: `/app/data/vocabulary/{vocabulary-catalog.json,topics.json}` in the API runner.

- [ ] **Step 1: Write failing production-packaging tests**

Extend `docker-architecture.test.ts` to require:

```ts
assert.match(source, /pnpm --filter @repo\/api build:data-bootstrap/u);
assert.match(source, /dist-data/u);
assert.match(source, /vocabulary-catalog\.json/u);
assert.match(source, /topics\.json/u);
assert.doesNotMatch(source, /data\/vocabulary\/(?:working|backups)/u);
```

Add package assertions for the compiled operator command:

```text
node dist-data/scripts/vocabulary/database/bootstrap-vocabulary.js
--data-dir ./data/vocabulary
```

- [ ] **Step 2: Run Docker architecture tests and verify RED**

```powershell
pnpm --filter @repo/api exec tsx --test test/docker-architecture.test.ts
```

Expected: FAIL because the production artifact does not package the command or JSON.

- [ ] **Step 3: Add the focused data-bootstrap compiler**

```json
// apps/api/tsconfig.data-bootstrap.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "rootDir": ".",
    "outDir": "dist-data",
    "sourceMap": true
  },
  "include": [
    "scripts/vocabulary/database/bootstrap-vocabulary.ts",
    "scripts/vocabulary/database/vocabulary-bootstrap-plan.ts",
    "scripts/vocabulary/database/vocabulary-bootstrap-store.ts",
    "scripts/vocabulary/database/vocabulary-seed-data.ts",
    "scripts/vocabulary/catalog/vocabulary-catalog.ts",
    "scripts/support/script-prisma.ts",
    "src/config/database-url.ts",
    "src/database/prisma/prisma.config.ts"
  ]
}
```

Add:

```json
{
  "build:data-bootstrap": "tsc -p tsconfig.data-bootstrap.json",
  "data:bootstrap-vocabulary:compiled": "node dist-data/scripts/vocabulary/database/bootstrap-vocabulary.js --data-dir ./data/vocabulary"
}
```

- [ ] **Step 4: Update the API image**

In the builder, run `build:data-bootstrap`. Copy `apps/api/dist-data` plus only
the two canonical JSON files into `/production/api`. Retain `USER node`; do not
add migration or bootstrap to `CMD` or `ENTRYPOINT`.

- [ ] **Step 5: Verify compilation and packaging assertions**

```powershell
pnpm --filter @repo/api build:data-bootstrap
pnpm --filter @repo/api exec tsx --test test/docker-architecture.test.ts
```

Expected: compilation succeeds and architecture tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/tsconfig.data-bootstrap.json apps/api/package.json apps/api/Dockerfile apps/api/test/docker-architecture.test.ts
git commit -m "build(api): package vocabulary bootstrap tooling"
```

---

### Task 6: Document production operations and close verification

**Files:**

- Modify: `docs/data/vocabulary-pipeline.md`
- Modify: `docs/guides/ci-cd.md`
- Modify: `docs/guides/verification.md`

**Interfaces:**

- Documents: first-production bootstrap and later canonical sync sequence.
- Documents: destructive development reset boundary and exact commands.

- [ ] **Step 1: Add documentation assertions to architecture tests**

Require canonical docs to contain `db:seed:dev`,
`data:bootstrap-vocabulary -- plan`, `dry-run`, `apply --confirm`, backup before
apply, and the publish-not-import deployment boundary. Require the stale
`currently contains 3,000 records` sentence to be absent.

- [ ] **Step 2: Run architecture tests and verify RED**

```powershell
pnpm --filter @repo/api architecture:check
```

Expected: FAIL on the missing runbook text.

- [ ] **Step 3: Update canonical documentation**

Document this operator sequence without embedding a real token:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api pnpm data:bootstrap-vocabulary:compiled -- plan
# Take and verify a PostgreSQL backup here.
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api pnpm data:bootstrap-vocabulary:compiled -- dry-run
$env:VOCABULARY_BOOTSTRAP_CONFIRMATION="APPLY_VOCABULARY_BOOTSTRAP_VALUE_PRINTED_BY_PLAN"
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api pnpm data:bootstrap-vocabulary:compiled -- apply --confirm $env:VOCABULARY_BOOTSTRAP_CONFIRMATION
```

State that ordinary deployments stop after migration/start/health-check and do
not run the data command. Update the documented canonical catalog count to
7,429 records.

- [ ] **Step 4: Run focused and full verification**

Run sequentially:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/development-seed-guard.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts scripts/vocabulary/database/bootstrap-vocabulary.test.ts
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
pnpm --filter @repo/api build:data-bootstrap
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts scripts/vocabulary/database/bootstrap-vocabulary.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
git diff --check
git status --short
```

Expected: new API/data gates PASS. If the known pre-existing Web failures still
occur, record their exact unchanged evidence rather than weakening tests.

- [ ] **Step 5: Commit**

```powershell
git add docs/data/vocabulary-pipeline.md docs/guides/ci-cd.md docs/guides/verification.md apps/api/test/api-source-architecture.test.ts
git commit -m "docs: add production vocabulary bootstrap runbook"
```

---

## Execution Stop Before Database Mutation

After code verification, run only the read-only live `plan` command. Present
the sanitized target, source fingerprint, plan fingerprint, confirmation token,
and proposed create/update/reuse counts to the user. Do not run live `dry-run`
or `apply` until the user separately confirms the database operation. Before
`apply`, create and verify a PostgreSQL backup as required by the runbook.
