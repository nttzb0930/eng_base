# EC Shared TypeScript-Only Profile Design

## Status

Approved on 2026-07-18 for implementation planning and sequential execution.

## Objective

Refactor `packages/shared` from its transitional capability-contract layout to
the EC TypeScript-only shared profile. Coders should learn one shared-package
convention: domain types live under `src/types`, pure constants live under
`src/constants`, and `src/index.ts` exposes one root `@repo/shared` Interface.

The completed migration removes the monolithic `src/contracts.ts`, Course Zod
wire schemas, capability subpath barrels, and `*.contract.ts` naming. Runtime
JSON behavior, API routes, persistence, and visible Web/Admin behavior remain
unchanged.

## Scope decomposition

This specification covers only shared types, constants, exports, and their
callers. It is the first independent checkpoint in the broader EC shared
profile.

The following are separate follow-up designs because they change different
runtime behavior or presentation ownership:

- moving Web/Admin HTTP and authentication-session behavior into shared
  frontend infrastructure;
- extracting normalized React primitives into `packages/ui`;
- removing the remaining `apps/web/src` and `apps/admin/src` transport roots.

No empty `hooks`, `lib`, `utils`, or `ui` folders are scaffolded in this scope.
They are added only when their separate design proves two real consumers.

## Selected approach

Use the EC shared filesystem and naming profile with TypeScript types only:

```text
packages/shared/
  src/
    constants/
      cefr.ts
      course.ts
      progress.ts
      index.ts
    types/
      common.ts
      course.ts
      learning.ts
      vocabulary.ts
      practice.ts
      review.ts
      flashcard.ts
      dashboard.ts
      progress.ts
      placement-test.ts
      index.ts
    index.ts
```

Domain filenames are singular kebab-case. Public TypeScript names use
PascalCase. `index.ts` files export only; they contain no behavior, schemas, or
type definitions.

The following alternatives were rejected:

- keeping `src/contracts.ts`, because it is a global technical bucket spanning
  unrelated English-learning capabilities;
- converting every capability to Zod schema-first contracts, because the
  selected EC profile is TypeScript-only and Course is currently the sole deep
  runtime-schema exception;
- retaining capability package subpaths such as `@repo/shared/flashcards`,
  because the selected EC reference exposes one shared root Interface;
- moving browser HTTP, hooks, or React UI during this migration, because those
  concerns require separate runtime and design-system decisions.

## Current-state problems

`packages/shared/src/contracts.ts` currently owns Course aliases, learning
records, Vocabulary, Practice, Review, Flashcard, Dashboard, Progress, Topics,
and Placement Test types. Capability `index.ts` files only forward exports back
to that monolith, for example:

```ts
export type { FlashcardSummary } from "../contracts.js";
```

This creates directory names that imply capability ownership while the actual
implementation and change locality remain in one file.

Course Management is inconsistent with every other shared area. It defines Zod
schemas in `courses/course.contract.ts`, derives TypeScript types from those
schemas, and parses Admin responses at runtime. Other capabilities use
TypeScript types without runtime parsing. The repository therefore exposes two
different rules for new shared types.

## Type placement

The monolithic file is split by EC domain type files:

| Current owner or type family | Target file |
| --- | --- |
| Course, Unit, Lesson, Course Management payloads and queries | `types/course.ts` |
| Learner Course/Lesson/Challenge composition and leaderboard | `types/learning.ts` |
| Vocabulary item, saved word, progress, examples, and topics | `types/vocabulary.ts` |
| Practice levels, challenges, and summaries | `types/practice.ts` |
| Review challenges and summaries | `types/review.ts` |
| Flashcard summary | `types/flashcard.ts` |
| Dashboard statistics | `types/dashboard.ts` |
| Challenge and learner progress shapes | `types/progress.ts` |
| Placement Test request/response unions | `types/placement-test.ts` |
| Generic pagination and reusable response metadata | `types/common.ts` |

Cross-file type dependencies use relative imports within the package. Circular
ownership is avoided by placing canonical wire shapes once and importing them
where enriched compositions need them. For example, `learning.ts` imports the
canonical `Course`, `CourseLesson`, and `CourseUnit` types from `course.ts`.

## Naming profile

Course naming changes from schema/DTO terminology to the EC shared type style:

| Current name | Target name |
| --- | --- |
| `CourseDto` | `Course` |
| `CourseUnitDto` | `CourseUnit` |
| `CourseLessonDto` | `CourseLesson` |
| `LessonChallengeDto` | `LessonChallenge` |
| `LessonChallengeOptionDto` | `LessonChallengeOption` |
| `CourseManagementPaginationDto` | `PaginationMetadata` |
| `PaginatedCoursesDto` | `PaginatedCoursesResponse` |
| `CreateCourseRequest` | `CreateCoursePayload` |
| `UpdateCourseRequest` | `UpdateCoursePayload` |
| `CourseManagementPageQuery` | `CourseQueryParams` |

The same `Payload`, `Response`, and `QueryParams` vocabulary applies to Unit,
Lesson, Challenge, and Challenge Option types. Persistence names and Prisma
models do not enter `packages/shared`.

## Constants

Values needed at runtime remain real JavaScript constants rather than being
hidden inside type declarations:

- `CEFR_LEVELS` moves to `constants/cefr.ts`;
- `LESSON_CHALLENGE_TYPES` and `LESSON_CHALLENGE_DIRECTIONS` move to
  `constants/course.ts`;
- `MAX_HEARTS` moves to `constants/progress.ts`.

Union types derive from these constants with indexed access types. Nest DTOs
continue to build their `class-validator` enums from the shared constant arrays.

## Runtime validation decision

Course response validation through Zod is removed from Shared and Admin. This
does not remove database validation or inbound API validation:

- Prisma schema and migrations remain unchanged;
- Nest request DTOs continue to use `class-validator`;
- API environment validation continues to use its API-owned Zod schema;
- shared TypeScript types disappear at runtime and do not inspect HTTP JSON.

The accepted trade-off is that malformed runtime responses are no longer
reported as Zod errors at the Admin transport seam. The migration compensates
with stricter producer and caller tests:

- API wire mappers declare explicit return types imported from
  `@repo/shared`;
- controllers do not return Prisma records directly;
- transport code does not use `any` or unchecked `as <SharedType>` assertions;
- API mapper tests assert exact camelCase JSON shapes;
- Admin resource tests assert endpoint, method, payload, pagination, and
  response behavior using representative fixtures;
- repository type-checking compiles API, Admin, Web, and Shared together.

Tests that specifically expect Zod to reject persistence-shaped responses are
removed or rewritten at the producer mapper seam. TypeScript-only transport
cannot honestly guarantee runtime rejection and must not retain tests that
claim otherwise.

## Public Interface and package exports

`src/types/index.ts` exports all domain type files. `src/constants/index.ts`
exports all constant files. The root Interface is:

```ts
export * from "./constants/index.js";
export * from "./types/index.js";
```

`package.json` exposes only the root `.` entry after all callers migrate. The
capability exports `./courses`, `./vocabulary`, `./practice`, `./review`,
`./placement-test`, `./dashboard`, `./flashcards`, `./progress`, and
`./learning` are removed.

Callers migrate from:

```ts
import type { FlashcardSummary } from "@repo/shared/flashcards";
```

to:

```ts
import type { FlashcardSummary } from "@repo/shared";
```

No permanent compatibility forwarding barrels remain. Temporary forwarding
exports may exist only inside an individual migration step and must be deleted
before the final checkpoint.

## Caller migration

### API

- Course mappers and DTO implementations import the renamed shared types and
  constants from `@repo/shared`.
- Mapper functions expose explicit shared return types.
- Nest DTO decorators remain the runtime request validator.
- API-owned Zod environment validation is untouched.

### Admin

- Course resource adapters remove `zod` imports and `.parse()` calls.
- Typed HTTP results use shared `Payload`, `Response`, and `QueryParams` types.
- `requireCourseManagementData` becomes a type-preserving missing-data guard or
  delegates to the existing `unwrap` Interface; it no longer accepts a schema.
- Every shared import uses the package root.

### Web

- Capability imports move from declared subpaths to `@repo/shared`.
- Runtime behavior and resource adapters remain unchanged.
- The Web HTTP client and Auth session implementation remain in their current
  locations for this checkpoint.

## Dependency changes

- Remove `zod` from `packages/shared` after Course schemas are deleted.
- Remove `zod` from Admin only if a final usage scan proves there are no other
  Admin-owned schemas.
- Keep `zod` in API because environment validation still uses it.
- Do not add Axios, React, Sonner, or browser dependencies to Shared in this
  checkpoint.

## Documentation and decision updates

Implementation updates documentation that currently prescribes capability
subpaths or `*.contract.ts` naming, including:

- `AGENTS.md`;
- `docs/architecture/codebase-structure.md`;
- `docs/frontend-folder-structure.md`;
- Course content architecture documentation;
- ADR 0013 references to `@repo/shared/courses`.

Because this design supersedes accepted shared-contract naming and export
decisions, implementation adds a new ADR instead of rewriting the historical
decision. The ADR records the EC TypeScript-only shared profile and identifies
the superseded sections of earlier ADRs.

## Migration order

1. Add architecture tests for the target tree, package exports, and forbidden
   legacy files/imports; confirm they fail against the current tree.
2. Add `types` and `constants` implementations with root exports while current
   callers still compile.
3. Migrate Shared tests from Zod parsing to type/export and constant behavior.
4. Migrate API Course mappers and DTO type imports.
5. Migrate Admin Course resource adapters and tests away from Zod parsing.
6. Migrate all Web/Admin/API imports to `@repo/shared`.
7. Remove capability subpath exports and forwarding `index.ts` files.
8. Delete `src/contracts.ts`, `courses/course.contract.ts`, and unused Zod
   dependencies.
9. Update docs and add the superseding ADR.
10. Run all repository gates and inspect the final package tree.

## Verification

The migration is complete only when:

- `packages/shared/src/contracts.ts` does not exist;
- no `*.contract.ts` file exists in Shared;
- no Shared capability forwarding directory remains;
- no import uses `@repo/shared/<capability>`;
- Shared contains no Zod runtime dependency;
- Admin Course resources contain no Zod response parsing;
- API mapper tests prove the existing camelCase wire shapes;
- Shared package export tests prove the root Interface and block private paths;
- architecture tests enforce the EC shared filesystem profile;
- all repository gates pass:

```text
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

## Non-goals

- No API endpoint, HTTP method, response field, or pagination behavior changes.
- No Prisma schema, migration, seed, or database write.
- No Web/Admin UI redesign.
- No shared HTTP client or Auth session migration.
- No `packages/ui` extraction.
- No worktree cleanup or merge into `main` as part of implementation.
