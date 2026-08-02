# Agent Workflow

This repository uses a capability-first architecture. Start with `CONTEXT.md`
and `docs/README.md`, then read the relevant current architecture document and
accepted ADR before changing an owned capability or public Interface.

## Required reading

- `CONTEXT.md` defines domain language and stable compatibility constraints.
- `docs/README.md` maps each subject to its canonical document.
- `docs/architecture/codebase-structure.md` defines workspace ownership and
  dependency direction.
- `docs/architecture/frontend.md` defines Web/Admin placement, browser data flow,
  localization, and UI ownership.
- `docs/architecture/api.md` defines Nest capability ownership, Auth delivery,
  Prisma, errors, rate limits, and transaction rules.
- `docs/guides/verification.md` defines narrow and full verification gates.
- `docs/guides/environment-configuration.md` defines environment ownership,
  database URL resolution, and the public/private boundary.
- `docs/guides/ci-cd.md` defines CI gates, GHCR image publication, and the
  publish-not-deploy boundary.
- `docs/data/vocabulary-pipeline.md` is required reading before changing
  vocabulary source data or running data scripts.

## Runtime ownership

- `apps/web`: learner-facing Next.js runtime.
- `apps/admin`: management Next.js runtime.
- `apps/api`: NestJS runtime, Prisma, PostgreSQL, business behavior, and data scripts.
- `packages/shared`: cross-runtime TypeScript types and framework-neutral constants.
- `packages/ui`: exact React presentation primitives shared by Web and Admin.

These package names are fixed by ADR 0011. Do not rename them as part of a
feature refactor.

## Capability-first ownership

- Web and Admin follow the feature/view frontend profile: domain adapters and hooks live
  under `app/features/<capability>`, while route-level screens live under
  `app/views`.
- Organize backend behavior under its owning `src/module/<capability>` folder.
  The singular `module` path is the current repository path; a mass rename is a
  separate mechanical migration.
- Technical folders such as `api`, `hooks`, `types`, `mappers`, and `tests`
  remain subordinate to a business owner.
- Do not add frontend domain code to legacy `src/modules`, `src/views`,
  `src/services`, `src/stores`, `src/types`, or `src/constants` buckets.
  `app/views` is an intentional screen-composition layer, not that legacy technical
  bucket.
- In Admin and Web, browser transport belongs to Auth under
  `app/features/auth/api`; other features consume that transport through their
  resource `.api.ts` modules.
- Do not create `platform`, `app/lib/http`, `*.server.ts`,
  `*.client.ts`, `api-request.server.ts`, or `api-request.client.ts` for
  authenticated resource data.
- Cross-cutting infrastructure may remain only in clearly framework-owned
  locations. Browser authentication/session transport is owned by each
  runtime's Auth feature rather than a root technical bucket.

## Frontend conventions

- Keep `app/**/page.tsx` and route layouts thin. In the feature/view profile, a
  route imports its screen from `@/app/views/<resource>/<Resource>View`.
- Web authenticated data flow is:
  `localized route -> app/views -> app/features hook -> resource .api.ts -> app/features/auth/api/web-http-client.ts`.
- Do not fetch authenticated Web data from Server Components with `cookies()` or
  `next/headers`. `next/headers` is reserved for framework infrastructure such
  as next-intl request setup.
- Split HTTP adapters by resource (`course.api.ts`, `unit.api.ts`) when the API
  exposes independent resource Interfaces; do not create an aggregate client
  merely because the resources belong to one hierarchy.
- Keep query keys in the owning resource `.api.ts`, query hooks in the feature's
  `hooks` folder, and UI-only types in its `types` folder.
- A feature root `index.ts` is optional. Add one only when there is a genuine
  public feature Interface; routes in this profile do not require it.
- Import cross-runtime types and constants only from the root `@repo/shared`
  Interface.
- Localized navigation must preserve the active locale. Do not create a
  non-localized implementation route when the canonical route is under `[locale]`.

## Backend conventions

- API follows the capability-owned source profile: `common` for cross-capability Nest
  infrastructure, `config` for validated runtime configuration,
  `database/prisma` for persistence adapters, and `module/<capability>` for
  business owners.
- Import authentication behavior through the `src/module/auth` public Interface;
  do not recreate a root `src/auth` bucket or deep-import Auth use cases.
- Auth controllers delegate to goal-named use cases. Guards and request context
  belong under `src/common` and must not own login/session persistence.
- Use `@prisma/client` as the only generated Prisma Interface. Never edit or
  restore `src/generated/prisma`.
- Controllers receive validated input and call capability behavior; they do not
  query Prisma directly.
- Business behavior belongs to its domain owner regardless of whether the
  caller is Web or Admin. Courses owns learner reads and Course Management CRUD.
- Admin is a caller/authorization mode, not a default backend capability. Put
  Admin delivery in User, Practice, Settings, Courses, or its actual owner.
- Nest injects `PrismaService`; offline scripts use
  `scripts/support/script-prisma.ts`.
- Other capabilities import Vocabulary through `src/module/vocabulary`; its
  public types, mappers, and builders are owned there.
- HTTP failures are logged once by the common exception filter. Do not add
  duplicate use-case error logs or log passwords, tokens, cookies, sessions,
  secrets, or authorization headers.
- Nest request DTOs and Prisma mappers stay in `apps/api`; Prisma models never
  cross the HTTP boundary.
- Introduce repository seams only when there are real interchangeable adapters.
- Do not duplicate course mutations in the Admin backend module.

## Contract conventions

- Cross-runtime TypeScript types live in
  `packages/shared/src/types/<domain>.ts`; runtime constants live in
  `packages/shared/src/constants/<domain>.ts`.
- Shared domain filenames are singular kebab-case. Shared `index.ts` files
  export only and contain no behavior or type declarations.
- Consumers import only from `@repo/shared`. Capability subpaths,
  `src/contracts.ts`, `*.contract.ts`, and Shared Zod wire schemas are forbidden.
- Shared types describe the agreed wire shape at compile time. API mappers and
  Nest DTOs own producer/request validation; mapper and resource tests protect
  behavior at runtime.
- Prisma types, Nest DTO classes, frontend ViewModels, browser transport, Auth
  session behavior, React hooks, and UI do not belong in Shared.

## Change and documentation rules

- Update the canonical document in the same commit when a change affects a
  public Interface, compatibility behavior, ownership rule, operating command,
  data source, or data workflow.
- ADRs record why a durable decision exists. Architecture documents describe
  the resulting current state; guides own repeatable commands.
- Do not copy the same normative rule into multiple documents. Link to its
  canonical owner instead.
- Reference projects and migration history are not architecture vocabulary.
  State the English Base requirement and its trade-off directly.
- Do not introduce ad hoc environment reads. Follow the canonical environment
  guide and keep frontend variables public-only, API reads at configuration
  boundaries, and secrets out of build arguments.

## Verification

Run the narrowest relevant command while developing, then run all gates before handoff:

```bash
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

See `docs/guides/verification.md` for test-layer responsibilities and the
standalone vocabulary workflow command.

Course Management also has Shared Interface, API mapper/service/controller,
resource API, query-key, and import-boundary characterization tests. Preserve
observable HTTP and cache behavior while moving implementation.

Vocabulary pipeline changes must also run the standalone catalog, seed-data,
Topic classification, and Topic expansion tests documented in
`docs/data/vocabulary-pipeline.md`.

## Vocabulary data safety

The only versioned vocabulary sources are the canonical catalog, Topic
taxonomy, prompts, and deliberate human review decisions. `working/` and
`backups/` are local generated artifacts. Do not run `db:seed:dev`, `db:push`,
`db:migrate:reset`, Vocabulary bootstrap `dry-run`/`apply`, enrichment,
AI-provider, normalization sync, or POS sync during architecture refactors.
Database and provider writes require explicit user confirmation.
