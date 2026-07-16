# Agent Workflow

This repository follows **Web Base Standard 1.1.0**. Read `CONTEXT.md`, the
relevant document in `docs/architecture/`, and accepted ADRs before changing an
owned capability or a public Interface.

## Runtime ownership

- `apps/web`: learner-facing Next.js runtime.
- `apps/admin`: management Next.js runtime.
- `apps/api`: NestJS runtime, Prisma, PostgreSQL, business behavior, and data scripts.
- `packages/shared`: transitional cross-runtime contract package and framework-neutral constants.

These package names are fixed by ADR 0011. Do not rename them as part of a
feature refactor.

## Capability-first source layout

- Organize new frontend behavior under `src/features/<capability>`.
- Organize backend behavior under its owning `src/module/<capability>` folder.
  The singular `module` path is the current repository path; a mass rename is a
  separate mechanical migration.
- Technical folders such as `api`, `model`, `components`, `management`, and
  `tests` are private implementation details inside a capability.
- Do not add new domain code to app-wide `src/views`, `src/services`,
  `src/types`, or `src/constants` buckets. Existing files there are legacy and
  migrate one capability at a time.
- Cross-cutting infrastructure may remain in clearly framework-owned locations,
  for example `src/lib` and the existing `src/services/http` adapter.

## Frontend conventions

- Keep `app/**/page.tsx` and route layouts thin. A route imports a screen from
  the feature root, for example `@/src/features/courses`, never a private file.
- Export the smallest useful public Interface from each feature `index.ts`.
- Keep feature-private UI, React Query hooks, query keys, form state, and
  ViewModels within the owning feature.
- Import Course wire contracts only from `@repo/shared/courses`.
- Localized navigation must preserve the active locale. Do not create a
  non-localized implementation route when the canonical route is under `[locale]`.

## Backend conventions

- Controllers receive validated input and call capability behavior; they do not
  query Prisma directly.
- Business behavior belongs to its domain owner regardless of whether the
  caller is Web or Admin. Courses owns learner reads and Course Management CRUD.
- Nest request DTOs and Prisma mappers stay in `apps/api`; Prisma models never
  cross the HTTP boundary.
- Introduce repository seams only when there are real interchangeable adapters.
- Do not duplicate course mutations in the Admin backend module.

## Contract conventions

- `packages/shared/src/courses/course.contract.ts` defines Course wire DTO,
  request, pagination, and enum schemas.
- `packages/shared/src/courses/index.ts` is its public source Interface;
  consumers import the package subpath `@repo/shared/courses`.
- Shared contracts describe JSON at runtime boundaries. They are not Prisma
  models and not Admin-local ViewModels.
- Do not add new capability contracts to the legacy shared root barrel.

## Verification

Run the narrowest relevant command while developing, then run all gates before handoff:

```bash
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

Course Management also has contract, API mapper/service/controller, client,
query-key, and import-boundary characterization tests. Preserve observable HTTP
and cache behavior while moving implementation.

## Vocabulary data safety

Do not run `db:seed`, `db:push`, `data:sync-vocab-normalization`, or
`data:sync-vocab-pos-correction` during architecture refactors. Database writes
require explicit user confirmation.
