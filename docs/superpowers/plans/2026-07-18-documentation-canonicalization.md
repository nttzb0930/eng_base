# Documentation Canonicalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed English Base documentation tree with a small, self-contained canonical set, remove unexplained Ecommerce Base references, and align every active document and ADR with the current source tree.

**Architecture:** Knowledge is split by responsibility: root entrypoints introduce and govern work, `CONTEXT.md` owns domain language, architecture documents own current structure, guides own commands, the data document owns the vocabulary pipeline, and ADRs own decision rationale. Completed plans, specs, handoffs, and prototypes are deleted after their accepted content is absorbed; Git history remains the archive.

**Tech Stack:** Markdown, pnpm/Turborepo, TypeScript architecture tests, PowerShell/Git verification, Prettier.

## Global Constraints

- Root `README.md` is Vietnamese; `AGENTS.md`, `CONTEXT.md`, and all `docs/**` files are English.
- Preserve exact source identifiers, paths, commands, HTTP fields, and environment variable names.
- Active docs and architecture tests must not use `EC`, `ecommerce`, or `e-commerce` as architecture vocabulary.
- Each normative rule has one canonical owner; other documents link instead of repeating it.
- Do not change application behavior, HTTP routes, database schema, migrations, seed data, or vocabulary JSON.
- Do not run database-writing, reset, seed, synchronization, enrichment, or AI-provider commands.
- Do not move completed material into an in-tree archive.
- Work sequentially on `main`; run the task-specific gate before each commit.

---

## File Structure and Responsibilities

**Final active entrypoints**

- `README.md`: Vietnamese introduction and safe quick start.
- `AGENTS.md`: mandatory workflow and guardrails.
- `CONTEXT.md`: stable domain language, invariants, and compatibility constraints.
- `docs/README.md`: English documentation map and precedence.

**Final canonical detail**

- `docs/architecture/codebase-structure.md`: workspace ownership and dependency rules.
- `docs/architecture/frontend.md`: Web/Admin feature-view and browser data flow.
- `docs/architecture/api.md`: Nest, Auth, errors, rate limits, Prisma, and transactions.
- `docs/architecture/course-content.md`: worked Course content capability example.
- `docs/guides/local-development.md`: environment, PostgreSQL, Prisma, migration, and startup procedure.
- `docs/guides/verification.md`: narrow and full verification gates.
- `docs/data/vocabulary-pipeline.md`: all vocabulary workflow stages and safety rules.
- `docs/adr/README.md`: ADR status and relationship index.
- `docs/adr/0001...0021`: self-contained decision records.

**Removed after consolidation**

- `docs/overview.md`
- `docs/backend-folder-structure.md`
- `docs/frontend-folder-structure.md`
- `docs/frontend-api-calls.md`
- `docs/frontend-route-template.md`
- `docs/frontend-shared-hooks.md`
- `docs/data/vocabulary-phase1.md`
- `docs/index.html`, `docs/end.html`, `docs/new/**`
- `docs/superpowers/plans/**`, `docs/superpowers/specs/**`

---

### Task 1: Make Architecture-Test Names Self-Contained

**Files:**

- Rename: `apps/web/test/ec-feature-architecture.test.ts` -> `apps/web/test/frontend-feature-architecture.test.ts`
- Modify: `apps/web/package.json`
- Rename: `packages/shared/test/ec-shared-root.test.ts` -> `packages/shared/test/shared-root-interface.test.ts`
- Rename: `packages/shared/test/ec-shared-profile.architecture.test.ts` -> `packages/shared/test/shared-package-profile.architecture.test.ts`
- Modify: `packages/shared/package.json`
- Modify: `apps/api/test/api-source-architecture.test.ts`
- Modify: `apps/api/test/domain-ownership-architecture.test.ts`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Modify: `apps/admin/test/course-feature-architecture.test.ts`
- Modify: renamed Web and Shared test files above

**Interfaces:**

- Consumes: existing architecture assertions and package scripts.
- Produces: neutral test filenames/descriptions with unchanged assertions and commands that later docs can reference.

- [ ] **Step 1: Capture the existing test surface**

Run:

```powershell
rg -n -i "\bEC\b|ecommerce|e-commerce" apps packages -g "*.ts" -g "*.tsx" -g "package.json"
```

Expected: the three old filenames/package script and the known test descriptions are listed; no application implementation relies on an `EC` symbol.

- [ ] **Step 2: Rename the three test files with Git history preserved**

Run:

```powershell
git mv apps/web/test/ec-feature-architecture.test.ts apps/web/test/frontend-feature-architecture.test.ts
git mv packages/shared/test/ec-shared-root.test.ts packages/shared/test/shared-root-interface.test.ts
git mv packages/shared/test/ec-shared-profile.architecture.test.ts packages/shared/test/shared-package-profile.architecture.test.ts
```

Expected: `git status --short` reports three renames.

- [ ] **Step 3: Update the package script and test descriptions**

Use these exact neutral phrases:

```text
API infrastructure follows the capability-owned source profile
Course producers use the Shared root Interface
Web Auth follows the frontend feature/view profile
Admin Auth follows the frontend feature/view profile
Admin Users follows the frontend feature/view profile
Admin Settings follows the frontend feature/view profile
course routes follow the Admin feature/view profile
application source imports only the Shared root Interface
Shared exposes the TypeScript-only root Interface
```

Change `packages/shared/package.json` to:

```json
"architecture:check": "tsx --test test/shared-package-profile.architecture.test.ts"
```

Add the missing Web architecture command to `apps/web/package.json`:

```json
"architecture:check": "tsx --test \"test/*architecture.test.ts\""
```

Do not alter assertion bodies or architecture constraints.

- [ ] **Step 4: Verify neutral naming and behavior**

Run:

```powershell
rg -n -i "\bEC\b|ecommerce|e-commerce" apps packages -g "*.ts" -g "*.tsx" -g "package.json"
pnpm --filter @repo/shared test
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/admin architecture:check
pnpm --filter @repo/api architecture:check
```

Expected: `rg` returns no matches; all four package gates pass.

- [ ] **Step 5: Commit the neutral architecture-test names**

```powershell
git add apps/web/test apps/web/package.json packages/shared/test packages/shared/package.json apps/api/test apps/admin/test
git commit -m "test: remove reference-project naming"
```

---

### Task 2: Rewrite Root Entrypoints and Add the Documentation Map

**Files:**

- Rewrite: `README.md`
- Rewrite: `AGENTS.md`
- Rewrite: `CONTEXT.md`
- Create: `docs/README.md`
- Delete: `docs/overview.md`

**Interfaces:**

- Consumes: root package scripts, `.env.example`, `docker-compose.yml`, current runtime/package layout, and accepted compatibility constraints.
- Produces: the only four entrypoints a new coder or agent needs before following a detailed link.

- [ ] **Step 1: Rewrite the Vietnamese root README**

Use these sections in this order:

```markdown
# English Base

## Mục tiêu dự án

## Cấu trúc monorepo

## Yêu cầu môi trường

## Khởi động nhanh

## Các lệnh thường dùng

## Quy tắc an toàn dữ liệu

## Tài liệu kiến trúc
```

The quick start must use this safe flow:

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d db
pnpm db:generate
pnpm --filter @repo/api db:migrate:deploy
pnpm dev
```

List all runtime/package owners, including `packages/ui`. Explain that
`packages/shared` contains TypeScript wire types and framework-neutral constants,
not runtime response validation. Put `db:seed`, `db:push`, `db:migrate:reset`,
normalization/POS sync, enrichment, and AI commands in an explicit destructive or
data-changing warning block. Link to `docs/README.md` for details.

- [ ] **Step 2: Reduce `AGENTS.md` to workflow guardrails**

Retain concise sections for:

```markdown
# Agent Workflow

## Required reading

## Runtime and capability ownership

## Public Interface rules

## Change and documentation rules

## Verification

## Data safety
```

Link ownership detail to `docs/architecture/codebase-structure.md`, frontend
placement to `docs/architecture/frontend.md`, API placement to
`docs/architecture/api.md`, commands to `docs/guides/verification.md`, and data
safety to `docs/data/vocabulary-pipeline.md`. State that a change to a public
Interface, compatibility behavior, ownership rule, operating command, or data
workflow must update its canonical document in the same commit.

- [ ] **Step 3: Rewrite `CONTEXT.md` around stable domain language**

Keep these defined terms:

```text
Learner
Course content
Course Management
Lesson challenge
Vocabulary item
Canonical vocabulary catalog
Topic taxonomy
Vocabulary classification
Topic expansion proposal
Human vocabulary review
Saved word
Vocabulary progress
Review session
Practice session
Learning session
Placement test
Authentication session
Wire type
Persistence model
ViewModel
Runtime owner
```

State that the canonical catalog is repository source data and does not prove a
particular database has been seeded. Retain current HTTP compatibility rules.
Remove `Web Base Standard 1.5.0`, legacy migration language, and the pending
`challenge_progress` migration note.

- [ ] **Step 4: Create `docs/README.md` and delete the old overview**

Use these sections:

```markdown
# English Base Documentation

## Start here

## Canonical ownership

## Architecture

## Development guides

## Data workflows

## Architecture decision records

## Historical material
```

State the precedence order `CONTEXT -> newer accepted ADR -> architecture/data
document -> guide -> AGENTS/README summary`, and explain that completed plans and
prototypes are recovered from Git rather than kept in the active tree.

Delete `docs/overview.md` only after all its current links are represented in
`docs/README.md`.

- [ ] **Step 5: Verify entrypoint accuracy and formatting**

Run:

```powershell
rg -n "db:push|db:migrate:reset|db:seed|data:sync" README.md
rg -n "docs/architecture/frontend.md|docs/architecture/api.md|docs/guides/verification.md|docs/data/vocabulary-pipeline.md" AGENTS.md
rg -n "pending|prepared unique migration|Web Base Standard|\bEC\b|ecommerce" README.md AGENTS.md CONTEXT.md docs/README.md
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md docs/README.md
git diff --check
```

Expected: risky commands appear only with warnings; all canonical links appear;
the stale-term search returns no matches; formatting and diff checks pass.

- [ ] **Step 6: Commit the entrypoints**

```powershell
git add README.md AGENTS.md CONTEXT.md docs/README.md docs/overview.md
git commit -m "docs: establish canonical project entrypoints"
```

---

### Task 3: Consolidate Frontend Architecture

**Files:**

- Modify: `docs/architecture/codebase-structure.md`
- Create: `docs/architecture/frontend.md`
- Delete: `docs/frontend-folder-structure.md`
- Delete: `docs/frontend-api-calls.md`
- Delete: `docs/frontend-route-template.md`
- Delete: `docs/frontend-shared-hooks.md`

**Interfaces:**

- Consumes: current Web/Admin `app/` trees, Shared/UI package exports, and neutral architecture-test names from Task 1.
- Produces: one workspace architecture owner plus one complete frontend architecture owner.

- [ ] **Step 1: Rewrite `codebase-structure.md` as workspace-level policy**

Use these sections:

```markdown
# Codebase Structure

## Runtime and package ownership

## Capability ownership

## Public Interfaces

## Type and presentation ownership

## Dependency direction

## Naming rules

## Forbidden technical buckets

## Enforcement
```

Document `apps/web`, `apps/admin`, `apps/api`, `packages/shared`, `packages/ui`,
and tooling packages. Keep the singular API `src/module` path as the current
profile. Link to frontend/API detail rather than duplicating their full trees.
Remove every reference to an external profile or numbered Web Base standard.

- [ ] **Step 2: Create the complete frontend architecture document**

Use these sections:

```markdown
# Frontend Architecture

## Runtime ownership

## Feature and view profile

## Learner Web layout

## Admin layout

## Browser data flow

## Authentication transport

## Resource APIs and query keys

## Localized navigation

## Learning session ownership

## Shared types, ViewModels, and UI primitives

## Route template

## Placement and naming rules

## Verification
```

The document must show the actual `app/`-only layout; it must not include
`apps/web/src` or `apps/admin/src`. Preserve the flow:

```text
route -> app/views -> app/features hook -> resource .api.ts -> Auth-owned HTTP client
```

Explain that Web uses localized routes, authenticated domain data is fetched in
the browser, `next/headers` remains framework-only, query keys belong to resource
API modules, hooks own orchestration/invalidation, `learning-session` owns shared
presentation lifecycle but not scoring/persistence, and `packages/ui` owns only
exact reusable React primitives.

- [ ] **Step 3: Delete the four superseded frontend root documents**

Run:

```powershell
git rm docs/frontend-folder-structure.md docs/frontend-api-calls.md docs/frontend-route-template.md docs/frontend-shared-hooks.md
```

Expected: every still-valid rule has a corresponding section in
`docs/architecture/frontend.md`.

- [ ] **Step 4: Verify no stale frontend profile survives**

Run:

```powershell
rg -n "apps/(web|admin)/src|src/features|src/services|EC profile|ecommerce" docs/architecture README.md AGENTS.md CONTEXT.md docs/README.md
rg -n "frontend-folder-structure|frontend-api-calls|frontend-route-template|frontend-shared-hooks" README.md AGENTS.md CONTEXT.md docs
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/admin architecture:check
pnpm exec prettier --check docs/architecture/codebase-structure.md docs/architecture/frontend.md
git diff --check
```

Expected: no stale paths/references; Web/Admin architecture checks and formatting pass.

- [ ] **Step 5: Commit frontend documentation consolidation**

```powershell
git add docs/architecture docs/frontend-folder-structure.md docs/frontend-api-calls.md docs/frontend-route-template.md docs/frontend-shared-hooks.md
git commit -m "docs: consolidate frontend architecture"
```

---

### Task 4: Consolidate API and Course Content Architecture

**Files:**

- Create: `docs/architecture/api.md`
- Modify: `docs/architecture/course-content.md`
- Delete: `docs/backend-folder-structure.md`

**Interfaces:**

- Consumes: current API source tree, ADR decisions, Auth/error/rate-limit tests, Prisma configuration, and neutral Shared test names.
- Produces: current API architecture and a corrected worked capability example.

- [ ] **Step 1: Create `api.md` from implementation evidence**

Use these sections:

```markdown
# API Architecture

## Source ownership

## Capability Modules and public Interfaces

## Goal use cases

## Delivery, DTOs, mappers, and persistence

## Authentication sessions

## Logging and stable error responses

## Endpoint rate limiting and proxy trust

## Prisma and offline scripts

## Transactions, idempotency, and concurrency

## Runtime configuration

## Naming and folder rules

## Verification and safety
```

Record the actual roots `common`, `config`, `database/prisma`, and
`module/<capability>`. Explain controller delegation, Auth token/password roles,
request identity, centralized error logging/redaction, `429` plus `Retry-After`,
process-local storage for one replica, required shared storage for multiple
replicas, `TRUST_PROXY_HOPS`, `@prisma/client`, script Prisma ownership,
serializable transactions, advisory locks, and idempotent challenge completion.

- [ ] **Step 2: Rewrite `course-content.md` against current paths**

Retain:

```text
Course -> Unit -> Lesson -> Lesson challenge -> Challenge option
25 explicit management goals
page present -> pagination envelope
page absent -> raw array + Content-Range
PUT updates
/admin/challengeOptions
search and q compatibility
resource-specific query roots
```

Update Shared imports to root `@repo/shared`, reference neutral test filenames,
and remove the numbered Web Base golden-slice label. Describe it as the worked
capability example, not a template whose domain files are copied.

- [ ] **Step 3: Delete the superseded backend guide and verify API accuracy**

Run:

```powershell
git rm docs/backend-folder-structure.md
rg -n "backend-folder-structure|EC profile|ecommerce|@repo/shared/courses|course\.contract" README.md AGENTS.md CONTEXT.md docs
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/shared architecture:check
pnpm exec prettier --check docs/architecture/api.md docs/architecture/course-content.md
git diff --check
```

Expected: no stale references; API/Shared architecture checks and formatting pass.

- [ ] **Step 4: Commit API documentation consolidation**

```powershell
git add docs/architecture/api.md docs/architecture/course-content.md docs/backend-folder-structure.md
git commit -m "docs: consolidate API architecture"
```

---

### Task 5: Add Local Development and Verification Guides

**Files:**

- Create: `docs/guides/local-development.md`
- Create: `docs/guides/verification.md`
- Modify: `docs/README.md`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: root/API package scripts, `.env.example`, `docker-compose.yml`, and current Turbo gates.
- Produces: one command owner for setup/database operation and one command owner for verification.

- [ ] **Step 1: Write `local-development.md`**

Use these sections:

```markdown
# Local Development

## Prerequisites

## Environment configuration

## Start PostgreSQL

## Generate the Prisma client

## Apply migrations

## Start applications

## Prisma Studio

## Migration command policy

## Troubleshooting

## Data-changing commands
```

Document Node/pnpm using the versions declared by repository configuration,
root `.env`, ports 3000/3001/4000/5432, `docker compose up -d db`,
`db:migrate` for creating a reviewed development migration,
`db:migrate:deploy` for applying committed migrations, and P1001/P3009 recovery
principles without suggesting migration deletion. Mark `db:push`, reset, seed,
sync, enrichment, and AI commands as explicit-approval operations.

- [ ] **Step 2: Write `verification.md`**

Use these sections:

```markdown
# Verification

## Test layers

## Narrow development commands

## Vocabulary workflow tests

## Full pre-handoff gate

## What passing tests prove

## Database-independent verification
```

Include the exact standalone vocabulary command:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
```

The full gate is:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

Explain that architecture tests prove placement/import constraints, while
behavioral tests prove public behavior; neither substitutes for real migration
or deployment verification.

- [ ] **Step 3: Link the guides without duplicating commands**

Update `docs/README.md` to list both guides. Reduce `AGENTS.md` verification to
the required gate plus a link to `docs/guides/verification.md`; keep database
safety as a link to the local development and vocabulary documents.

- [ ] **Step 4: Verify guide commands exist**

Run:

```powershell
pnpm run | Select-String "architecture:check|check-types|db:generate"
pnpm --filter @repo/api run | Select-String "db:migrate|db:migrate:deploy|db:seed|data:prepare-topics"
pnpm exec prettier --check docs/guides docs/README.md AGENTS.md
git diff --check
```

Expected: every documented command exists; formatting and diff checks pass.

- [ ] **Step 5: Commit development guides**

```powershell
git add docs/guides docs/README.md AGENTS.md
git commit -m "docs: add development and verification guides"
```

---

### Task 6: Complete the Vocabulary Pipeline Documentation

**Files:**

- Rewrite: `docs/data/vocabulary-pipeline.md`
- Delete: `docs/data/vocabulary-phase1.md`
- Modify: `CONTEXT.md`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: `apps/api/package.json`, vocabulary script folders, canonical JSON names, prompt contracts, ignored roots, and existing pipeline tests.
- Produces: one complete workflow/safety owner for all vocabulary data changes.

- [ ] **Step 1: Expand the pipeline around its complete lifecycle**

Use these sections:

```markdown
# Vocabulary Data Pipeline

## Canonical sources and provenance

## Version-control policy

## Catalog build and validation

## Dictionary enrichment

## Normalization

## Part-of-speech correction

## Topic classification

## Topic expansion

## Human review

## Database snapshots and risk audits

## Seed and confirmed database writes

## Failure, rollback, and recovery

## Verification
```

Document exact commands from `apps/api/package.json`. Keep these invariants:
103 canonical Topics; canonical relations come only from catalog Topic arrays;
provider output fails closed; classification uses deterministic IDs and catalog
hash; generated words require exactly 10 distinct bilingual example pairs;
accepted expansion retains provenance and starts with
`dictionaryLookupCompleted: false`; `working/` and `backups/` are ignored;
`reviews/` contains only versioned human decisions when such decisions exist.

- [ ] **Step 2: Remove the legacy Phase 1 pointer and update entrypoints**

Run:

```powershell
git rm docs/data/vocabulary-phase1.md
```

Ensure `CONTEXT.md` defines catalog, taxonomy, classification, proposal, and
review without claiming a particular DB is synchronized. Ensure `AGENTS.md`
links to this pipeline rather than restating commands.

- [ ] **Step 3: Verify source names, commands, and safety policy**

Run:

```powershell
rg -n "phase1-vocabulary|vocabulary-phase1|manual-overrides|data/vocabulary/(normalization|topics-batches)" README.md AGENTS.md CONTEXT.md docs
rg -n "exactly 10|103|working/|backups/|reviews/|dictionaryLookupCompleted" docs/data/vocabulary-pipeline.md
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm exec prettier --check docs/data/vocabulary-pipeline.md CONTEXT.md AGENTS.md
git diff --check
```

Expected: stale path search returns no matches; all invariants are documented;
20 vocabulary workflow tests pass.

- [ ] **Step 4: Commit the complete vocabulary workflow**

```powershell
git add docs/data AGENTS.md CONTEXT.md
git commit -m "docs: document the complete vocabulary pipeline"
```

---

### Task 7: Normalize ADRs 0001 Through 0010

**Files:**

- Modify: `docs/adr/0001-use-prisma-postgres.md`
- Modify: `docs/adr/0002-english-vocabulary-phase1.md`
- Modify: `docs/adr/0003-saved-words-review-local-session.md`
- Modify: `docs/adr/0004-persistent-vocabulary-progress.md`
- Modify: `docs/adr/0005-spaced-review-ui.md`
- Modify: `docs/adr/0006-audio-enrichment.md`
- Modify: `docs/adr/0007-listening-review-local-challenges.md`
- Modify: `docs/adr/0008-example-sentence-enrichment.md`
- Modify: `docs/adr/0009-review-session-composition.md`
- Modify: `docs/adr/0010-standalone-fill-blank-practice.md`

**Interfaces:**

- Consumes: Prisma schema, current Review/Practice use cases, vocabulary pipeline ownership, and standardized ADR format.
- Produces: accurate early product/data decisions with explicit supersession.

- [ ] **Step 1: Apply the common ADR format**

Every file must contain exactly these top-level sections:

```markdown
# ADR NNNN: Decision title

## Status

## Context

## Decision

## Consequences
```

Use repository-relative backticked paths and `pnpm` terminology. Do not embed
step-by-step operating commands; link to the relevant guide/data document.

- [ ] **Step 2: Correct status and current ownership**

Apply these decisions exactly:

```text
0001 Accepted; amended by ADR 0014
0002 Accepted; data-source details amended by the canonical vocabulary pipeline
0003 Superseded by ADR 0004
0004 Accepted
0005 Accepted
0006 Accepted
0007 Accepted
0008 Accepted
0009 Accepted
0010 Accepted
```

ADR 0001 uses Prisma migration language rather than advertising `db:push` as
the normal workflow. ADR 0002 retains English-only learning scope without
claiming that a seed may destructively reset data by default. ADRs 0005-0010
reference current Review/Practice ownership and localized public routes without
using removed `modules/vocabulary` paths.

- [ ] **Step 3: Verify ADR structure and implementation terms**

Run:

```powershell
rg -n "npm run|modules/vocabulary|phase1-vocabulary|Server Action|\bEC\b|ecommerce" docs/adr -g "000*.md" -g "0010-*.md"
pnpm exec prettier --check docs/adr/000*.md docs/adr/0010-*.md
git diff --check
```

Expected: stale-term search returns no matches; formatting and diff checks pass.

- [ ] **Step 4: Commit early ADR normalization**

```powershell
git add docs/adr/000*.md docs/adr/0010-*.md
git commit -m "docs: normalize vocabulary and review ADRs"
```

---

### Task 8: Normalize Architecture ADRs and Add the ADR Index

**Files:**

- Modify: `docs/adr/0011-monorepo-runtime-ownership.md`
- Modify: `docs/adr/0012-course-content-capability-boundary.md`
- Rename: `docs/adr/0013-ec-admin-frontend-profile.md` -> `docs/adr/0013-frontend-feature-view-profile.md`
- Rename: `docs/adr/0014-ec-api-source-profile.md` -> `docs/adr/0014-capability-owned-api-source-profile.md`
- Modify: `docs/adr/0015-auth-use-case-organization.md`
- Modify: `docs/adr/0016-domain-owner-locality.md`
- Modify: `docs/adr/0017-centralized-http-logging.md`
- Modify: `docs/adr/0018-flat-goal-use-cases-and-explicit-list-query.md`
- Modify: `docs/adr/0019-auth-endpoint-rate-limiting.md`
- Modify: `docs/adr/0020-idempotent-learning-progress.md`
- Rename: `docs/adr/0021-ec-shared-typescript-profile.md` -> `docs/adr/0021-shared-typescript-root-interface.md`
- Create: `docs/adr/README.md`
- Modify: `docs/README.md`
- Modify: `docs/architecture/codebase-structure.md`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/course-content.md`

**Interfaces:**

- Consumes: canonical architecture documents from Tasks 3-4 and neutral test names from Task 1.
- Produces: self-contained architecture decisions and a complete relationship index.

- [ ] **Step 1: Rename ADRs 0013, 0014, and 0021 with Git history**

Run:

```powershell
git mv docs/adr/0013-ec-admin-frontend-profile.md docs/adr/0013-frontend-feature-view-profile.md
git mv docs/adr/0014-ec-api-source-profile.md docs/adr/0014-capability-owned-api-source-profile.md
git mv docs/adr/0021-ec-shared-typescript-profile.md docs/adr/0021-shared-typescript-root-interface.md
```

- [ ] **Step 2: Rewrite ADRs 0011-0021 using intrinsic rationale**

Apply these corrections:

```text
0011 adds packages/ui and browser-owned React Query/cache behavior.
0012 removes Shared subpaths, temporary legacy coexistence, and resolved search drift.
0013 explains feature/view composition and resource APIs.
0014 explains capability-owned API roots and one Prisma Interface.
0015 keeps goal Auth use cases, explicit actor identity, and small public exports.
0016 keeps Admin as caller/authorization mode and Vocabulary locality.
0017 keeps one failure log, request IDs, redaction, and stable public errors.
0018 records the applied challenge-progress uniqueness invariant.
0019 owns login/register/refresh policies, Retry-After, proxy trust, and the shared-storage requirement for multiple replicas.
0020 contains only idempotent challenge completion and concurrent-safe vocabulary progress; Topic batching moves to api.md.
0021 keeps root-only TypeScript types/constants and the no-runtime-response-validation trade-off.
```

Remove all external-project comparisons and temporary migration statements.

- [ ] **Step 3: Create the ADR index**

`docs/adr/README.md` must contain:

```markdown
# Architecture Decision Records

## Status vocabulary

## Decision index

## Supersession and amendment rules

## Creating a new ADR
```

The index table lists number, linked title, status, and relationship for all 21
ADRs. It must show ADR 0003 as superseded, ADR 0001 amended by 0014, ADR 0012
amended by 0013/0016/0018/0021, ADR 0014 amended by 0015/0016, and ADR 0018's
database invariant as applied.

- [ ] **Step 4: Update every renamed ADR/test link**

Run:

```powershell
rg -l "0013-ec-admin|0014-ec-api|0021-ec-shared|ec-feature-architecture|ec-shared-root|ec-shared-profile" README.md AGENTS.md CONTEXT.md docs apps packages
```

Update every returned active file to the new ADR and test filenames. Completed
superpowers files may still match at this point because Task 9 deletes them.

- [ ] **Step 5: Verify ADR structure, references, and architecture gates**

Run:

```powershell
rg -n -i "\bEC\b|ecommerce|e-commerce|prepared unique migration|migration remains" README.md AGENTS.md CONTEXT.md docs/README.md docs/architecture docs/data docs/guides docs/adr apps packages/shared/test packages/shared/package.json
rg -n "0013-ec-admin|0014-ec-api|0021-ec-shared|ec-feature-architecture|ec-shared-root|ec-shared-profile" README.md AGENTS.md CONTEXT.md docs/README.md docs/architecture docs/data docs/guides docs/adr apps packages
pnpm architecture:check
pnpm exec prettier --check docs/adr docs/README.md docs/architecture
git diff --check
```

Expected: both stale-reference searches return no matches; architecture,
formatting, and diff checks pass.

- [ ] **Step 6: Commit normalized architecture ADRs**

```powershell
git add docs/adr docs/README.md docs/architecture
git commit -m "docs: make architecture decisions self-contained"
```

---

### Task 9: Remove Historical Material and Run the Final Gate

**Files:**

- Delete: `docs/index.html`
- Delete: `docs/end.html`
- Delete: `docs/new/**`
- Delete: `docs/superpowers/plans/**`
- Delete: `docs/superpowers/specs/**`
- Verify: all final active documentation and renamed architecture tests

**Interfaces:**

- Consumes: every canonical document and ADR produced by Tasks 1-8.
- Produces: the final lean documentation tree with no in-tree historical archive.

- [ ] **Step 1: Delete prototypes, completed handoffs, specs, and plans**

Run:

```powershell
git rm docs/index.html docs/end.html
git rm -r docs/new docs/superpowers
```

Expected: only the canonical documentation tree from the design remains.

- [ ] **Step 2: Verify the final file inventory**

Run:

```powershell
rg --files docs
```

Expected roots:

```text
docs/README.md
docs/architecture/*
docs/guides/*
docs/data/vocabulary-pipeline.md
docs/adr/README.md
docs/adr/0001...0021
```

No `docs/new`, root HTML, root folder guides, legacy Phase 1 pointer, or
`docs/superpowers` path remains.

- [ ] **Step 3: Check all relative Markdown links**

Run this PowerShell validation from the repository root:

```powershell
$errors = @()
$files = @(Get-Item README.md, AGENTS.md, CONTEXT.md) + @(Get-ChildItem docs -Recurse -File -Filter *.md)
foreach ($file in $files) {
  $content = Get-Content -Raw -LiteralPath $file.FullName
  foreach ($match in [regex]::Matches($content, '\[[^\]]+\]\((?!https?://|mailto:|#)([^)#]+)(?:#[^)]+)?\)')) {
    $target = [uri]::UnescapeDataString($match.Groups[1].Value)
    $resolved = Join-Path $file.DirectoryName $target
    if (-not (Test-Path -LiteralPath $resolved)) {
      $errors += "$($file.FullName): missing $target"
    }
  }
}
if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output "All relative Markdown links resolve."
```

Expected: `All relative Markdown links resolve.`

- [ ] **Step 4: Check forbidden reference and stale-path vocabulary**

Run:

```powershell
rg -n -i "\bEC\b|ecommerce|e-commerce|Web Base Standard|docs/superpowers|docs/new|frontend-folder-structure|backend-folder-structure|vocabulary-phase1|apps/(web|admin)/src" README.md AGENTS.md CONTEXT.md docs apps packages/shared/test packages/shared/package.json
```

Expected: no matches. Historical Git commits are outside this check.

- [ ] **Step 5: Run the complete verification gate**

Run sequentially:

```powershell
pnpm architecture:check
pnpm test
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm check-types
pnpm lint
pnpm build
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md docs
git diff --check
```

Expected: all Turbo tasks pass, API has 70 behavioral/architecture tests,
vocabulary has 20 standalone workflow tests, type checking/lint/build pass,
Prettier reports all matched files formatted, and Git reports no whitespace
errors. If test totals change because unrelated tests were added, require zero
failures rather than forcing the historical count.

- [ ] **Step 6: Commit the final lean documentation tree**

```powershell
git add -A README.md AGENTS.md CONTEXT.md docs apps/web/test apps/admin/test apps/api/test packages/shared
git commit -m "docs: finalize canonical English Base documentation"
```

- [ ] **Step 7: Verify final repository state**

Run:

```powershell
git status --short
git log -10 --oneline --decorate
git tag --points-at HEAD
```

Expected: working tree is clean. Do not move or recreate `v1.0.0` as part of
this plan; release/tag policy is a separate explicit decision after review.
