# ADR 0016: Keep Admin Delivery and Supporting Roles with the Domain Owner

## Status

Accepted

## Context

The API used `module/admin` as an owner for User, Practice, and Settings
behavior. Course Management was correctly owned by Courses but hidden behind a
generic `management` folder. Vocabulary types were exported by Courses while
Vocabulary implementation was deep-imported by several callers. The offline
Prisma singleton also lived beside the Nest Adapter although only scripts used
it.

## Decision

- Admin is a caller and authorization mode, not a default business owner.
- Remove `module/admin`; preserve existing `/admin/*` HTTP paths.
- Keep Course Management inside Courses under its `dto`, `mappers`,
  `use-cases`, and `tests` roles. Do not recreate `courses/management`.
- Vocabulary owns its public types, mappers, challenge builders, and tests.
  Other capabilities import only the Vocabulary root Interface.
- `@prisma/client` remains the only generated Prisma Interface.
  `PrismaService` is the Nest Adapter; the offline-script Adapter lives at
  `scripts/support/script-prisma.ts`.

## Consequences

- Business changes have locality under one capability owner regardless of the
  caller's role.
- Vocabulary no longer depends on Courses for its own language.
- Architecture checks reject the superseded Admin, Course Management, and
  Vocabulary layouts.
- Routes, wire contracts, Prisma schema, migrations, and stored data do not
  change.
