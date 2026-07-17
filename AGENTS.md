# Agent Workflow

This repository follows **Web Base Standard 1.5.0**. Read `CONTEXT.md`, the
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

- Web and Admin follow the EC frontend profile: domain adapters and hooks live
  under `app/features/<capability>`, while route-level screens live under
  `app/views`.
- Organize backend behavior under its owning `src/module/<capability>` folder.
  The singular `module` path is the current repository path; a mass rename is a
  separate mechanical migration.
- Technical folders such as `api`, `hooks`, `types`, `mappers`, and `tests`
  remain subordinate to a business owner.
- Do not add frontend domain code to legacy `src/modules`, `src/views`,
  `src/services`, `src/stores`, `src/types`, or `src/constants` buckets.
  `app/views` is an intentional EC composition layer, not that legacy technical
  bucket.
- In Admin, `src/services/http` is the retained transport exception. Auth,
  Courses, Practice, Settings, and Users behavior belongs under `app/features`
  and their screens belong under `app/views`.
- In Web, `src/lib/web-http-client.ts` is the retained browser transport
  exception. Do not create `platform`, `app/lib/http`, `*.server.ts`,
  `*.client.ts`, `api-request.server.ts`, or `api-request.client.ts` for
  authenticated resource data.
- Cross-cutting infrastructure may remain only in clearly framework-owned
  locations, for example Web `src/lib/web-http-client.ts` and Admin
  `src/services/http`.

## Frontend conventions

- Keep `app/**/page.tsx` and route layouts thin. In the frontend EC profile, a
  route imports its screen from `@/app/views/<resource>/<Resource>View`.
- Web authenticated data flow is:
  `localized route -> app/views -> app/features hook -> resource .api.ts -> src/lib/web-http-client.ts`.
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
- Import Course wire contracts only from `@repo/shared/courses`.
- Localized navigation must preserve the active locale. Do not create a
  non-localized implementation route when the canonical route is under `[locale]`.

## Backend conventions

- API follows the EC source profile: `common` for cross-capability Nest
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
