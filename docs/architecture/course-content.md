# Course Content Architecture

Course content is the repository's worked capability example. Use its ownership
and Interface rules when evaluating another capability; do not copy
Course-specific controllers, resources, or hierarchy into unrelated domains.

## Domain hierarchy and owner

```text
Course
  -> Unit
      -> Lesson
          -> Lesson challenge
              -> Challenge option
```

`CoursesModule` owns this hierarchy in the API. Ownership includes both learner
read flows and Admin management CRUD. "Admin" describes a caller/delivery
surface, not a second owner of Course behavior.

## Runtime layout

```text
apps/api/src/module/courses/
  index.ts
  courses.module.ts
  courses.controller.ts          learner delivery
  courses.service.ts             learner behavior
  units.controller.ts
  lessons.controller.ts
  leaderboard.controller.ts
  admin-courses.controller.ts
  admin-units.controller.ts
  admin-lessons.controller.ts
  admin-challenges.controller.ts
  admin-challenge-options.controller.ts
  admin-list-response.ts
  dto/course-content-management.dto.ts
  mappers/course-content.mapper.ts
  use-cases/
    list-admin-courses.use-case.ts
    get-admin-course.use-case.ts
    create-admin-course.use-case.ts
    update-admin-course.use-case.ts
    remove-admin-course.use-case.ts
    ...same five explicit goals for units, lessons, challenges, options
  tests/*.spec.ts

apps/admin/app/features/courses/
  api/
    course.api.ts
    unit.api.ts
    lesson.api.ts
    challenge.api.ts
    challenge-option.api.ts
  hooks/use-*.ts
  types/course-management.types.ts
  tests/

apps/admin/app/views/
  courses/CoursesView.tsx
  units/UnitsView.tsx
  lessons/LessonsView.tsx
  challenges/ChallengesView.tsx
  challenge-options/ChallengeOptionsView.tsx

packages/shared/src/
  constants/course.ts
  types/common.ts
  types/course.ts
  index.ts                       root public Interface
```

The Shared import is:

```ts
import {
  LESSON_CHALLENGE_TYPES,
  type Course,
  type CreateCoursePayload,
} from "@repo/shared";
```

Do not import from a private Shared source path or create a Course capability
subpath. `src/contracts.ts`, `*.contract.ts`, Shared Zod wire schemas, and
compatibility forwarding barrels are forbidden.

## Contract boundary

`types/course.ts` describes compile-time wire shapes:

- entity response types;
- create/update Payload types;
- paginated Response types;
- Admin QueryParams types.

`constants/course.ts` owns the challenge value arrays used at runtime. API
`class-validator` DTO classes validate incoming HTTP bodies and implement the
Shared Payload types, but remain Nest-specific. API mappers declare explicit
Shared return types and translate Prisma snake_case fields such as `course_id`,
`image_src`, and `vocabulary_item_id` to camelCase wire fields.

Admin resource modules use typed HTTP envelopes and do not Zod-parse Course
responses. This is an intentional TypeScript-only trade-off: API mapper tests
lock the producer shape, while Admin resource tests lock endpoints, payloads,
pagination, and unchanged response delivery.

Admin-local types may add presentation relationships such as a course title
on a Unit row. Those fields are not guaranteed HTTP response fields and do not
belong in Shared.

## Management HTTP Interface

The following resource names are supported under `/admin`:

- `courses`
- `units`
- `lessons`
- `challenges`
- `challengeOptions`

Each resource supports GET detail/list, POST create, PUT update, and DELETE. The
camelCase `challengeOptions` spelling and PUT updates are compatibility
constraints. Do not normalize them during folder or naming refactors.

Each route delegates to one goal-named use case. A plural aggregate such as
`CourseContentManagementUseCases` is forbidden because it hides 25 independent
change reasons behind one broad Interface. These use cases call their Prisma
Adapter and mapper directly; there is no pass-through facade retained for
compatibility. Shared list response formatting is delivery behavior and remains
in `admin-list-response.ts`, not in a business use case.

### `listPage` and `listAll`

List response shape is selected by the presence of the raw `page` query key:

| Request                              | Response                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `GET /admin/courses?page=2&limit=20` | `{ data, pagination: { total, page, limit, totalPages, hasNext, hasPrev } }` |
| `GET /admin/courses`                 | raw Course array plus `Content-Range`                                        |

The same rule applies to all five management resources. Admin exposes distinct
`listPage` and `listAll` client capabilities where lookup screens need both; they
must not be merged based only on their identical GET path. The raw-array response
is intentional for parent selectors and compatibility consumers.

For an empty non-paged result, the compatibility header remains
`Content-Range: items 0-0/0`.

### Search compatibility

Admin may send `search`; older callers may send `q`. `FilterParse` accepts both
and maps the validated query into a neutral `listQuery` Interface. Prisma mapping
belongs to the owning list use case. Paged requests are capped at 100 records.

## Admin Interface and cache behavior

The five Next route files import screen components from `@/app/views/<resource>`.
Views consume hooks from the Course feature; routes do not consume private API
or type files. React Query roots remain stable (`courses`, `units`, `lessons`,
`challenges`, and `challenge-options`) so create/update/delete invalidation keeps
its existing scope.

## Characterization and enforcement

- `packages/shared/test/shared-package-profile.architecture.test.ts` rejects legacy
  contract folders, capability imports, and non-root package exports.
- `packages/shared/test/shared-root-interface.test.ts` and `package-exports.test.ts`
  lock the root types/constants Interface and private-path boundary.
- API management tests lock mapper translation, use-case behavior, controller
  routes, pagination selection, and `Content-Range` behavior.
- Admin feature tests lock endpoint paths, typed response delivery, list
  capabilities, and query-key shapes.
- `apps/admin/test/course-feature-architecture.test.ts` requires feature/view imports,
  resource API files, and rejects the superseded `src/features/courses`,
  `catalog`, and aggregate client layout.
- `pnpm architecture:check` runs repository architecture checks through Turbo.

After a Course change, run the narrow relevant tests and then the repository
`test`, `check-types`, `lint`, and `build` gates. Do not run data or database write
commands as part of an architecture migration.
