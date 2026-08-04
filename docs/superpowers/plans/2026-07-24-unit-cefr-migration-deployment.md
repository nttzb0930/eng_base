# Unit CEFR Migration Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the committed Unit CEFR migration to one approved target environment with preflight evidence, postflight verification, and a documented rollback decision.

**Architecture:** Reuse the existing manual GitHub Deploy workflow, which runs `prisma migrate deploy` before starting application containers. Add a repository runbook and workflow-contract checks; the actual environment mutation remains a human-approved operational checkpoint.

**Tech Stack:** GitHub Actions, Docker Compose, Prisma Migrate, PostgreSQL, NestJS health endpoint.

## Global Constraints

- Never use `prisma migrate dev`, `prisma migrate reset`, `db:push`, or ad hoc update SQL against the target.
- Confirm a recoverable PostgreSQL backup or provider snapshot before production execution.
- Use an image tag that contains migration `20260722180000_add_unit_cefr_level`.
- Execute staging before production.
- Do not expose database URLs or deployment secrets in logs or documentation.

---

### Task 1: Add the Deployment Runbook

**Files:**

- Create: `docs/guides/unit-cefr-migration-deployment.md`
- Modify: `docs/guides/ci-cd.md`
- Test: `apps/api/test/github-workflows.architecture.test.ts`

**Interfaces:**

- Consumes: `.github/workflows/deploy.yml` and migration `20260722180000_add_unit_cefr_level`.
- Produces: one operator checklist with exact preflight, execution, postflight, and rollback-decision commands.

- [ ] **Step 1: Write the failing documentation contract**

Add a test that loads `docs/guides/unit-cefr-migration-deployment.md` and asserts these literal safety markers:

```ts
assert.match(runbook, /20260722180000_add_unit_cefr_level/);
assert.match(runbook, /prisma migrate status/);
assert.match(runbook, /prisma migrate deploy/);
assert.match(runbook, /units_cefr_level_check/);
assert.match(runbook, /Rollback decision/);
assert.doesNotMatch(runbook, /db:push|migrate reset/);
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test test/github-workflows.architecture.test.ts
```

Expected: FAIL because the runbook does not exist.

- [ ] **Step 3: Write the runbook**

The runbook must require the operator to record:

```text
Environment:
Image tag:
Current deployed image tag:
Backup/snapshot identifier:
Operator:
Started at:
Completed at:
Migration result:
Health-check result:
Rollback decision:
```

Preflight commands run inside the target API image:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api npx prisma migrate status
docker compose -f docker-compose.prod.yml --env-file .env.production config --images
```

Execution remains the existing workflow action:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api npx prisma migrate deploy
```

Postflight verification must include:

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name = '20260722180000_add_unit_cefr_level';

SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'units'
  AND constraint_name = 'units_cefr_level_check';

SELECT course_id, cefr_level, COUNT(*)
FROM units
GROUP BY course_id, cefr_level
ORDER BY course_id, cefr_level;
```

The rollback section must state that an already-applied forward migration is
not undone by switching images. If postflight data is invalid, stop application
rollout and choose between restoring the approved snapshot or shipping a new
reviewed corrective migration.

- [ ] **Step 4: Link the runbook**

Add a `Unit CEFR migration` link under deployment operations in
`docs/guides/ci-cd.md`.

- [ ] **Step 5: Confirm GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test test/github-workflows.architecture.test.ts
git diff --check
```

Expected: PASS and no whitespace errors.

Commit:

```powershell
git add docs/guides/unit-cefr-migration-deployment.md docs/guides/ci-cd.md apps/api/test/github-workflows.architecture.test.ts
git commit -m "docs: add Unit CEFR migration runbook"
```

### Task 2: Execute the Staging Deployment

**Files:**

- No repository files change during this task.

**Interfaces:**

- Consumes: approved staging environment and a published image tag.
- Produces: completed runbook evidence and a healthy staging deployment.

- [ ] **Step 1: Human approval checkpoint**

Record the staging environment, published image tag, backup identifier, and
operator. Stop if any field is missing.

- [ ] **Step 2: Run preflight**

Execute the runbook preflight commands and verify that migration status either
lists the Unit CEFR migration as pending or already applied without failure.

- [ ] **Step 3: Trigger GitHub Deploy**

Choose the `staging` environment and paste the exact published commit SHA
already recorded in the runbook's `Image tag` field.

Expected: image pull succeeds, `prisma migrate deploy` exits zero, containers
start, and health-check job succeeds.

- [ ] **Step 4: Run postflight**

Run all three read-only SQL queries and smoke-test:

```http
GET /health
GET /progress/cefr-levels
```

Expected: health is successful; authenticated CEFR response contains A1-B2 and
no database column/constraint error.

### Task 3: Promote to Production

**Files:**

- No repository files change during this task.

**Interfaces:**

- Consumes: successful staging evidence and production authorization.
- Produces: production migration evidence or an explicit deferred decision.

- [ ] **Step 1: Review staging evidence**

Production approval requires completed staging preflight/postflight fields and
no corrective SQL.

- [ ] **Step 2: Repeat the runbook for production**

Use the same published image tag unless a separately verified fix supersedes
it. Record the production snapshot identifier before triggering the workflow.

- [ ] **Step 3: Close the operational task**

Record one result:

```text
APPLIED_AND_HEALTHY
ALREADY_APPLIED_AND_HEALTHY
DEFERRED_BEFORE_MUTATION
FAILED_RESTORED_FROM_APPROVED_SNAPSHOT
FAILED_CORRECTIVE_MIGRATION_REQUIRED
```
