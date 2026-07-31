# TOEIC Grammar Content Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, checksum-approved inventory, download, offline validation, and atomic import pipeline for accessible TOEIC Grammar topics, subtopics, mixed sets, and difficulty levels 1–5.

**Architecture:** Add a source-specific offline pipeline under `apps/api/scripts/toeic-grammar` and normalized Grammar persistence owned by API. Remote acquisition uses allowlisted HTTPS and private credential files; PostgreSQL is touched only by the import command.

**Tech Stack:** TypeScript, Node.js fetch/filesystem APIs, Zod, Prisma 7, PostgreSQL, `tsx --test`, pnpm.

## Global Constraints

- Store downloaded content only under ignored `var/licensed-content/dautoeic`.
- Read credentials only from `source-authorization.txt` and `source-user-access-token.txt`; never accept or print a user token on the CLI.
- Never call source AI, infer hidden records, or bypass source access checks.
- Grammar is separate from `toeic_questions`.
- Inventory, download, and validation remain database-free.
- Import requires an exact approved SHA-256 and replaces source-owned content in one transaction.
- Preserve all unrelated dirty-worktree changes.

## File map

- `apps/api/scripts/toeic-grammar/toeic-grammar.types.ts`: pipeline contracts.
- `apps/api/scripts/toeic-grammar/toeic-grammar.canonical.ts`: canonical schemas, normalization, hashing, validation.
- `apps/api/scripts/toeic-grammar/dautoeic-grammar-source.ts`: Supabase REST/RPC adapter.
- `apps/api/scripts/toeic-grammar/toeic-grammar.storage.ts`: private atomic storage.
- `apps/api/scripts/toeic-grammar/toeic-grammar.inventory.ts`: deterministic inventory.
- `apps/api/scripts/toeic-grammar/toeic-grammar.download.ts`: resumable acquisition and deduplication.
- `apps/api/scripts/toeic-grammar/toeic-grammar.validation.ts`: offline package validation.
- `apps/api/scripts/toeic-grammar/toeic-grammar.import.ts`: approved-snapshot boundary.
- `apps/api/scripts/toeic-grammar/toeic-grammar.prisma-store.ts`: atomic Prisma replacement.
- `apps/api/scripts/toeic-grammar/toeic-grammar.cli.ts` and four entrypoints: operator commands.
- `apps/api/prisma/schema.prisma` plus migration: Grammar persistence.
- `apps/api/package.json`, `CONTEXT.md`, `docs/architecture/api.md`, and a new operating guide.

---

### Task 1: Canonical contract and fail-closed validation

**Files:**
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.types.ts`
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.canonical.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar.canonical.test.ts`

**Interfaces:**
- Produces `normalizeGrammarSnapshot(value: unknown): ToeicGrammarSnapshot`.
- Produces `validateGrammarSnapshot(value: unknown): GrammarValidationResult`.
- Produces `grammarContentSha256(value: GrammarSnapshotContent): string`.

- [ ] **Step 1: Write the first failing test**

Use one question present in a subtopic, mixed set, and difficulty level. Assert one canonical question remains and every membership points to its `sourceQuestionId`.

```ts
test("deduplicates a question shared across grammar views", () => {
  const snapshot = normalizeGrammarSnapshot(validFixture());
  assert.equal(snapshot.questions.length, 1);
  assert.deepEqual(snapshot.sets[0]?.questionIds, ["q-1"]);
  assert.deepEqual(snapshot.difficultyLevels[0]?.questionIds, ["q-1"]);
});
```

- [ ] **Step 2: Verify RED**

Run `pnpm --filter @repo/api exec tsx --test scripts/toeic-grammar/toeic-grammar.canonical.test.ts`.
Expected: FAIL because the canonical module is missing.

- [ ] **Step 3: Implement minimal types and normalization**

Define topic, subtopic, question, A–D option, mixed set, difficulty membership, inventory, manifest, and validation report types. Sort all arrays deterministically and reject conflicting duplicate question bodies or answer keys.

- [ ] **Step 4: Add failing invariant tests**

Add individual tests for fewer than four options, duplicate labels, zero/two correct answers, unknown topic/subtopic references, unknown membership question IDs, and levels outside 1–5.

- [ ] **Step 5: Implement Zod parsing, referential validation, and stable SHA-256**

Hash canonical content with `contentSha256` omitted. Preserve optional translations, explanations, vocabulary JSON, and `preferAiExplanation`; never synthesize absent enrichment.

- [ ] **Step 6: Verify GREEN and commit**

Run the focused test again; expect PASS. Commit only the three Task 1 files with `feat(api): define TOEIC grammar snapshot contract`.

---

### Task 2: Allowlisted source adapter

**Files:**
- Create: `apps/api/scripts/toeic-grammar/dautoeic-grammar-source.ts`
- Test: `apps/api/scripts/toeic-grammar/dautoeic-grammar-source.test.ts`

**Interfaces:**
- Produces `createDautoeicGrammarSource(config): ToeicGrammarSource`.
- `ToeicGrammarSource` exposes `readCatalog`, `readSets`, `readTopicQuestions`, `readSetQuestions`, and `readDifficultyQuestions`.

- [ ] **Step 1: Write failing authorization tests**

With injected fetch, assert catalog requests use the public key as `apikey` and anonymous bearer, while protected set/detail/level requests use the public key as `apikey` and user token as bearer. Assert raw `Bearer ` prefixes normalize once.

- [ ] **Step 2: Verify RED**

Run the source test; expect missing source factory failure.

- [ ] **Step 3: Implement request safety**

Allow only configured HTTPS hosts, validate redirect URLs, apply finite timeouts, retry network/429/5xx failures, and return categorized authorization/HTTP errors without response bodies or credentials.

- [ ] **Step 4: Add failing response parsing tests**

Cover `grammar_topics`, `grammar_subtopics`, `get_grammar_bank_sets`, topic `questions`, `get_grammar_bank_questions`, and `get_grammar_bank_difficulty_level`. Reject non-array responses, missing IDs, and malformed answer fields.

- [ ] **Step 5: Implement exact source mapping**

Map question IDs/text, options A–D, correct answer, explanations, `dich_nghia`, `dich_nghia_dap_an`, `tu_vung`, and AI-preference flags. Preserve set access metadata and only return records supplied by the source.

- [ ] **Step 6: Verify GREEN and commit**

Run the source test; expect PASS. Commit Task 2 files with `feat(api): read authorized TOEIC grammar source`.

---

### Task 3: Deterministic inventory and private storage

**Files:**
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.storage.ts`
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.inventory.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar.storage.test.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar.inventory.test.ts`

**Interfaces:**
- Produces `createFileToeicGrammarStorage({ repositoryRoot, configuredRoot? })`.
- Produces `inventoryToeicGrammar({ source, storage }): Promise<ToeicGrammarInventoryResult>`.

- [ ] **Step 1: Write failing path-safety tests**

Reject repository root, parent, drive root, user home, and non-private repository directories. Accept the default `var/licensed-content/dautoeic` root and require atomic `.partial` rename writes.

- [ ] **Step 2: Verify RED, then implement safe storage**

Provide `writeInventory`, `readInventory`, checkpoint methods, snapshot file methods, and `listCompleteSnapshots`. Validate every SHA and path segment.

- [ ] **Step 3: Write failing deterministic inventory tests**

Supply equivalent catalog/set/level results in different orders and assert identical SHA-256. Assert a failed authenticated level request aborts rather than recording zero.

- [ ] **Step 4: Implement inventory orchestration**

Read visible topics/subtopics, accessible sets, and levels 1–5. Normalize before hashing and persist counts plus IDs in `inventories/toeic-grammar/<sha>.json`.

- [ ] **Step 5: Verify GREEN and commit**

Run both Task 3 tests; expect PASS. Commit Task 3 files with `feat(api): inventory TOEIC grammar content`.

---

### Task 4: Resumable download and offline validation

**Files:**
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.download.ts`
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.validation.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar.download.test.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar.validation.test.ts`

**Interfaces:**
- Produces `downloadToeicGrammar({ approvedSha256, source, storage, workers }): Promise<DownloadSummary>`.
- Produces `validateStoredToeicGrammar({ storage }): Promise<ValidationSummary>`.

- [ ] **Step 1: Write a failing deduplication test**

Return the same question from topic, set, and level calls; assert one canonical record and three correct memberships.

- [ ] **Step 2: Verify RED, then implement download**

Require an exact 64-character approved SHA, verify inventory identity, use a worker queue capped at 8, checkpoint each completed unit, and write `content.json`, `validation.json`, then completion-marker `manifest.json` atomically.

- [ ] **Step 3: Write failing offline validation tests**

Assert no source calls occur, and reject content-checksum or manifest/inventory identity mismatch.

- [ ] **Step 4: Implement validation reports**

Call the Task 1 validator, verify checksums, and atomically write `{ schemaVersion: 1, valid, errors, validatedAt }` without rewriting content.

- [ ] **Step 5: Verify GREEN and commit**

Run both Task 4 tests; expect PASS. Commit Task 4 files with `feat(api): download and validate TOEIC grammar snapshots`.

---

### Task 5: Prisma persistence and atomic import

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801070000_add_toeic_grammar_content/migration.sql`
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.import.ts`
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.prisma-store.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar.import.test.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar.prisma-store.test.ts`

**Interfaces:**
- Produces `importToeicGrammar({ approvedSha256, storage, store }): Promise<"UPDATED" | "SKIPPED">`.
- Produces `createPrismaToeicGrammarImportStore(prisma): ToeicGrammarImportStore`.

- [ ] **Step 1: Write failing import-boundary tests**

Reject mismatched approved SHA, absent/invalid validation, and inconsistent manifest identity before calling the store. Assert the active SHA returns `SKIPPED`.

- [ ] **Step 2: Verify RED**

Run import tests; expect missing importer failure.

- [ ] **Step 3: Add normalized schema and migration**

Create snapshot, topic, subtopic, question, option, set, set-membership, and difficulty-membership tables. Add unique source IDs, membership keys, ordering indexes, and Grammar-owned cascades only.

- [ ] **Step 4: Write failing transaction tests**

Using the existing transaction-fake style, assert source-owned rows replace inside one transaction, the snapshot activates after all inserts, and insertion failure never activates partial content.

- [ ] **Step 5: Implement atomic idempotent replacement**

Return `SKIPPED` before transaction for the active checksum. Otherwise insert normalized parents before memberships, replace only `source = "dautoeic"`, and activate the new snapshot last.

- [ ] **Step 6: Generate Prisma, verify GREEN, and commit**

Run `pnpm --filter @repo/api exec prisma generate`, then both Task 5 tests. Expect PASS. Do not apply migrations. Commit with `feat(api): persist TOEIC grammar snapshots`.

---

### Task 6: Secure commands, documentation, and verification

**Files:**
- Create: `apps/api/scripts/toeic-grammar/toeic-grammar.cli.ts`
- Create: `apps/api/scripts/toeic-grammar/inventory-toeic-grammar.ts`
- Create: `apps/api/scripts/toeic-grammar/download-toeic-grammar.ts`
- Create: `apps/api/scripts/toeic-grammar/validate-toeic-grammar.ts`
- Create: `apps/api/scripts/toeic-grammar/import-toeic-grammar.ts`
- Test: `apps/api/scripts/toeic-grammar/toeic-grammar-command-boundary.test.ts`
- Modify: `apps/api/package.json`
- Modify: `CONTEXT.md`
- Modify: `docs/architecture/api.md`
- Create: `docs/guides/licensed-toeic-grammar-operations.md`

**Interfaces:**
- Produces four `data:*toeic-grammar` pnpm commands with bounded JSON output.

- [ ] **Step 1: Write failing command-boundary tests**

Reject `--authorization` and `--access-token`; read credentials only from private files. Prove inventory/download/validate do not import Prisma while import does. Assert output excludes credentials and answer bodies.

- [ ] **Step 2: Verify RED, then implement entrypoints**

Add `data:inventory-toeic-grammar`, `data:download-toeic-grammar`, `data:validate-toeic-grammar`, and `data:import-toeic-grammar`. Require `--approved-sha` for download/import, default workers to 4, cap at 8, and print only safe summaries.

- [ ] **Step 3: Update canonical documentation**

Document credential files, commands, private paths, checksum review, token expiry, migration/import steps, and that API accessibility is not a redistribution license. Add Grammar ownership language to `CONTEXT.md` and link the operating guide from API architecture.

- [ ] **Step 4: Run focused verification**

Run `pnpm --filter @repo/api exec tsx --test "scripts/toeic-grammar/*.test.ts"`; expect all Grammar tests PASS.

- [ ] **Step 5: Run repository gates**

Run `pnpm architecture:check`, `pnpm test`, `pnpm check-types`, `pnpm lint`, and `pnpm build`. Record any unrelated pre-existing dirty-worktree failure without editing unrelated files.

- [ ] **Step 6: Commit**

Commit Task 6 files with `feat(api): operate TOEIC grammar content pipeline`.

## Operator handoff

After implementation review, the operator explicitly runs:

```powershell
pnpm --filter @repo/api data:inventory-toeic-grammar
pnpm --filter @repo/api data:download-toeic-grammar -- --approved-sha=<inventorySha256>
pnpm --filter @repo/api data:validate-toeic-grammar
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-toeic-grammar -- --approved-sha=<inventorySha256>
```

The final two commands remain explicit because they change database state.
