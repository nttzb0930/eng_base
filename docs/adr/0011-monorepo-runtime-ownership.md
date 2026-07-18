# ADR 0011: Split Main, Admin, and API Runtimes

## Status

Accepted

## Context

The fork mixed learner routes, React Admin, Next route handlers, Prisma access, domain queries, and dataset scripts in one Next.js root. The product roadmap requires an independently deployable API and admin dashboard.

## Decision

Use a pnpm and Turborepo monorepo:

- apps/web owns the learner-facing Next.js interface.
- apps/admin owns the React Admin interface.
- apps/api owns NestJS, Prisma, PostgreSQL access, domain implementation, and vocabulary scripts.
- packages/shared owns cross-runtime contracts and constants.
- packages/typescript-config and packages/eslint-config own workspace configuration.

Main and admin authenticate through the API-owned auth module. Browser clients store access tokens in their app session state and use API refresh cookies for renewal. They must not import Prisma or access PostgreSQL directly.

## Consequences

- Main, admin, and API can be deployed and scaled independently.
- Database behavior has one owner.
- Shared contracts prevent duplicated view-model shapes.
- Local development requires all three applications for authenticated learning flows.
- Cache invalidation and navigation remain in Next server actions; data mutation remains in NestJS.
