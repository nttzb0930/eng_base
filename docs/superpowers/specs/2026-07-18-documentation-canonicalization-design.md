# Documentation Canonicalization Design

## Purpose

English Base needs a small, authoritative documentation set that teaches the
current architecture without requiring readers to know the Ecommerce Base
reference used during the refactor. The current `docs/` tree mixes normative
architecture, completed implementation plans, stale handoff material, UI
prototypes, and overlapping folder guides. Several accepted ADRs also describe
superseded paths or temporary migration state.

This change will establish one canonical owner for each kind of knowledge,
rewrite active documentation against the current source tree, and remove
historical material from the active documentation surface. Git history and the
local `v1.0.0` tag retain deleted material when historical investigation is
needed.

## Language policy

- The root `README.md` is written in Vietnamese for project introduction and
  local onboarding.
- `AGENTS.md`, `CONTEXT.md`, every file below `docs/`, and every ADR are written
  in English.
- Source identifiers, paths, commands, HTTP fields, and configuration names are
  always reproduced exactly as implemented.
- `EC` and `ecommerce` are not architecture vocabulary. Active documentation,
  ADR names, architecture-test filenames, and test descriptions must explain
  English Base decisions in self-contained terms.

## Canonical documentation tree

```text
README.md
AGENTS.md
CONTEXT.md

docs/
  README.md
  architecture/
    codebase-structure.md
    frontend.md
    api.md
    course-content.md
  guides/
    local-development.md
    verification.md
  data/
    vocabulary-pipeline.md
  adr/
    README.md
    0001...0021
```

Completed plans, completed design specs, handoff documents, and prototypes are
not part of the final documentation tree.

## Knowledge ownership and precedence

Each rule has one canonical owner. Other documents link to that owner instead
of restating the rule.

1. `CONTEXT.md` owns domain terms, product invariants, and public compatibility
   language.
2. Newer accepted ADRs own architectural decisions and explicitly supersede or
   amend older ADR sections.
3. `docs/architecture/` describes the resulting current architecture without
   retelling migration history.
4. `docs/data/` owns data-source, pipeline, provenance, and write-safety rules.
5. `docs/guides/` owns commands and repeatable operating procedures.
6. `AGENTS.md` owns mandatory workflow guardrails and points to the canonical
   detail.
7. Root `README.md` introduces the repository and links to `docs/README.md`.

If an ADR and current architecture document appear inconsistent, the ADR index
must identify the newer decision and the stale document must be corrected in
the same change.

## Root entrypoints

### `README.md`

The Vietnamese root README will contain:

- product purpose and current scope;
- the Web, Admin, API, Shared, and UI runtime/package map;
- prerequisites and a safe local quick start;
- `.env` setup, PostgreSQL startup, Prisma generation, and migration commands;
- common development and verification commands;
- an explicit warning around seed, reset, push, enrichment, and sync commands;
- a link to `docs/README.md` for architecture and data workflows.

It will not duplicate folder conventions, ADR rationale, endpoint matrices, or
the full vocabulary pipeline.

### `AGENTS.md`

The agent workflow will retain concise ownership and safety rules while:

- replacing reference-project terminology with English Base terminology;
- linking to canonical frontend, API, data, and verification documents;
- defining the documentation update rule for changes to public Interfaces,
  ownership, compatibility, data workflows, or operational commands;
- identifying canonical vocabulary inputs and ignored artifact roots;
- requiring the standalone vocabulary workflow tests in relevant changes;
- avoiding duplicated folder trees already owned by architecture documents.

### `CONTEXT.md`

The domain context will:

- distinguish the canonical vocabulary catalog from the data deployed to a
  particular PostgreSQL environment;
- define Topic taxonomy, classification, expansion, and human review terms;
- retain Course content, Learning session, Auth session, wire type, persistence
  model, and ViewModel language;
- remove temporary migration and refactor status;
- retain only stable compatibility constraints.

## Architecture documents

### `codebase-structure.md`

This is the workspace-level architecture owner. It covers runtime ownership,
capability-first placement, dependency direction, Shared/UI responsibilities,
naming, public Interfaces, forbidden technical buckets, and architecture-test
enforcement. It references rather than duplicates frontend/API details.

### `frontend.md`

This file replaces:

- `frontend-folder-structure.md`;
- `frontend-api-calls.md`;
- `frontend-route-template.md`;
- `frontend-shared-hooks.md`.

It documents the actual `app/`-only Web and Admin layouts, thin route adapters,
`app/views` composition, feature-local resource APIs and hooks, Auth-owned
browser transports, query-key ownership, localized Web navigation,
`learning-session` ownership, ViewModels, and `packages/ui`. It must not mention
the removed frontend `src/` roots.

### `api.md`

This file replaces `backend-folder-structure.md`. It documents source roots,
capability Modules, flat goal use cases, controller/DTO/mapper roles, Auth
session behavior, common logging and stable error responses, endpoint-specific
rate limiting, proxy trust, Prisma ownership, transactions/idempotency, offline
script adapters, environment validation, and single- versus multi-replica rate
limit storage constraints.

### `course-content.md`

Course content remains the worked capability example. It will keep the domain
hierarchy, 25 management goals, list-page/list-all behavior, compatibility
paths, mapper responsibilities, query keys, and verification surface while
updating Shared paths and test names and removing reference-project language.

## Guides

### `local-development.md`

The guide owns prerequisites, dependency installation, `.env`, Docker
PostgreSQL startup, Prisma client generation, `migrate dev` versus
`migrate deploy`, application startup, Prisma Studio, common failure recovery,
and the distinction between schema migration and destructive data commands.
`db:push` is documented as an exceptional prototyping tool, not the default
setup path.

### `verification.md`

The guide distinguishes behavioral tests, architecture tests, type checking,
linting, builds, and vocabulary pipeline tests. It gives narrow commands for
development and the complete pre-handoff gate. It also explains that structural
tests do not prove transactional or HTTP behavior.

## Vocabulary pipeline document

`vocabulary-pipeline.md` will cover all workflow owners rather than only Topic
classification and Topic expansion:

- canonical catalog build and validation;
- dictionary/audio/example enrichment;
- normalization prepare, provider, override, merge, and confirmed DB sync;
- part-of-speech correction prepare, provider, merge, and confirmed DB sync;
- Topic classification prepare, provider, validation, and atomic merge;
- Topic expansion deficit report, generation, human acceptance, and merge;
- database snapshots, risk audits, seed inputs, and rollback expectations;
- exactly 10 distinct bilingual example pairs for generated vocabulary;
- fail-closed provider contracts and provenance fields;
- version-control policy for canonical, review, working, and backup files.

`data/vocabulary-phase1.md` is deleted after its canonical-catalog pointer is
absorbed here.

## ADR normalization

Every ADR will use a consistent title plus `Status`, `Context`, `Decision`, and
`Consequences`. `Status` may be `Accepted`, `Superseded by ADR NNNN`, or
`Accepted; amended by ...`. ADRs record decisions and trade-offs, not operating
commands, local machine state, or temporary migration progress.

Required corrections include:

- ADR 0001: use current pnpm/Prisma paths and migration terminology.
- ADR 0002: retain the English-only product decision while linking current
  catalog/seed ownership.
- ADR 0003: mark superseded by ADR 0004.
- ADRs 0005-0010: remove stale module paths and align routes/data behavior with
  current implementations.
- ADR 0011: add `packages/ui` and replace obsolete Server Action ownership with
  current browser transport and React Query behavior.
- ADR 0012: remove the superseded Shared capability subpath, temporary legacy
  coexistence, and resolved `search`/`q` drift; identify amendments by ADRs
  0013, 0016, 0018, and 0021.
- ADR 0013: rename to `0013-frontend-feature-view-profile.md` and explain the
  feature/view layout from English Base requirements.
- ADR 0014: rename to `0014-capability-owned-api-source-profile.md` and explain
  source ownership without external-project references.
- ADRs 0015 and 0019: remove external baseline comparisons and retain intrinsic
  Auth, security, and deployment reasoning.
- ADR 0018: record the applied uniqueness invariant rather than a pending
  migration.
- ADR 0019: own proxy-trust and multi-replica rate-limit constraints.
- ADR 0020: focus on idempotent and concurrent-safe learning progress; keep
  Topic query optimization as current API implementation guidance rather than
  an unrelated decision in this ADR.
- ADR 0021: rename to `0021-shared-typescript-root-interface.md` and retain the
  TypeScript-only Shared trade-off without reference-project naming.

`docs/adr/README.md` will list every ADR, its current status, and supersession
or amendment relationship.

## Removed material

The following are deleted after current rules are incorporated into canonical
owners:

- `docs/overview.md`;
- the five root frontend/backend guides replaced above;
- `docs/data/vocabulary-phase1.md`;
- `docs/index.html` and `docs/end.html`;
- all of `docs/new/`, including the exact duplicate `index (1).html`;
- all completed files below `docs/superpowers/plans/` and
  `docs/superpowers/specs/`, including this design after implementation is
  complete and the final architecture is recorded.

Historical implementation details remain recoverable from Git history and the
local `v1.0.0` tag. They are deliberately not moved to `docs/archive/`, because
an in-tree archive would remain searchable and could be mistaken for current
guidance.

## Reference-name cleanup in tests

Documentation cleanup includes neutral architecture-test names so the enforced
standard is self-contained:

```text
apps/web/test/ec-feature-architecture.test.ts
  -> apps/web/test/frontend-feature-architecture.test.ts

packages/shared/test/ec-shared-root.test.ts
  -> packages/shared/test/shared-root-interface.test.ts

packages/shared/test/ec-shared-profile.architecture.test.ts
  -> packages/shared/test/shared-package-profile.architecture.test.ts
```

Related package scripts, test descriptions, documentation links, and string
assertions are updated. Functional assertions do not change.

## Verification

Implementation must demonstrate:

- no active Markdown or architecture test uses `EC` or `ecommerce` as a
  reference profile;
- all relative documentation links resolve;
- removed paths are not referenced by source, package scripts, tests, or docs;
- architecture tests pass after test-file renames;
- vocabulary tests still enforce canonical sources and ignored artifacts;
- `pnpm architecture:check`, `pnpm test`, `pnpm check-types`, `pnpm lint`, and
  `pnpm build` pass;
- `git diff --check` passes and the working tree contains only intended changes.

## Non-goals

- No application behavior, HTTP route, database schema, migration, seed, or
  vocabulary data is changed.
- No database-writing or AI-provider command is run.
- The documentation rewrite does not introduce a new issue tracker, docs site,
  static-site generator, or translation system.
- Historical commit messages and Git objects are not rewritten to remove the
  former reference name.

## Success criteria

A new coder can start from the Vietnamese root README, reach one English docs
index, understand ownership and safe commands without reading a completed
implementation plan, and find exactly one current answer for frontend layout,
API layout, verification, and vocabulary data workflows. ADRs explain English
Base decisions without unexplained external project names or stale migration
state.
