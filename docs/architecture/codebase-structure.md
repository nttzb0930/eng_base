# Codebase Structure

English Base organizes code by runtime owner and business capability. Frontend
domain code uses `app/features` for capability implementation and `app/views`
for route-level composition. Root technical buckets such as `src/modules`,
`src/services`, `src/views`, and `src/stores` are not valid frontend owners.

## Workspace and runtime owners

```text
apps/
  web/                 learner UI
  admin/               management UI
  api/                 business behavior and database ownership
packages/
  shared/              cross-runtime TypeScript types/constants
  ui/                  exact React primitives shared by Web and Admin
  eslint-config/       lint configuration
  typescript-config/   TypeScript configuration
data/                  canonical vocabulary sources and local pipeline artifacts
docs/adr/              accepted architecture decisions
```

ADR 0011 fixes these package names. `packages/shared` remains the package name;
ADR 0021 defines its TypeScript-only source profile and root Interface.

## Organize ownership by capability

Ownership is capability-first; physical layout follows a documented runtime
profile. Web and Admin use the feature/view frontend profile, API owns runtime
validation and behavior, and Shared owns framework-neutral declarations and
constants. See [Frontend architecture](frontend.md) and
[API architecture](api.md) for runtime-specific details.

```text
apps/web/app/features/<capability>/
  api/<resource>.api.ts  browser resource HTTP Interface
  hooks/use-*.ts         query orchestration
  components/            feature-owned presentation
  store/                 feature-owned client state
  types/                 local ViewModels and input shapes
  tests/
apps/web/app/views/<resource>/
  <Resource>View.tsx     route-level screen composition
apps/web/app/features/auth/api/
  web-http-client.ts     learner browser/session transport

apps/admin/app/features/<capability>/
  api/<resource>.api.ts  resource HTTP Interface and query keys
  hooks/use-*.ts         query orchestration
  types/                 local ViewModels
  tests/
apps/admin/app/views/<resource>/
  <Resource>View.tsx     route-level screen composition
apps/admin/app/features/auth/api/
  admin-http-client.ts   Admin browser/session transport

apps/api/src/module/<capability>/
  index.ts              public module Interface
  <capability>.module.ts composition root
  <delivery>.controller.ts
  <behavior>.service.ts
  dto/                  when delivery DTOs need grouping
  mappers/              capability-owned translations
  use-cases/            behavior grouping when it adds locality
  tests/

apps/api/src/common/           cross-capability Nest infrastructure
apps/api/src/config/           validated runtime configuration
apps/api/src/database/prisma/  persistence adapters

packages/shared/src/
  constants/
    <domain>.ts         framework-neutral runtime values
    index.ts            constants-only exports
  types/
    <domain>.ts         cross-runtime TypeScript declarations
    index.ts            types-only exports
  index.ts              root package exports only
```

The API currently uses the singular path `src/module`. Renaming the entire tree
to `modules` is not part of a domain refactor and requires a separate mechanical
change after imports and tests make it safe.

The API uses only the generated `@prisma/client` Interface. Generated
persistence source does not live under `src`, and callers do not edit generated
models. Nest runtime uses `src/database/prisma`; offline scripts own their
Adapter under `scripts/support`.

Auth follows a workflow profile inside its capability owner: delivery adapters
delegate to login, register, refresh, and logout use cases. Token/password
services stay behind that Interface. Guards and request context are
cross-capability Nest infrastructure under `src/common`.

Not every capability needs every technical folder. Add a folder when it makes a
real implementation boundary clearer; do not scaffold repository, use-case, or
domain layers speculatively.

## Public Interfaces

- Web and Admin route adapters import their screen from
  `@/app/views/<resource>`.
- Web authenticated API flow is:
  `localized route -> app/views -> app/features hook -> resource .api.ts -> app/features/auth/api/web-http-client.ts`.
- Web does not use authenticated Server Component HTTP. `next/headers` is
  allowed for framework-owned infrastructure such as next-intl request setup,
  not for domain data fetching.
- Feature root barrels are optional. Consumers use the
  documented resource API/hook Interface rather than an artificial aggregate.
- Consumers import cross-runtime types and constants from `@repo/shared`.
- Capability subpaths, `src/contracts.ts`, and `*.contract.ts` are not valid
  Shared destinations.
- `index.ts` files export; they do not contain behavior.

## Type ownership

| Shape                            | Owner                           | Course example                           |
| -------------------------------- | ------------------------------- | ---------------------------------------- |
| Cross-runtime TypeScript shape   | `packages/shared/src/types`     | `Course`, `CreateCoursePayload`          |
| Shared runtime constant          | `packages/shared/src/constants` | `LESSON_CHALLENGE_TYPES`                 |
| HTTP request validation class    | API capability                  | `CourseCreateDto` with `class-validator` |
| Persistence record/query         | API capability and Prisma       | `coursesModel`, snake_case columns       |
| Persistence-to-wire mapping      | API capability                  | `mapCourse`, `toCourseData`              |
| UI presentation/form/table state | Frontend capability             | `CourseUnitViewModel`                    |

Shared wire types are compile-time boundaries, not database models and not
runtime validators. Prisma types must never leak to Admin, Web, or
`packages/shared`. A ViewModel may extend a Shared type for display, but stays
local to the frontend capability.

## Dependency direction

```text
Next route -> app view -> feature hook -> resource API -> transport
                                             |
                                             -> @repo/shared

Nest controller -> capability service -> Prisma
       |                    |
       -> request DTO       -> persistence/wire mapper
                  both -> @repo/shared
```

Controllers do not query Prisma. Shared packages do not import applications.
Repository Interfaces are introduced only when production code has a meaningful
adapter seam; direct Prisma use inside a small, well-tested capability service is
acceptable.

## Naming rules

- Capability folders use a stable plural domain noun: `courses`, `users`.
- Create semantic child folders only for real boundaries; do not invent
  `catalog` solely to avoid repetition.
- Files and folders use `kebab-case`; exported React components/classes use
  `PascalCase`; functions and values use `camelCase`.
- Use role suffixes only when they communicate a boundary: `.controller.ts`,
  `.service.ts`, `.dto.ts`, `.mapper.ts`, `.api.ts`, `.test.ts`.
- Shared entity names use domain nouns; mutation inputs end in `Payload`, list
  outputs end in `Response`, and query inputs end in `QueryParams`.
- Database naming is mapped explicitly; never rename wire fields to match Prisma.

## Forbidden for new domain code

Do not create app-wide domain buckets such as:

```text
src/modules/<domain>     legacy frontend source profile
src/views/<domain>
src/services/<domain>
src/stores/<domain>
src/types/<domain>
src/constants/<domain>
src/controllers/<domain>
src/repositories/<domain>
```

These legacy paths scatter ownership. `app/views` is a thin screen-composition
layer backed by `app/features`; it is not equivalent to legacy `src/views`.
Browser session transport is the documented Auth-owned infrastructure exception
under each runtime's `app/features/auth/api` folder.

## Enforcement

`pnpm architecture:check` runs structural and contract boundary checks. Course
Management additionally has:

- Shared root-export and filesystem architecture tests;
- API controller, service, and mapper tests;
- Admin resource API and query-key tests;
- an Admin route/import test that enforces the feature/view profile.
- Web route/import and feature-architecture tests that reject legacy frontend
  buckets and authenticated server HTTP.
- an API source-profile test that rejects split Auth/Prisma/support roots and a
  duplicate Prisma generator.
- an Auth architecture test that rejects persistence/crypto in controllers,
  guards inside the Auth owner, and a broad Auth root Interface.
- a domain-ownership test that rejects `module/admin`, `courses/management`,
  and the superseded flat Vocabulary layout.

Run `pnpm test`, `pnpm check-types`, `pnpm lint`, and `pnpm build` before handoff.
Architecture refactors must not run database seed, push, migration, or vocabulary
sync commands.
