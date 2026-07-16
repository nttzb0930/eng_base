# Lingo English Learning

Monorepo for the English vocabulary learning product.

## Applications

- apps/web: learner-facing Next.js application on port 3000.
- apps/admin: React Admin hosted by Next.js on port 3001.
- apps/api: NestJS API and the only runtime that accesses PostgreSQL/Prisma, on port 4000.

## Packages

- packages/shared: shared contracts and constants.
- packages/eslint-config: shared ESLint foundations.
- packages/typescript-config: shared TypeScript configurations.

## Setup

    pnpm install
    pnpm db:generate
    pnpm db:push
    pnpm dev

The root .env is loaded by all applications. See .env.example.

## Common commands

    pnpm dev
    pnpm dev:web
    pnpm dev:admin
    pnpm dev:api
    pnpm check-types
    pnpm lint
    pnpm test
    pnpm build
    pnpm db:studio
    pnpm db:seed

Vocabulary build/enrichment commands run from the API workspace:

    pnpm --filter @repo/api data:build-vocab
    pnpm --filter @repo/api data:enrich-audio -- --limit all
    pnpm --filter @repo/api data:enrich-examples -- --limit all
    pnpm --filter @repo/api data:seed-topics

## Runtime ownership

apps/web and apps/admin authenticate through the NestJS JWT/refresh-token flow and call the API using bearer tokens. Prisma schema, generated client, database mutations, learning queries, review scheduling, and data scripts belong to apps/api.

Architecture vocabulary and placement rules are documented in `CONTEXT.md`, `AGENTS.md`, `docs/architecture/codebase-structure.md`, and `docs/adr/`.
