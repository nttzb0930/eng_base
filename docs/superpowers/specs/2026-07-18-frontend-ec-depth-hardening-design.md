# Frontend EC-Depth Hardening Design

## Status

Approved for sequential implementation on 2026-07-18.

## Goal

Finish the EC-derived Web and Admin refactor without changing the accepted
`app/features` + `app/views` filesystem profile. Close verification gaps first,
then deepen the modules whose behavior is still duplicated or misplaced.

## Constraints

- Preserve all existing routes, request methods, response shapes, query keys,
  localization behavior, and visible learner/Admin behavior.
- Do not restore `apps/web/src` or `apps/admin/src`.
- Do not add `platform`, authenticated Server Component HTTP, capability
  subpaths under `@repo/shared`, or Shared runtime response validation.
- Keep browser transport owned by Auth under `app/features/auth/api`.
- Keep route `page.tsx` files explicit and thin.
- Work sequentially and verify after every checkpoint.
- Do not touch the unrelated API/vocabulary/data changes in the main checkout.

## Decisions

### 1. Make the Web test command the real test seam

`@repo/web test` must run both root architecture/route tests and feature-owned
resource tests. An architecture test will scan for `.test.ts` files and prove
that the package script includes every supported test root. This prevents a
green command from silently omitting feature behavior.

### 2. Separate Auth bootstrap from route-aware redirection

The learner refresh session is initialized once per mounted Providers tree.
Changing `pathname` may update the unauthenticated redirect target, but must not
trigger another bootstrap refresh. The implementation will expose a focused,
testable Auth initializer module behind the existing root `Providers` module;
there will be no new root folder and no `AuthSessionProvider` convention.

### 3. Update active architecture documentation

`AGENTS.md`, `CONTEXT.md`, and active architecture/frontend guides will describe
the current implementation:

- transport lives in `app/features/auth/api`;
- consumers import Shared declarations from root `@repo/shared`;
- `packages/ui` owns exact cross-runtime presentation primitives;
- historical specs/plans remain historical and are not rewritten.

### 4. Deepen learner-session orchestration

Practice, Review, and Lesson remain separate domain owners. Their repeated
question lifecycle becomes one Web-owned learning-session implementation:

1. select current challenge;
2. accept an answer;
3. calculate feedback state;
4. accumulate reviewed items and counts;
5. persist a completed session once;
6. expose completion state to mode-specific presentation.

Mode-specific answer controls, challenge loading, scoring rules, vocabulary
actions, audio behavior, and endpoint calls remain owned by their current
features. The shared module must earn its seam through the existing independent
Practice, Review, and Lesson adapters; it must not become a generic speculative
framework.

### 5. Restore Course Management UI locality

Admin Views remain screen composition modules. Course-owned editor dialogs,
resource tables, form state, and mutation feedback move under
`app/features/courses/components`. Courses, Units, Lessons, Challenges, and
Challenge Options remain independently addressed resources with their existing
`.api.ts` and hook modules.

The migration proceeds one resource at a time. Each View must remain usable and
testable at every checkpoint.

### 6. Deepen the Admin shell

The dashboard route layout will compose focused Admin shell modules. Navigation
configuration, pathname-to-title mapping, sidebar presentation/state, account
menu, and logout behavior move out of the route layout into `app/components`
and `app/store` where they are shared across all Admin routes. This matches the
EC composition pattern without copying EC-specific ecommerce navigation.

## Error and Session Behavior

- Learner refresh failures continue clearing the in-memory session and setting
  status to `unauthenticated`.
- A protected resource 401 continues attempting one refresh and one retry.
- Admin 401/403 continues clearing Admin storage and redirecting to `/login`.
- No password, token, cookie, or session value is logged.
- Refactoring must not introduce new error contracts or toast copy changes.

## Verification Strategy

Every behavior change follows red-green-refactor:

- first add a test that fails for the current implementation;
- run the narrow test and confirm the expected failure;
- implement the minimum change;
- run the narrow test and the affected package gates;
- commit the checkpoint before starting the next one.

Final gates:

```text
pnpm architecture:check
pnpm --filter @repo/web test
pnpm --filter @repo/admin test
pnpm --filter @repo/ui test
pnpm --filter @repo/web check-types
pnpm --filter @repo/admin check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/admin lint
pnpm --filter @repo/web build
pnpm --filter @repo/admin build
```

## Non-goals

- No API, Prisma, migration, vocabulary dataset, or seed refactor.
- No redesign or visual behavior change.
- No attempt to move every UI primitive into `packages/ui`; only exact shared
  implementations qualify.
- No Redis, Server Component authenticated fetching, or new state library.
- No mass rename of routes, features, Views, DTOs, or wire fields.
