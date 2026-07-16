# Codebase Structure

This is the repository profile for **Web Base Standard 1.1.0**. Migration is
incremental: existing behavior may remain in legacy locations, but every new
capability and every touched golden slice must converge on this structure.

## Workspace and runtime owners

```text
apps/
  web/                 learner UI
  admin/               management UI
  api/                 business behavior and database ownership
packages/
  shared/              transitional cross-runtime contracts/constants
  eslint-config/       lint configuration
  typescript-config/   TypeScript configuration
data/                  vocabulary snapshots, proposals, audits, backups
docs/adr/              accepted architecture decisions
```

ADR 0011 fixes these package names. `packages/shared` remains the package name;
"transitional" means its legacy root exports are being split into explicit
capability subpaths, not that a refactor may rename the package.

## Organize by capability, then technology

The first directory below an application source root answers "which business
capability owns this?" Technical detail comes after ownership.

```text
apps/admin/src/features/<capability>/
  index.ts              public feature Interface
  api/                  feature HTTP adapter
  model/                local ViewModels/query keys
  <subcapability>/       screens, hooks, and private components
  tests/

apps/api/src/module/<capability>/
  index.ts              public module Interface
  <capability>.module.ts composition root
  <delivery>.controller.ts
  <behavior>.service.ts
  <subcapability>/
  tests/

packages/shared/src/<capability>/
  index.ts              public contract Interface
  <capability>.contract.ts
```

The API currently uses the singular path `src/module`. Renaming the entire tree
to `modules` is not part of a domain refactor and requires a separate mechanical
change after imports and tests make it safe.

Not every capability needs every technical folder. Add a folder when it makes a
real implementation boundary clearer; do not scaffold repository, use-case, or
domain layers speculatively.

## Public Interfaces

- Next route adapters import only from `@/src/features/<capability>`.
- Other capabilities import an owner's root or documented subcapability barrel,
  not its private files.
- Consumers import Course contracts from `@repo/shared/courses`, whose source
  Interface is `packages/shared/src/courses/index.ts`.
- New contracts are not added to the legacy `@repo/shared` root barrel.
- `index.ts` files export; they do not contain behavior.

## Type ownership

| Shape                                    | Owner                                | Course example                                 |
| ---------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| JSON request/response and runtime schema | `packages/shared` capability subpath | `CourseDtoSchema`, `CreateCourseRequestSchema` |
| HTTP validation class                    | API capability                       | `CourseCreateDto` with `class-validator`       |
| Persistence record/query                 | API capability and Prisma            | `coursesModel`, snake_case columns             |
| Persistence-to-wire mapping              | API capability                       | `mapCourse`, `toCourseData`                    |
| UI presentation/form/table state         | Frontend capability                  | `CourseUnitViewModel`                          |

Wire contracts are JSON boundaries, not domain entities and not database models.
Prisma types must never leak to Admin, Web, or `packages/shared`. A ViewModel may
extend a wire DTO for display, but stays local to the frontend capability.

## Dependency direction

```text
Next route -> feature public Interface -> query/view -> feature HTTP adapter
                                             |
                                             -> @repo/shared/<capability>

Nest controller -> capability service -> Prisma
       |                    |
       -> request DTO       -> persistence/wire mapper
                  both -> @repo/shared/<capability>
```

Controllers do not query Prisma. Shared packages do not import applications.
Repository Interfaces are introduced only when production code has a meaningful
adapter seam; direct Prisma use inside a small, well-tested capability service is
acceptable.

## Naming rules

- Capability folders use a stable plural domain noun: `courses`, `users`.
- Use semantic subcapability names when repetition would obscure meaning:
  `courses/catalog`, not `courses/courses`.
- Files and folders use `kebab-case`; exported React components/classes use
  `PascalCase`; functions and values use `camelCase`.
- Use role suffixes only when they communicate a boundary: `.controller.ts`,
  `.service.ts`, `.dto.ts`, `.mapper.ts`, `.queries.ts`, `.view.tsx`, `.test.ts`.
- Contract response names end in `Dto`; mutation inputs end in `Request`.
- Database naming is mapped explicitly; never rename wire fields to match Prisma.

## Forbidden for new domain code

Do not create app-wide domain buckets such as:

```text
src/views/<domain>
src/services/<domain>
src/types/<domain>
src/constants/<domain>
src/controllers/<domain>
src/repositories/<domain>
```

These paths separate code by technology and scatter one capability. Existing
legacy paths remain valid until their owner is migrated. Cross-cutting framework
infrastructure, for example the existing Admin HTTP transport, may remain in a
clearly infrastructure-owned location.

## Enforcement

`pnpm architecture:check` runs structural and contract boundary checks. Course
Management additionally has:

- shared wire-schema characterization tests;
- API controller, service, and mapper tests;
- Admin HTTP-client and query-key tests;
- an Admin route/import test that rejects Course code in legacy technical buckets.

Run `pnpm test`, `pnpm check-types`, `pnpm lint`, and `pnpm build` before handoff.
Architecture refactors must not run database seed, push, migration, or vocabulary
sync commands.
