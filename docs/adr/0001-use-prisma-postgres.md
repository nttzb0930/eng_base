# ADR 0001: Use Prisma with PostgreSQL

## Status

Accepted; source layout and generated-client details amended by ADR 0014

## Context

The project needs one relational database workflow for local development and
deployment. The previous Drizzle and hosted-database setup created competing
schema and client conventions.

## Decision

Use Prisma as the source of truth for database schema and data access.

- Schema: `apps/api/prisma/schema.prisma`
- Runtime/script adapters: `apps/api/src/database/prisma`
- Generated client interface: `@prisma/client`
- Local database: PostgreSQL

Drizzle files and config are removed from the active code path.

## Consequences

- `pnpm --filter @repo/api db:migrate` creates and applies development
  migrations.
- `pnpm --filter @repo/api db:migrate:deploy` applies committed migrations.
- `pnpm --filter @repo/api db:studio` opens Prisma Studio.
- `pnpm --filter @repo/api db:seed` loads the canonical English vocabulary
  catalog; it is an explicit data operation, not an application startup step.
- NestJS capability modules hide Prisma details from Web and Admin.
- `db:push` remains available for disposable local exploration but does not
  replace committed migrations.
