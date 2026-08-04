# TOEIC Import Transaction Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the offline TOEIC Reading and Listening importers to complete one-test transactions over an SSH tunnel without Prisma's five-second default timeout.

**Architecture:** Keep one atomic interactive transaction per TOEIC test. Both Prisma stores pass the same explicit `{ maxWait: 10_000, timeout: 120_000 }` transaction options; store tests lock down this boundary, and temporary diagnostic logging is removed after verification.

**Tech Stack:** TypeScript, Prisma 7 interactive transactions, Node test runner, ESLint.

## Global Constraints

- Preserve atomic replacement of one complete source test.
- Do not change database schema or publication behavior.
- Do not change API request transaction defaults.
- Do not implement bulk insertion in this fix.

---

### Task 1: Reading importer transaction budget

**Files:**
- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.test.ts`
- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.ts`

**Interfaces:**
- Consumes: `PrismaClient.$transaction(callback, options)`.
- Produces: Reading imports using `{ maxWait: 10_000, timeout: 120_000 }`.

- [ ] **Step 1: Write the failing test**

Capture the second `$transaction` argument in the existing replacement test and assert:

```ts
assert.deepEqual(transactionOptions, {
  maxWait: 10_000,
  timeout: 120_000,
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @repo/api exec tsx --test scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.test.ts
```

Expected: FAIL because the store does not pass transaction options.

- [ ] **Step 3: Write minimal implementation**

Pass the options as the second argument:

```ts
await prisma.$transaction(async (transaction) => {
  // existing atomic replacement
}, { maxWait: 10_000, timeout: 120_000 });
```

- [ ] **Step 4: Run test to verify it passes**

Run the command from Step 2. Expected: PASS.

### Task 2: Listening importer transaction budget

**Files:**
- Create: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.prisma-store.test.ts`
- Modify: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.prisma-store.ts`

**Interfaces:**
- Consumes: `createPrismaToeicListeningImportStore(prisma, now)`.
- Produces: Listening imports using `{ maxWait: 10_000, timeout: 120_000 }`.

- [ ] **Step 1: Write the failing test**

Create a minimal published Reading-test fixture, capture `$transaction` options, execute `importOne`, and assert the explicit options:

```ts
assert.deepEqual(transactionOptions, {
  maxWait: 10_000,
  timeout: 120_000,
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @repo/api exec tsx --test scripts/toeic-listening-practice/toeic-listening-practice.prisma-store.test.ts
```

Expected: FAIL because transaction options are undefined.

- [ ] **Step 3: Write minimal implementation**

Pass the same options as Reading to the Listening `$transaction` call.

- [ ] **Step 4: Run test to verify it passes**

Run the command from Step 2. Expected: PASS.

### Task 3: Cleanup and verification

**Files:**
- Modify: `apps/api/scripts/toeic-reading-practice/toeic-reading-practice.import.ts`
- Modify: `apps/api/scripts/toeic-listening-practice/toeic-listening-practice.import.ts`

**Interfaces:**
- Removes: `[DEBUG-toeic-reading-import]` and `[DEBUG-toeic-listening-import]` diagnostics.

- [ ] **Step 1: Remove temporary diagnostics**

Delete only the two tagged `console.error` blocks; preserve summary behavior.

- [ ] **Step 2: Run focused tests**

```bash
pnpm --filter @repo/api exec tsx --test scripts/toeic-reading-practice/toeic-reading-practice.prisma-store.test.ts scripts/toeic-listening-practice/toeic-listening-practice.prisma-store.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run static verification**

```bash
pnpm --filter @repo/api exec eslint scripts/toeic-reading-practice scripts/toeic-listening-practice --max-warnings=0
pnpm --filter @repo/api check-types
git diff --check
```

Expected: all commands exit zero and no tagged debug output remains.

- [ ] **Step 4: Re-run the production import through the SSH tunnel**

```bash
pnpm --filter @repo/api exec tsx ./scripts/toeic-reading-practice/import-toeic-reading-practice.ts
```

Expected: all ten source tests appear in `created` or `updated`, with empty `failed`.
