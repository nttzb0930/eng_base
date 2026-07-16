# Backend Folder Structure

This document replaces the former mojibake/scaffold-heavy guide. The NestJS API
follows **Web Base Standard 1.2.0**: organize by business capability first and add
technical layers only when behavior requires them.

## Current API tree

```text
apps/api/src/
  auth/                         authentication infrastructure
  db/                           low-level database adapter helpers
  prisma/                       Nest Prisma module/service
  generated/                    generated Prisma client/models
  module/
    <capability>/
      index.ts                  public module Interface
      <capability>.module.ts     Nest composition root
      *.controller.ts           delivery adapters
      *.service.ts              capability behavior
      dto/ or <subcapability>/   private implementation
      *.test.ts
  support/                      cross-capability Nest infrastructure
  app.module.ts
  main.ts
```

The repository currently uses `src/module` (singular). Do not combine an
ownership refactor with a repository-wide rename to `modules`; that move is a
separate mechanical migration.

## Capability ownership

A module is a business owner, not merely a route group. The Courses capability
owns Course -> Unit -> Lesson -> Lesson challenge -> Challenge option behavior
for both learner and Admin callers. Admin authorization and `/admin` routes are
delivery concerns; they do not transfer mutations to a generic Admin owner.

Cross-module consumers import a capability's public `index.ts` when available.
Do not deep-import private management, DTO, mapper, or test files.

## Pragmatic module depth

Start with the smallest deep module that keeps decisions local:

```text
controller -> capability service -> Prisma
     |                 |
     -> HTTP DTO       -> persistence/wire mapper
```

- Controllers parse/validate delivery input and delegate; no direct Prisma.
- A capability service owns application flow, existence checks, errors, and
  persistence coordination.
- A mapper translates persistence records to JSON-safe wire DTOs and Request
  fields back to persistence naming.
- Nest DTO classes validate HTTP bodies and may implement shared Request types.
- Add a repository Interface only when a meaningful replaceable adapter exists.
  Do not create interface/implementation pairs solely to match a diagram.
- Add domain policies/use cases when they concentrate real invariants or multiple
  flows, not for simple CRUD ceremony.

## Type boundary

| Type                           | Location                           | May contain Prisma detail? |
| ------------------------------ | ---------------------------------- | -------------------------- |
| Shared wire DTO/Request/schema | `packages/shared/src/<capability>` | No                         |
| Nest validation DTO            | owning API capability              | No persistence dependency  |
| Prisma record/query/data       | owning API capability              | Yes                        |
| Persistence/wire mapper        | owning API capability              | Yes, internally            |
| Frontend ViewModel             | frontend capability                | Never                      |

Course consumers import the wire Interface from `@repo/shared/courses`.
Database columns such as `image_src` and `course_id` are converted explicitly to
`imageSrc` and `courseId`; a raw Prisma record must never be returned across the
boundary.

## Course Management golden slice

```text
src/module/courses/
  index.ts
  courses.module.ts
  courses.controller.ts
  courses.service.ts
  units.controller.ts
  lessons.controller.ts
  leaderboard.controller.ts
  management/
    course-management.controller.ts
    course-management.dto.ts
    course-management.mapper.ts
    course-management.service.ts
    course-management.controller.test.ts
    course-management.mapper.test.ts
    course-management.service.test.ts
```

The management controller preserves the existing HTTP Interface: list response
shape depends on whether `page` is present, updates use PUT, and
`/admin/challengeOptions` remains camelCase. See
[Course content architecture](architecture/course-content.md).

## Naming

- Capability folders: stable plural domain nouns (`courses`, `users`).
- Semantic child folders: `management`, not generic app-wide `controllers` or
  `services` buckets.
- Files/folders: `kebab-case`.
- Classes: `PascalCase` with boundary suffix (`Controller`, `Service`, `Dto`).
- Tests: colocated `*.test.ts` unless the owning module has a documented test
  folder.

Do not add new domain code to global technical buckets such as
`src/controllers`, `src/services`, `src/repositories`, or `src/types`.

## Verification and safety

Course behavior is characterized through public controller/service/mapper tests.
Run:

```bash
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
```

Architecture work must not run seed, push, migrate, reset, or vocabulary sync
commands without explicit approval.
