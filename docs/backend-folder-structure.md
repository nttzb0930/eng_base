# Backend Folder Structure

The NestJS API follows **Web Base Standard 1.5.0** and the EC API profile
accepted in ADR 0014. Business ownership is capability-first; infrastructure
folders are named by a concrete runtime responsibility.

## API tree

```text
apps/api/src/
  common/
    decorators/                 reusable Nest delivery decorators
    filters/                    centralized exception mapping/logging
    http/                       request metadata
    interceptors/               request lifecycle delivery
    logging/                    structured logger and redaction
  config/
    index.ts                    configuration Interface
    env.validation.ts           startup environment validation
    jwt.config.ts
  database/
    prisma/
      prisma.config.ts          shared adapter construction
      prisma.module.ts          Nest composition
      prisma.service.ts         Nest persistence Adapter
  module/
    auth/                       authentication owner and public Interface
    health/                     health delivery Module
    <capability>/               business owner
  app.module.ts                 Module composition root
  main.ts                       process/bootstrap adapter
apps/api/scripts/support/
  script-prisma.ts              offline-script persistence Adapter
apps/api/scripts/vocabulary/
  catalog/                      canonical catalog owner
  database/                     vocabulary database adapters
  dictionary-enrichment/        dictionary lookup workflows
  normalization/                meaning/example normalization
  pos-correction/               part-of-speech correction
  topic-classification/         existing-word classification
  topic-expansion/              review-gated new-word proposals
```

The repository deliberately retains singular `src/module`. Renaming it to
`modules` is a separate mechanical migration, not part of a capability refactor.

## Prisma ownership

`@prisma/client` is the only generated Prisma Interface. Change persistence
models in `prisma/schema.prisma`, run `pnpm --filter @repo/api db:generate`, and
map records inside the owning capability. Never edit or recreate
`src/generated/prisma`.

Nest Modules inject `PrismaService`. Offline vocabulary scripts import
`scripts/support/script-prisma.ts`. Both Adapters share connection construction
through `prisma.config.ts`; neither is a second database owner.

Vocabulary script helpers and tests are colocated with the workflow that owns
them. A generic `scripts/lib` folder and vocabulary scripts at the scripts root
are forbidden. Generated batch/report data is ignored; only canonical sources,
prompts, and human review decisions are versioned.

Prisma records stay API-local and must be mapped before crossing an HTTP wire
Interface. Database columns such as `image_src` and `course_id` are translated
explicitly to contract fields such as `imageSrc` and `courseId`.

## Capability ownership

Authentication behavior is organized under `module/auth` by user goal:
login, registration, refresh, and logout use cases. Token/password services sit
behind those use cases. Guards and request decorators live under `common`
because they are cross-capability Nest delivery infrastructure. A controller
extracts actor identity from its guarded request and passes the identifier
explicitly to actor-dependent behavior. Ambient request identity, including an
AsyncLocalStorage-backed `auth()` helper, is forbidden.

Courses owns Course -> Unit -> Lesson -> Lesson challenge -> Challenge option
behavior for learner and Admin callers. Admin authorization is delivery, not a
second Course owner.

Admin delivery for User, Practice, Settings, and Courses stays inside those
owners. A generic `module/admin` is forbidden. Vocabulary owns its public types,
mappers, builders, and grouped tests; callers use its root Interface.

HTTP observability is cross-capability infrastructure. The logging interceptor
owns request IDs and successful-request timing; the exception filter owns error
classification and logs each failure once. Capability use cases provide stable
public error codes and may attach safe internal reasons, but must never log
passwords, access/refresh tokens, cookies, or authorization headers.

## Module depth

```text
controller -> capability service -> Prisma Adapter
     |                 |
     -> HTTP DTO       -> persistence/wire mapper
```

- Controllers validate delivery input and delegate; they do not query Prisma.
- Capability behavior owns application flow, existence checks, and persistence
  coordination.
- One use-case class represents one caller/system goal. Do not group unrelated
  list/get/create/update/remove operations into a plural management class.
- EC-profile Modules keep goal files flat under `use-cases/`. Workflow folders
  are reserved for real multi-phase workflows, not repeated name prefixes.
- Admin list delivery uses the shared `common/http/admin-list-response.ts`
  implementation. The HTTP query Interface does not expose `prismaQuery`.
- Mappers translate persistence records to JSON-safe wire contracts.
- Add a repository Seam only when at least two real Adapters exist.
- Do not create pass-through Modules, empty layer folders, or app-wide domain
  buckets.

## Verification and safety

Run:

```bash
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
```

Architecture work must not run seed, push, migrate, reset, or vocabulary sync
commands without explicit approval. `db:generate` regenerates client code only;
it does not write database data.
