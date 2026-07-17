# Frontend/API Integration

This document replaces the former mojibake examples based on app-wide
`src/services` and `src/views` buckets. New integration follows **Web Base
Standard 1.5.0** and stays inside the owning capability.

## Boundary flow

```text
packages/shared                 TypeScript wire types and constants
             |                               |
             v                               v
API controller -> capability service -> Prisma/mapper
             ^
             |
resource API module <- query hook <- EC view <- Next route adapter
```

Each runtime owns its adapter:

- API owns authentication guards, Nest DTO validation, business behavior,
  Prisma access, and persistence/wire mapping.
- Admin/Web own their HTTP transport configuration, cache behavior, form state,
  ViewModels, and any runtime response validation their boundary actually needs.
- `packages/shared` owns only framework-neutral TypeScript types/constants.

Do not share a frontend service instance between Admin and Web when auth, route
scope, or response visibility differs. Share the wire contract when the actual
HTTP shape is the same.

## Feature-local resource APIs

The Course Management resource Interfaces are:

```text
apps/admin/app/features/courses/api/course.api.ts
apps/admin/app/features/courses/api/unit.api.ts
apps/admin/app/features/courses/api/lesson.api.ts
apps/admin/app/features/courses/api/challenge.api.ts
apps/admin/app/features/courses/api/challenge-option.api.ts
```

Each module delegates bearer-token/envelope transport to the existing
cross-cutting `src/services/http/admin-http-client.ts`, owns the Course endpoint
strings, and types response data with declarations from `@repo/shared`.

Use one API module per independently addressed resource. Do not aggregate these
Interfaces into `course-management.client.ts` merely because they share a domain
hierarchy. Small shared HTTP helpers may remain private inside the capability.

A client method should:

1. accept a Shared Payload type or an explicit feature-local input;
2. call the app's infrastructure HTTP adapter;
3. return typed response data rather than transport/envelope detail;
4. add runtime parsing in the owning runtime only when the boundary requires it;
5. preserve exact compatibility paths and methods.

Views and components do not hardcode endpoint strings. React Query hooks call
resource APIs and own query keys, orchestration, and invalidation.

## Contract versus local types

```text
@repo/shared
  Course                                  wire response type
  CreateCoursePayload                     wire request type
  PaginatedCoursesResponse                wire list response type
  CourseQueryParams                       list query type

apps/api/.../dto/course-content-management.dto.ts  Nest validation classes
apps/api/.../mappers/course-content.mapper.ts      Prisma <-> wire conversion
apps/admin/app/features/.../types/*.ts    Admin-only ViewModels
```

Do not expose Prisma-generated models as API types. Do not add UI-only joined
labels, modal state, selected rows, or form errors to Shared types.

## Course list capabilities

Course Management deliberately exposes two list capabilities on the same GET
resource:

### `listPage(query)`

- Sends `page` and `limit`.
- API selects paged mode by the presence of the raw `page` key.
- Returns `{ data, pagination }`.
- The pagination object contains `total`, `page`, `limit`, `totalPages`,
  `hasNext`, and `hasPrev`.
- Used by management tables and has a query key containing the query object.

### `listAll()`

- Omits `page` entirely.
- API returns a raw array and sets `Content-Range`.
- Used for parent selectors/lookups.
- Has a distinct `[..., "all"]` query key where the Admin exposes it.

Do not merge the methods merely because both send GET to the same path. Their
response shapes and cache capabilities differ. The same API behavior exists for
courses, units, lessons, challenges, and challenge options; the Admin client only
needs `listAll` where a current lookup consumer exists.

## Compatibility map

Relative to the API client's base URL/global prefix, Course Management uses:

| Resource         | Collection path           | Create | Update                            | Delete |
| ---------------- | ------------------------- | ------ | --------------------------------- | ------ |
| Course           | `/admin/courses`          | POST   | `PUT /admin/courses/:id`          | DELETE |
| Unit             | `/admin/units`            | POST   | `PUT /admin/units/:id`            | DELETE |
| Lesson           | `/admin/lessons`          | POST   | `PUT /admin/lessons/:id`          | DELETE |
| Challenge        | `/admin/challenges`       | POST   | `PUT /admin/challenges/:id`       | DELETE |
| Challenge option | `/admin/challengeOptions` | POST   | `PUT /admin/challengeOptions/:id` | DELETE |

PUT and the camelCase `challengeOptions` path are existing public behavior. A
folder rename must not silently change either.

## `search` / `q` compatibility

Admin sends `search`; older callers may send `q`. API `FilterParse` accepts both
and maps them to one validated search predicate. Do not remove either spelling
without a compatibility decision and request/controller/client tests.

## Query keys and invalidation

Keep query keys owned by each resource API and stable across internal moves. Course
Management roots are:

```text
courses
units
lessons
challenges
challenge-options
```

Paged keys append `list` and the query. Lookup keys append `all`. Mutations
invalidate the resource root so both list forms refresh. Query hooks live under
`app/features/courses/hooks`, not in a global hooks bucket.

## Tests

For a new capability, characterize at least:

- exact HTTP method/path/body;
- representative typed response delivery and empty-envelope behavior;
- paged versus raw-array list behavior;
- stable query-key and invalidation scope;
- API request validation and persistence/wire mapping;
- delivery compatibility such as headers and route spelling.

Course examples live in the Admin feature tests, API management tests, and
`packages/shared/test/`. The API mapper test owns camelCase producer evidence;
frontend tests must not claim that TypeScript-only Shared types reject malformed
runtime JSON. Run `pnpm architecture:check` plus the normal repository gates
before handoff.
