# ADR 0012: Course Content Capability Boundary

## Status

Accepted; Admin filesystem details amended by ADR 0013

## Context

Course, Unit, Lesson, Lesson challenge, and Challenge option behavior was split
between the generic Admin backend module, frontend-wide `views` and `services`
buckets, Prisma records, and a monolithic shared contract. That layout made one
business hierarchy difficult to discover and encouraged new projects to copy
technical folders instead of an ownership model.

The migration must retain the current HTTP Interface because Admin behavior and
existing clients depend on its pagination and route details.

## Decision

Adopt the Course content hierarchy as the **Web Base Standard 1.3.0 golden
slice**.

- Courses is the API domain owner for learner reads and Admin management CRUD.
- API management delivery, validation, behavior, mapping, and tests live under
  `apps/api/src/module/courses/management` and are composed by `CoursesModule`.
- Admin Course Management follows the EC Admin profile recorded in ADR 0013.
- The public wire Interface is `@repo/shared/courses`, sourced from
  `packages/shared/src/courses/index.ts` and `course.contract.ts`.
- Nest validation DTOs implement shared request shapes but remain API-local.
- Prisma models and snake_case mapping remain API-local. Admin-enriched
  ViewModels remain feature-local.
- Package names stay as accepted in ADR 0011. `packages/shared` is migrated by
  capability subpath, not renamed.

The existing HTTP Interface is preserved:

- `page` present: return `{ data, pagination }`.
- `page` absent: return a raw array and `Content-Range`.
- Updates use `PUT`.
- `/admin/challengeOptions` retains its camelCase spelling.
- The Admin `search` versus API `q` query drift is recorded but not changed in
  this structural refactor.

Migration is incremental. Other API modules and frontend `src/views` or
`src/services` directories remain legacy until separately characterized and
moved.

## Consequences

- One capability has one discoverable owner across runtime-specific
  implementations.
- Contract consumers cannot accidentally depend on Prisma naming or Admin UI
  joins.
- Routes and external clients retain observable behavior.
- Some old and new structures coexist temporarily; architecture checks prevent
  Course Management from moving back into legacy technical buckets.
- Correcting the search query name or normalizing endpoint spelling requires a
  separate compatibility decision and tests.
