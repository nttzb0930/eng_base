# ADR 0012: Course Content Capability Boundary

## Status

Accepted; filesystem and Shared interface details amended by ADRs 0013, 0016,
and 0021

## Context

Course, Unit, Lesson, Lesson challenge, and Challenge option behavior was split
between the generic Admin backend module, frontend-wide `views` and `services`
buckets, Prisma records, and a monolithic shared contract. That layout made one
business hierarchy difficult to discover and encouraged new projects to copy
technical folders instead of an ownership model.

The migration must retain the current HTTP Interface because Admin behavior and
existing clients depend on its pagination and route details.

## Decision

Use Course Content as the reference capability for ownership across runtimes.

- Courses is the API domain owner for learner reads and Admin management CRUD.
- API management delivery, validation, behavior, mapping, and tests live under
  the `courses` owner and its `dto`, `mappers`, `use-cases`, and `tests` roles,
  as amended by ADR 0016.
- Admin Course Management follows the feature/view profile recorded in ADR 0013.
- Public wire types are exported from the root `@repo/shared` interface as
  amended by ADR 0021.
- Nest validation DTOs implement shared request shapes but remain API-local.
- Prisma models and snake_case mapping remain API-local. Admin-enriched
  ViewModels remain feature-local.
- Package names stay as accepted in ADR 0011.

The existing HTTP Interface is preserved:

- `page` present: return `{ data, pagination }`.
- `page` absent: return a raw array and `Content-Range`.
- Updates use `PUT`.
- `/admin/challengeOptions` retains its camelCase spelling.
- Admin list delivery accepts both `search` and `q`; the owner maps either key
  into the same neutral list query.

## Consequences

- One capability has one discoverable owner across runtime-specific
  implementations.
- Contract consumers cannot accidentally depend on Prisma naming or Admin UI
  joins.
- Routes and external clients retain observable behavior.
- Architecture checks prevent Course Management from moving into generic Admin
  ownership or nested management buckets.
- Supporting both query names preserves compatibility without exposing Prisma
  query construction to controllers.
