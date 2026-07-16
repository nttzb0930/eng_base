# Agent Workflow

This repository follows **Web Base Standard 1.2.0**. Read `CONTEXT.md`, the
relevant document in `docs/architecture/`, and accepted ADRs before changing an
owned capability or a public Interface.

## Runtime ownership

- `apps/web`: learner-facing Next.js runtime.
- `apps/admin`: management Next.js runtime.
- `apps/api`: NestJS runtime, Prisma, PostgreSQL, business behavior, and data scripts.
- `packages/shared`: transitional cross-runtime contract package and framework-neutral constants.

These package names are fixed by ADR 0011. Do not rename them as part of a
feature refactor.

## Capability-first ownership

- Admin follows the EC frontend profile: domain adapters and hooks live under
  `app/features/<capability>`, while route-level screens live under `app/views`.
- Organize backend behavior under its owning `src/module/<capability>` folder.
  The singular `module` path is the current repository path; a mass rename is a
  separate mechanical migration.
- Technical folders such as `api`, `hooks`, `types`, `management`, and `tests`
  remain subordinate to a business owner.
- Do not add new domain code to the legacy `src/views`, `src/services`,
  `src/types`, or `src/constants` buckets. `app/views` is an intentional EC
  composition layer, not that legacy technical bucket.
- Cross-cutting infrastructure may remain in clearly framework-owned locations,
  for example `src/lib` and the existing `src/services/http` adapter.

## Frontend conventions

- Keep `app/**/page.tsx` and route layouts thin. In the Admin EC profile, a route
  imports its screen from `@/app/views/<resource>/<Resource>View`.
- Split HTTP adapters by resource (`course.api.ts`, `unit.api.ts`) when the API
  exposes independent resource Interfaces; do not create an aggregate client
  merely because the resources belong to one hierarchy.
- Keep query keys in the owning resource `.api.ts`, query hooks in the feature's
  `hooks` folder, and UI-only types in its `types` folder.
- A feature root `index.ts` is optional. Add one only when there is a genuine
  public feature Interface; routes in this profile do not require it.
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

Course Management also has contract, API mapper/service/controller, resource
API, query-key, and import-boundary characterization tests. Preserve observable HTTP
and cache behavior while moving implementation.

## Vocabulary data safety

Do not run `db:seed`, `db:push`, `data:sync-vocab-normalization`, or
`data:sync-vocab-pos-correction` during architecture refactors. Database writes
require explicit user confirmation.
