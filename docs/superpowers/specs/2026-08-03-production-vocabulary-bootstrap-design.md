# Production Vocabulary Bootstrap Design

## Purpose

English Base needs a safe way to initialize and synchronize the canonical
Vocabulary curriculum without reusing the destructive development reset in
`apps/api/scripts/seed.ts`. The production workflow must preserve users,
learning progress, TOEIC, Reading, Grammar, custom content, and existing
database records that are outside the canonical Vocabulary source.

This design covers only:

- `data/vocabulary/vocabulary-catalog.json`;
- `data/vocabulary/topics.json`;
- the `english-vocabulary` course;
- its A1-B2 Units, Lessons, Challenges, and Challenge Options.

TOEIC, Reading, Grammar, provider enrichment, normalization, POS correction,
and Topic expansion retain their existing independent workflows.

## Current Problem

The existing `db:seed` command calls a development reset before loading the
canonical JSON. It deletes course content, Vocabulary records, relationships,
and learner progress. Course deletion can also reach TOEIC content through
foreign-key cascades or fail partway because learner records restrict a
delete. It is therefore unsuitable for production or for repairing the current
local database.

The production API image also lacks an explicit, supported data-bootstrap
entrypoint and does not deliberately package the canonical JSON sources for an
operator command.

## Command Interfaces

The existing destructive command becomes development-only:

```text
pnpm db:seed:dev
```

It must refuse to run when `NODE_ENV=production`. The old `pnpm db:seed` alias
must be removed so an operator cannot mistake a reset for a production import.

The safe command is:

```text
pnpm --filter @repo/api data:bootstrap-vocabulary -- plan
pnpm --filter @repo/api data:bootstrap-vocabulary -- dry-run
pnpm --filter @repo/api data:bootstrap-vocabulary -- apply --confirm <token>
```

The root package exposes the same command as `pnpm data:bootstrap-vocabulary`.

`plan` reads and validates canonical files plus live database state and prints
the deterministic proposed counts. `dry-run` executes the complete persistence
path in a transaction that is deliberately rolled back. `apply` requires the
exact confirmation token printed by `plan` or `dry-run` and commits one atomic
transaction.

The token binds the operation to the sanitized database target, canonical
source fingerprint, and plan fingerprint. Secrets and connection credentials
must never be printed.

## Architecture

The implementation lives under the Vocabulary capability's database scripts:

```text
apps/api/scripts/vocabulary/database/
  bootstrap-vocabulary.ts          CLI orchestration only
  vocabulary-bootstrap-plan.ts     pure desired-state and diff planning
  vocabulary-bootstrap-store.ts    Prisma transaction persistence
  vocabulary-bootstrap.test.ts     behavior and safety tests
```

Existing canonical loading and validation from
`vocabulary-seed-data.ts` remains the single source adapter. The command uses
`scripts/support/script-prisma.ts` for database access.

The pure planner accepts canonical source records and a bounded live-state
snapshot, then returns a serializable plan. Persistence consumes only that plan.
This separation makes deletion bans, deterministic fingerprints, and
idempotency testable without a database.

## Synchronization Rules

### Vocabulary and Topics

- Vocabulary identity remains `normalizedWord + pos + cefrLevel`.
- Topics use stable `slug` identity.
- Existing matching records are updated only when canonical managed fields
  differ.
- Missing canonical records and relations are created.
- Records absent from canonical JSON are retained.
- No `deleteMany`, raw `DELETE`, truncate, reset, or cascade-driven cleanup is
  permitted in the safe bootstrap path.
- Existing learner-owned rows and practice history are not rewritten.

### Curriculum

- The course uses immutable code `english-vocabulary`.
- Units use CEFR levels A1, A2, B1, and B2 as their stable logical identity
  within that course.
- Each level partitions canonical words into deterministic groups of 15,
  ordered by canonical catalog order.
- A Lesson's stable logical identity is its Unit plus deterministic ordinal.
- Each word produces the existing EN-to-VI SELECT and VI-to-EN ASSIST
  challenges.
- Challenge identity is Lesson, vocabulary item, direction, type, and order.
- Options are synchronized only for challenges owned by this bootstrap.
- Existing matching curriculum is reused. Missing records are inserted.
- Unexpected or ambiguous duplicates stop planning instead of guessing or
  deleting.
- Existing custom courses and all non-`english-vocabulary` content remain
  untouched.

Because current numeric IDs are database-generated, the plan resolves parent
IDs during the transaction while retaining stable logical keys in the
serialized plan.

## Transaction and Failure Behavior

`apply` performs all writes in one Prisma interactive transaction. Any
validation, uniqueness, foreign-key, or count mismatch rolls the transaction
back. `dry-run` uses the same writer and forces rollback after final invariant
checks.

The operation verifies that the live-state fingerprint still matches the plan
immediately before writing. Drift invalidates the confirmation and requires a
new plan. A successful apply prints created, updated, reused, and unchanged
counts by resource plus the final canonical and plan fingerprints.

The command never provisions an Admin user. Production identity provisioning
is a separate Auth operation and must not embed a default password.

## Packaging and Deployment

The API production artifact must contain:

- compiled bootstrap command code;
- Prisma runtime and generated client already owned by the API image;
- `vocabulary-catalog.json` and `topics.json` at an explicit application path.

The runner must not contain ignored `working/` or `backups/` artifacts. Source
resolution accepts an explicit production path supplied by the command
entrypoint and retains the current repository path for local execution.

Normal deployment remains:

1. pull immutable images;
2. run `prisma migrate deploy`;
3. start services and health-check.

Vocabulary bootstrap is an explicit operator action, not an automatic step on
every deploy. A new production database runs `plan`, takes a database backup,
runs `dry-run`, reviews counts, and then runs confirmed `apply`. Later releases
repeat this only when the canonical data fingerprint changes.

## Safety and Testing

Tests must prove:

- the safe source tree contains no destructive database operation;
- production rejects `db:seed:dev` before database access;
- malformed or duplicate canonical identities fail before planning;
- `plan` and `dry-run` leave persistent state unchanged;
- a second plan after apply proposes zero creates and zero updates;
- records outside canonical Vocabulary ownership remain unchanged;
- ambiguous curriculum duplicates stop the operation;
- confirmation is rejected for a different target, source fingerprint, plan,
  or drifted live state;
- production packaging contains both canonical JSON files and the executable
  bootstrap entrypoint but excludes ignored artifacts.

Verification follows `docs/guides/verification.md`, including the standalone
Vocabulary workflow test suite and all root gates before handoff.

## Documentation Changes

`docs/data/vocabulary-pipeline.md` will distinguish the destructive local reset
from the safe production bootstrap and document the canonical file packaging.
`docs/guides/ci-cd.md` will keep bootstrap separate from automatic deployment
and provide the explicit first-environment and later-sync operator sequence.
The documented catalog count must be derived or updated so it does not claim
the stale 3,000-record value while the canonical file contains 7,429 records.

## Success Criteria

- The current database can recover the missing English Vocabulary hierarchy
  without deleting its existing TOEIC, Reading, Grammar, user, progress, or
  practice data.
- A clean production database can be initialized from the versioned canonical
  JSON through an explicit, reviewed command.
- Re-running the command is idempotent.
- Ordinary application deployment never resets or implicitly synchronizes
  application data.
