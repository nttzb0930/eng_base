# ADR 0001: Use Prisma with PostgreSQL

## Status

Accepted

## Context

The fork originally used Drizzle and Neon-oriented setup. Local development now uses PostgreSQL, and the user wants Prisma Studio and a clearer database workflow.

## Decision

Use Prisma as the source of truth for database schema and data access.

- Schema: apps/api/prisma/schema.prisma
- Client adapter: apps/api/src/db/prisma.ts
- Generated client: apps/api/src/generated/prisma
- Local database: PostgreSQL

Drizzle files and config are removed from the active code path.

## Consequences

- `npm run db:push` maps to `prisma db push`.
- `npm run db:studio` opens Prisma Studio.
- `npm run db:seed` seeds the English Vocabulary dataset.
- NestJS domain modules hide Prisma details from main and admin.
- Main and admin access data only through authenticated HTTP adapters.
