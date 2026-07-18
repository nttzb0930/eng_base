# ADR 0011: Split Main, Admin, and API Runtimes

## Status

Accepted

## Context

Learner routes, Admin UI, HTTP delivery, persistence, and dataset scripts have
different runtime and deployment responsibilities. Keeping them in one
application would allow browser code to depend on database details and make
ownership difficult to enforce.

## Decision

Use a pnpm and Turborepo monorepo:

- apps/web owns the learner-facing Next.js interface.
- apps/admin owns the React Admin interface.
- apps/api owns NestJS, Prisma, PostgreSQL access, domain implementation, and vocabulary scripts.
- packages/shared owns framework-neutral cross-runtime TypeScript types and constants.
- packages/ui owns reusable React presentation primitives.
- packages/typescript-config and packages/eslint-config own workspace configuration.

Main and admin authenticate through the API-owned auth module. Browser clients store access tokens in their app session state and use API refresh cookies for renewal. They must not import Prisma or access PostgreSQL directly.

## Consequences

- Web, Admin, and API can be deployed and scaled independently.
- Database behavior has one owner.
- Shared root types prevent duplicated wire shapes without owning validation.
- Local development requires all three applications for authenticated learning flows.
- Browser data fetching, mutation, and cache invalidation use feature-owned
  React Query adapters. Business mutation remains in NestJS.
