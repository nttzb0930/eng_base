# Verification

Verification is layered. Run the narrowest relevant gate while developing, then
run the complete repository gate before handoff. Passing a structural check does
not prove business behavior, and passing unit tests does not prove a migration or deployment succeeded.

## Test layers

| Layer              | What it proves                                                 | What it does not prove                     |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------ |
| Behavioral test    | public result, error, transaction, HTTP/cache/session behavior | production deployment or every integration |
| Architecture test  | file placement, imports, public Interface, forbidden layout    | runtime business correctness               |
| Type check         | compile-time TypeScript compatibility                          | runtime JSON validity                      |
| Lint               | configured static code rules                                   | business behavior                          |
| Build              | production compilation and route generation                    | external services or data correctness      |
| Data pipeline test | source invariants and pure workflow contracts                  | provider quality or DB apply success       |

Tests should prefer public capability Interfaces. Pure internal rules are tested
directly when they contain meaningful scheduling, mapping, validation, or composition behavior.

## Narrow development commands

```powershell
pnpm test:api
pnpm test:web
pnpm test:admin

pnpm --filter @repo/api architecture:check
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/admin architecture:check
pnpm --filter @repo/shared architecture:check

pnpm --filter @repo/api check-types
pnpm --filter @repo/web check-types
pnpm --filter @repo/admin check-types
```

Run a focused Node test file through the owning workspace when investigating one
behavior. Do not weaken or delete an architecture assertion simply because a new
folder conflicts with the documented ownership model; review the decision first.

## Vocabulary workflow tests

The normal API test command covers vocabulary source-layout rules. Pure workflow
tests below the offline script tree are a separate gate:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/development-seed-guard.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts scripts/vocabulary/database/bootstrap-vocabulary.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
```

These tests validate canonical catalog/taxonomy structure, duplicate identity,
Topic references, deterministic classification IDs, fail-closed provider
responses, expansion deficits, provenance, exact example requirements, the
production seed guard, and safe bootstrap planning/transaction/CLI behavior.
They do not call a provider or write PostgreSQL.

## Full pre-handoff gate

Run sequentially from the repository root:

```powershell
pnpm architecture:check
pnpm test
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts scripts/vocabulary/database/development-seed-guard.test.ts scripts/vocabulary/database/vocabulary-seed-data.test.ts scripts/vocabulary/database/vocabulary-bootstrap-plan.test.ts scripts/vocabulary/database/vocabulary-bootstrap-store.test.ts scripts/vocabulary/database/bootstrap-vocabulary.test.ts scripts/vocabulary/topic-classification/topic-classification.test.ts scripts/vocabulary/topic-classification/unclassified-vocabulary-audit.test.ts scripts/vocabulary/topic-expansion/topic-expansion.test.ts
pnpm check-types
pnpm lint
pnpm build
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
```

The standalone vocabulary command remains explicit even though normal API tests
cover source-layout rules; it proves the pure pipeline contracts without a
provider or database.

Before commit or handoff, also run:

```powershell
git diff --check
git status --short
```

Review every changed/untracked file. Generated artifacts, secrets, `.env`, build
outputs, database snapshots, and local vocabulary work must not enter the commit.

## What passing tests prove

- A green architecture gate proves the documented ownership/import constraints
  still hold at the tested filesystem seam.
- A green behavioral suite proves the characterized inputs and outputs still behave as asserted.
- A green type check proves the producer/consumer declarations compile together;
  Shared TypeScript types disappear at runtime and do not parse HTTP JSON.
- A green build proves API, Web, Admin, Shared, and UI production compilation;
  it does not contact or validate a production database.

Concurrency and idempotency need behavioral evidence such as duplicate or
parallel requests and rollback expectations. Source-string architecture checks
support those tests but cannot replace them.

## Database-independent verification

The standard architecture, unit, type, lint, build, and vocabulary pure tests do
not require a schema push, reset, seed, enrichment, sync, or provider call. If a
verification proposal requires a database write, stop and separate that action
into a reviewed migration/data task.

Migration verification is environment-specific: back up the target, apply the
committed migration with the correct command, inspect migration state, and run
the affected integration/smoke behavior. Do not claim a production migration is safe based only on compilation.
