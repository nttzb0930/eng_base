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

Learner attempts, grading endpoints, and presentation are separate TOEIC
capability behavior; content publication alone does not expose a learner route.

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
