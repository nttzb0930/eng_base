# Backend Folder Structure

The NestJS API follows **Web Base Standard 1.4.0** and the EC API profile
accepted in ADR 0014. Business ownership is capability-first; infrastructure
folders are named by a concrete runtime responsibility.

## API tree

```text
apps/api/src/
  common/
    decorators/                 reusable Nest delivery decorators
    filters/                    cross-capability exception mapping
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

Prisma records stay API-local and must be mapped before crossing an HTTP wire
Interface. Database columns such as `image_src` and `course_id` are translated
explicitly to contract fields such as `imageSrc` and `courseId`.

## Capability ownership

Authentication behavior is organized under `module/auth` by user goal:
login, registration, refresh, and logout use cases. Token/password services sit
behind those use cases. Guards and request context live under `common` because
they are cross-capability Nest delivery infrastructure. Consumers import only
the Auth public Interface rather than private use-case paths.

Courses owns Course -> Unit -> Lesson -> Lesson challenge -> Challenge option
behavior for learner and Admin callers. Admin authorization is delivery, not a
second Course owner.

Admin delivery for User, Practice, Settings, and Courses stays inside those
owners. A generic `module/admin` is forbidden. Vocabulary owns its public types,
mappers, builders, and grouped tests; callers use its root Interface.

## Module depth

```text
controller -> capability service -> Prisma Adapter
     |                 |
     -> HTTP DTO       -> persistence/wire mapper
```

- Controllers validate delivery input and delegate; they do not query Prisma.
- Capability behavior owns application flow, existence checks, and persistence
  coordination.
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
