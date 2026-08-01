# API Architecture

`apps/api` is the only runtime that owns business behavior, PostgreSQL access,
Prisma, migrations, authentication persistence, and offline vocabulary scripts.
Web and Admin are HTTP callers; they never import API implementation or database
models.

## Source ownership

```text
apps/api/
  prisma/
    schema.prisma              persistence model
    migrations/                ordered schema changes
  scripts/
    reading/                   validated Reading content and explicit importer
    support/                   offline script adapters
    vocabulary/                data workflows grouped by goal
  src/
    common/                    cross-capability Nest delivery infrastructure
    config/                    validated runtime configuration
    database/prisma/           Nest Prisma adapter
    module/<capability>/       business owner and HTTP delivery
    app.module.ts              Nest composition root
    main.ts                    process bootstrap
  test/                        cross-module architecture tests
```

The singular `src/module` path is the current repository convention. Renaming
the entire tree is a separate mechanical migration, not a side effect of a
capability change.

## Capability Modules and public Interfaces

Each business capability owns its delivery, behavior, mapping, and tests:

```text
src/module/<capability>/
  index.ts                     small public Interface
  <capability>.module.ts       Nest composition
  *.controller.ts              HTTP delivery
  dto/                         request validation when grouping adds locality
  mappers/                     persistence-to-wire translation
  use-cases/                   one goal per class
  tests/                       behavior and delivery tests
```

Not every capability needs every folder. Add a role only when it owns real
behavior or concentrates knowledge. An `index.ts` exports a deliberate public
Interface; it does not contain behavior.

Other capabilities import through the owner Interface instead of deep-importing
private use cases, mappers, or persistence types. Vocabulary owns its mapping,
challenge builders, progress rules, and public types. Courses owns both Learner
reads and Admin Course Management behavior.

Admin is a caller and authorization mode, not a default business owner. An
`/admin/*` controller stays with Users, Practice, Settings, Courses, or the
capability whose behavior it exposes.

### Reading ownership

`src/module/reading` owns both Admin authoring/publication and Learner
discovery, submission, history, and result delivery. Passage content is
validated before persistence and again before publication. Learner detail
queries never select option correctness; grading uses server-owned content only.

Reading submissions are idempotent per `(user_id, submission_key)`. A retry with
the same normalized answer fingerprint returns the persisted attempt, while a
different payload using the same key is rejected. Attempt answers persist
immutable text snapshots so editing a passage cannot alter prior results.

Reading may use `vocabulary_topics` as an optional taxonomy reference. It does
not write `practice_sessions`, `practice_session_items`, or
`user_vocabulary_progress`; Reading accuracy is an independent learning signal.

`data/reading/a1/passages.json` is the canonical, versioned Reading A1 content
source. Pure modules under `scripts/reading/content` validate its structure,
semantic invariants, Topic references, answer keys, and vocabulary warnings
without environment or database access. `scripts/reading/import` owns
persistence-neutral draft synchronization; the Prisma adapter is composed only
by the explicit `data:import-reading-a1` operator command. New and existing
drafts are synchronized transactionally, while published passages are left
unchanged. Startup, build, CI, seed, and migration do not invoke the importer.

### TOEIC content ownership

TOEIC exam content is a dedicated Course-owned aggregate associated with the
immutable Course code `toeic-600`. It does not reuse CEFR
`reading_passages`: TOEIC tests own source identity, Parts 5-7, grouped
stimuli, numbered questions, answer options, media metadata, and source practice
statistics.

Private canonical packages remain under ignored `var/licensed-content`
storage. The explicit `data:import-toeic-reading-practice` command
revalidates each package before persistence. `(source, source_test_id)` is
the idempotent identity: an identical version is skipped, while a new version
replaces one aggregate transactionally and publishes it immediately. Startup,
build, CI, seed, and migration never invoke this importer.

TOEIC Listening acquisition is a separate, local-first pipeline linked to the
exact approved Reading inventory SHA. Inventory and download do not require a
database; media is resumable and remains under ignored licensed-content
storage. `data:import-toeic-listening-practice` is the only database-writing
step. It requires the matching Reading test to exist, replaces only Parts 1–4
inside one transaction, preserves Parts 5–7 and the Reading source version,
then publishes the independent Listening version.

The authenticated `module/toeic-listening` capability exposes overview, test
list/detail, and local media routes under `/toeic/listening`. Reads accept an
optional Part 1, 2, 3, or 4 and use projections that exclude correctness,
transcripts, translations, explanations, provider URLs, and storage paths.
Parts 1–2 return option labels without printable text; Parts 3–4 return their
printable prompts and options.

Part practice exposes `POST /toeic/listening/tests/:testId/check-answer`. It
requires the exact Listening source version, an explicit Part 1–4, and option
ownership for one question. Only after that selection is validated does it
return correctness, the correct option, translation, transcript, explanation,
and the prepared vocabulary cache owned by that exact question. A question
without prepared cache returns an empty vocabulary array and never triggers a
provider or AI request. Full Test has no
equivalent request shape; its Web flow continues to reveal review data only
after submission. Vocabulary matching reuses Vocabulary-owned behavior and
does not persist inferred TOEIC-to-vocabulary relationships.

The imported Part 1–2 source translation is a labeled block. The check-answer
use case parses its `(A)`–`(D)` markers at read time and returns a question
translation where Part 2 provides one plus per-choice translations. This adds
no persistence column or migration. Parts 3–4 are not parsed as choices because
their source field represents the conversation or talk translation.

Media delivery resolves opaque asset IDs only when they belong to published
Listening content with `DOWNLOADED` status. The resolved real path must remain
inside the injected licensed-content root. GET and HEAD support complete and
single byte-range responses; malformed, multiple, or unsatisfiable ranges fail
with HTTP 416 without exposing filesystem errors.

Listening submissions use a client UUID idempotency key and the published
Listening source version. The server validates complete Full or Part 1–4 scope,
owns the answer key, and stores immutable question, option, transcript,
explanation, stimulus, and media-identity snapshots. Account-scoped attempt
list/detail routes return those snapshots, so later content replacement cannot
rewrite historical results.

Listening draft progress is authenticated and backend-owned per learner, test,
and `FULL`/`PART_1`–`PART_4` scope. A 30-day snapshot stores answers, review
markers, active question, completed/active media, and playback position. Reads
discard expired or source-version-stale drafts; successful submissions remove
the matching draft transactionally.

The authenticated `module/toeic-reading` capability exposes overview, test
list/detail, submission, and attempt history/result routes under
`/toeic/reading`. Learner test detail uses explicit persistence projections that
exclude option correctness and grading explanations. Submission includes the
published `source_version`, validates complete option ownership, grades on the
server, and persists one immutable attempt aggregate transactionally.

Test list, detail, and history reads accept an optional Part 5, 6, or 7. A
selected Part projects only that Part's stimuli and questions, grading requires
exactly that Part, and the attempt stores `practice_part`. Omitting the Part
preserves Full Test behavior across all 100 Reading questions. Legacy Full Test
attempts keep `practice_part = null`.

Test discovery orders newer source-set labels first and applies natural numeric
ordering within each set, so titles are delivered as `Test 1`, `Test 2`, ...

TOEIC Reading draft progress is backend-owned and authenticated. One snapshot is
stored per `(user_id, test_id, scope)`, where scope is Full Test, Part 5, Part 6,
or Part 7. The API derives `user_id` only from the JWT context and validates
every question and option against the published test before an atomic upsert.
Drafts expire 30 days after their latest save; expired, unpublished, or
source-version-mismatched drafts are discarded. Test summaries expose only the
matching learner's answered count, total count, active question, and update time.
A successful new submission deletes its matching draft in the attempt
transaction; an identical idempotent retry also performs cleanup.
`Test 10` regardless of import timestamps or database IDs.

The approved inventory's source-set label is canonical provenance, not a value
derived from a source update timestamp. It flows through private canonical
packages into `toeic_test_sets.title`, allowing Learner delivery to identify the
set as `2026` without inventing difficulty levels.

`(user_id, submission_key)` is the attempt idempotency identity. Identical
retries return the original result, conflicting key reuse is rejected, and a
source-version mismatch requires the Learner to reload. Result delivery reads
only attempt snapshots, remains scoped to the authenticated Learner, and does
not depend on current mutable question content. Applying the attempt migration
remains an explicit operator action; startup, build, and tests do not apply it.
The fingerprint includes Part scope for Part practice while retaining the
previous fingerprint shape for Full Test compatibility.

## Goal use cases

One use case represents one user or system goal. Goal files stay flat under
`use-cases/` unless a real multi-phase workflow has internal stages that benefit
from their own locality.

Do not create:

- plural CRUD aggregates that hide independent change reasons;
- compatibility services that forward one-to-one to use cases;
- empty repository/domain/application layer folders;
- modality folders that only group repeated filename prefixes;
- an app-wide `admin`, `services`, `repositories`, or `use-cases` business bucket.

Shared builders may own reusable internal composition, but callers use the
capability's goal Interface rather than the builder as a second public API.

## Delivery, DTOs, mappers, and persistence

```text
Nest controller -> goal use case -> Prisma Adapter
       |                 |
       -> request DTO    -> persistence/wire mapper
```

- Controllers extract validated HTTP input, explicit actor identity, cookies,
  headers, and delivery policy, then delegate.
- Controllers do not query Prisma or own password, token, transaction, or
  business persistence flows.
- Nest DTO classes and `class-validator` own incoming request validation.
- Use cases own existence checks, authorization decisions, transaction
  coordination, and persistence flow for one goal.
- Mappers convert Prisma records and snake_case fields to JSON-safe Shared wire
  types.
- Prisma-generated models never cross the HTTP Interface.

Shared list formatting such as pagination envelopes and `Content-Range` is HTTP
delivery infrastructure under `common/http`; it is not business behavior.
`FilterParse` produces a neutral list query and the owning use case maps it to
Prisma.

## Authentication sessions

Auth owns login, registration, refresh, logout, password hashing, token
signing/verification, and persisted refresh sessions:

```text
src/module/auth/
  auth.controller.ts
  admin-auth.controller.ts
  auth.module.ts
  service/
    auth-token.service.ts
    password.service.ts
  use-cases/
    login-user.usecase.ts
    register-user.usecase.ts
    refresh-token.usecase.ts
    logout-user.usecase.ts
```

Learner and Admin login share the login goal while preserving their role policy
and existing response Interfaces. Controllers own refresh cookies. Use cases
own authentication and session persistence; they do not learn Express request
objects or cookie serialization.

Guards and actor extraction are cross-capability Nest infrastructure under
`common`. Actor identity is passed explicitly to capability behavior. Ambient
identity through globals, AsyncLocalStorage, mutable singletons, or a hidden
`auth()` accessor is forbidden.

## Logging and stable error responses

`HttpLoggingInterceptor` attaches or validates `X-Request-Id`, records duration,
and logs successful requests. `AllExceptionsFilter` is the single failure-log
owner and returns `requestId` with the public error body.

Known HTTP/Auth/Prisma mappings preserve their public status, message, error,
and stable code fields. Unexpected messages and stacks remain server-only.
Capability use cases may carry a safe internal cause, but they do not duplicate
the failure log.

Logging recursively redacts keys for passwords, access/refresh tokens, cookies,
sessions, secrets, and authorization headers. Never add raw credentials or
token-derived values to metadata merely to debug an Auth failure.

## Endpoint rate limiting and proxy trust

Global and Auth-specific values are validated at startup. Auth controllers
declare delivery policies; Auth use cases never count requests or learn IP,
request, or throttler storage details.

- Learner/Admin login: independent limits by client IP and normalized login
  identity.
- Registration: limit by client IP.
- Refresh: limit by client IP and a one-way refresh-session tracker, with an IP
  fallback when the token is missing.

Tracker identities are one-way hashes and are never logged. Rejections return
HTTP `429`, code `RATE_LIMIT_EXCEEDED`, `retryAfterSeconds`, and the standard
`Retry-After` header.

`TRUST_PROXY_HOPS` defaults to `0`, so forwarded client-IP headers are ignored
for direct/local traffic. A deployment behind a known proxy sets the exact hop
count. Do not enable broad proxy trust because rate limiting depends on a
correct client identity.

The default Throttler storage is process-local and is valid only while one API
process handles the policy. Before running multiple API replicas, provide a
shared storage Adapter such as Redis; controller policies and Auth use cases do
not change.

## Prisma and offline scripts

TOEIC Grammar source acquisition uses the checksum-approved private workflow
documented in
[`licensed-toeic-grammar-operations.md`](../guides/licensed-toeic-grammar-operations.md).
The inventory, download, and validation commands remain outside the Nest
runtime and do not create a Prisma client. Only the explicit import command
uses `scripts/support/script-prisma.ts` to replace one source-owned snapshot in
a transaction.

The authenticated `module/toeic-grammar` capability exposes the active catalog,
learner-safe practice collections, and immediate server-side grading under
`/toeic/grammar`. Initial question reads omit answer correctness and review-only
enrichment. Answer submission validates snapshot, collection membership, and
option ownership before persisting immutable attempt snapshots and account-owned
source-question progress in one transaction. Grammar progress never uses
browser local storage and survives replacement of database question row IDs.

Source-specific TOEIC vocabulary acquisition remains in the sibling
`scripts/toeic-vocabulary-cache` workflow. It prepares the TOEIC question cache
and does not own or mutate the canonical Vocabulary catalog under
`scripts/vocabulary`.

`@prisma/client` is the only generated Prisma Interface. Generated source does
not live below `src/` and is never edited by hand.

Nest injects `src/database/prisma/prisma.service.ts`. Offline scripts create
their client through `scripts/support/script-prisma.ts`. Both use the same
`resolveDatabaseUrl` configuration boundary but remain separate process
adapters; the script adapter is not a second database owner.

Prisma schema changes require a reviewed migration. `prisma generate` changes
client code only; it does not update PostgreSQL. Migration, reset, push, seed,
enrichment, and synchronization commands are operating actions and are never
run merely to validate architecture.

## Transactions, idempotency, and concurrency

Multi-write goals use explicit Prisma transactions. Placement Test state changes
and learning-progress writes use serializable isolation where partial state or
write skew would violate a product invariant.

Lesson challenge completion is idempotent through the database uniqueness of
`(user_id, challenge_id)`. Points are awarded only when the progress identity is
inserted; retries and concurrent duplicate requests return completion without
awarding points again.

Vocabulary progress records each attempt in a serializable transaction, takes a
PostgreSQL transaction advisory lock for the Learner/Vocabulary identity, and
uses atomic counter increments. This prevents concurrent reviews from
overwriting counters or scheduling state.

Idempotency and concurrency policy require behavioral tests through the goal
Interface. A structural test that finds a transaction string is supporting
evidence, not proof of behavior.

## Runtime configuration

Environment input is validated under `src/config` before application behavior
uses it. Configuration owns database URL, API port/CORS, JWT secrets and expiry,
global/Auth rate limits, proxy hops, and optional offline vocabulary-provider
settings.

Secrets must be distinct and sufficiently strong. Do not read environment
variables ad hoc throughout capability code; add validated configuration to its
runtime owner. [Environment configuration](../guides/environment-configuration.md)
owns the variable table, public/private boundary, database resolution order,
secret handling, and deployment examples.

## Naming and folder rules

- Capability folders use stable domain nouns such as `courses`, `practice`,
  `placement-test`, and `vocabulary`.
- Files/folders use kebab-case; exported classes use PascalCase; values use
  camelCase.
- Use `.controller.ts`, `.module.ts`, `.service.ts`, `.use-case.ts`, `.dto.ts`,
  and `.mapper.ts` only when the suffix communicates the file's actual role.
- Existing Auth `*.usecase.ts` filenames are compatibility names; new
  capability use cases follow the repository's `*.use-case.ts` convention.
- `common` contains cross-capability Nest delivery infrastructure, not domain
  helpers that lack an owner.
- `config` contains validated runtime configuration, not arbitrary constants.

## Verification and safety

- `pnpm --filter @repo/api architecture:check` checks source roots, Auth
  boundaries, domain locality, flat goals, explicit list queries, and Shared
  imports.
- `pnpm --filter @repo/api test` checks public behavior and delivery contracts.
- `pnpm --filter @repo/api check-types`, `lint`, and `build` verify compilation
  and static constraints.
- Run repository-wide gates before handoff.
- Do not run database or vocabulary-provider writes during architecture work.
