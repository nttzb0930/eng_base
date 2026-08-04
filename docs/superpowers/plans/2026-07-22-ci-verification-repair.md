# CI Verification Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every GitHub Actions verification job reproducible from a clean checkout and restore the currently failing API and repository checks.

**Architecture:** Keep CI jobs isolated and make each application job build the workspace packages it consumes before verification. Preserve the canonical vocabulary data and update only its architecture-test baseline. Use the existing workflow contract test to prevent dependency-build steps from being removed later.

**Tech Stack:** GitHub Actions YAML, pnpm workspaces, Node.js test runner through `tsx`, TypeScript, Prettier.

## Global Constraints

- Do not run database migrations, seeds, or vocabulary mutation scripts.
- Do not change application UI, runtime APIs, or canonical vocabulary data.
- Do not alter historical 3,000-record normalization and POS-correction workflows.
- Keep the existing CI job order after workspace dependency builds.

---

### Task 1: Enforce workspace dependency builds in consumer jobs

**Files:**

- Modify: `apps/api/test/github-workflows.architecture.test.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: `@repo/shared` and `@repo/ui` package `build` scripts.
- Produces: clean-checkout API, Web, and Admin jobs with their required `dist` exports available.

- [ ] **Step 1: Add failing workflow assertions**

Add job-block extraction inside `CI workflow runs the complete safe verification contract`, then assert that API contains the Shared build and Web/Admin contain both builds:

```ts
const apiJob = source.slice(source.indexOf("  api:"), source.indexOf("  web:"));
const webJob = source.slice(
  source.indexOf("  web:"),
  source.indexOf("  admin:")
);
const adminJob = source.slice(
  source.indexOf("  admin:"),
  source.indexOf("  repository:")
);

assert.match(apiJob, /pnpm --filter @repo\/shared build/u);
for (const job of [webJob, adminJob]) {
  assert.match(job, /pnpm --filter @repo\/shared build/u);
  assert.match(job, /pnpm --filter @repo\/ui build/u);
}
```

- [ ] **Step 2: Run the workflow contract test and verify RED**

Run:

```powershell
pnpm.cmd --filter @repo/api exec tsx --test test/github-workflows.architecture.test.ts
```

Expected: FAIL because the API, Web, and Admin blocks do not contain their required dependency builds.

- [ ] **Step 3: Add minimal dependency builds to CI**

In `.github/workflows/ci.yml`, immediately after `pnpm install --frozen-lockfile`, add:

```yaml
# API
- run: pnpm --filter @repo/shared build

# Web and Admin
- run: pnpm --filter @repo/shared build
- run: pnpm --filter @repo/ui build
```

- [ ] **Step 4: Run the workflow contract test and verify GREEN**

Run:

```powershell
pnpm.cmd --filter @repo/api exec tsx --test test/github-workflows.architecture.test.ts
```

Expected: 4 tests pass, 0 fail.

### Task 2: Update the canonical vocabulary-size invariant

**Files:**

- Modify: `apps/api/test/vocabulary-data-architecture.test.ts`

**Interfaces:**

- Consumes: `data/vocabulary/vocabulary-catalog.json`.
- Produces: an architecture invariant matching the checked-in 7,429-entry catalog.

- [ ] **Step 1: Verify the existing RED regression**

Run:

```powershell
pnpm.cmd --filter @repo/api exec tsx --test test/vocabulary-data-architecture.test.ts
```

Expected: `vocabulary data has one canonical catalog and taxonomy` fails with actual `7429` versus expected `3000`.

- [ ] **Step 2: Apply the minimal invariant update**

Change only:

```ts
assert.equal(catalog.length, 7429);
```

Keep the 103-topic and 2,693 lookup-completion invariants unchanged.

- [ ] **Step 3: Verify GREEN**

Run:

```powershell
pnpm.cmd --filter @repo/api exec tsx --test test/vocabulary-data-architecture.test.ts
```

Expected: all tests in the file pass.

### Task 3: Repair repository formatting gate

**Files:**

- Modify: `docs/superpowers/plans/2026-07-19-topic-localization-runner-observability.md`
- Modify: `docs/superpowers/plans/2026-07-20-dashboard-metrics-simplification.md`
- Modify: `docs/superpowers/plans/2026-07-20-practice-session-layout.md`
- Modify: `docs/superpowers/plans/2026-07-22-system-language-onboarding.md`

**Interfaces:**

- Consumes: repository Prettier configuration.
- Produces: Markdown accepted by the existing repository check.

- [ ] **Step 1: Confirm the formatting gate fails**

Run:

```powershell
pnpm.cmd exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
```

Expected: FAIL and report the four existing plan files.

- [ ] **Step 2: Format only the reported files**

Run:

```powershell
pnpm.cmd exec prettier --write docs/superpowers/plans/2026-07-19-topic-localization-runner-observability.md docs/superpowers/plans/2026-07-20-dashboard-metrics-simplification.md docs/superpowers/plans/2026-07-20-practice-session-layout.md docs/superpowers/plans/2026-07-22-system-language-onboarding.md
```

- [ ] **Step 3: Verify the exact formatting gate**

Run:

```powershell
pnpm.cmd exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
```

Expected: exit 0 with all matched files formatted.

### Task 4: Run CI-equivalent verification

**Files:**

- Verify only.

**Interfaces:**

- Consumes: the repaired workflow, tests, and formatted documentation.
- Produces: fresh evidence for handoff.

- [ ] **Step 1: Build workspace dependencies**

Run:

```powershell
pnpm.cmd --filter @repo/shared build
pnpm.cmd --filter @repo/ui build
```

Expected: both commands exit 0.

- [ ] **Step 2: Run API verification**

Run:

```powershell
pnpm.cmd --filter @repo/api architecture:check
pnpm.cmd --filter @repo/api test
pnpm.cmd --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm.cmd --filter @repo/api check-types
pnpm.cmd --filter @repo/api lint
pnpm.cmd --filter @repo/api build
```

Expected: every command exits 0.

- [ ] **Step 3: Run Web and Admin verification**

Run:

```powershell
pnpm.cmd --filter @repo/web test
pnpm.cmd --filter @repo/web check-types
pnpm.cmd --filter @repo/web lint
pnpm.cmd --filter @repo/web build
pnpm.cmd --filter @repo/admin test
pnpm.cmd --filter @repo/admin check-types
pnpm.cmd --filter @repo/admin lint
pnpm.cmd --filter @repo/admin build
```

Expected: every command exits 0.

- [ ] **Step 4: Run repository checks and inspect the diff**

Run:

```powershell
pnpm.cmd architecture:check
pnpm.cmd exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
git -c safe.directory=C:/Users/nttzb/Downloads/eng_base diff --check
git -c safe.directory=C:/Users/nttzb/Downloads/eng_base status --short
```

Expected: checks exit 0 and status lists only the intended workflow, test, formatting, and plan changes.
