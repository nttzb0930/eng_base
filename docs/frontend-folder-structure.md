# Frontend Folder Structure

Web Base standardizes ownership and dependency direction. It does not require
every frontend repository to use one identical source tree. This Admin runtime
uses the EC profile accepted in ADR 0013.

## EC Admin profile

```text
apps/admin/
  app/
    (dashboard)/<resource>/page.tsx
    components/
      data-table/
      feedback/
      ui/
    features/<capability>/
      api/<resource>.api.ts
      hooks/use-<resources>.ts
      types/
      tests/
    views/<resource>/<Resource>View.tsx
    hooks/
    utils/
    providers.tsx
  src/
    services/http/              retained cross-cutting HTTP transport
```

`app/features/courses`, `auth`, `users`, `practice`, and `settings` demonstrate
the migrated profile. `app/views` is the EC screen-composition layer and does
not transfer domain ownership away from the feature owner. Shared presentation
primitives live under `app/components`, `app/hooks`, `app/utils`, and
`app/providers.tsx`. The only retained Admin `src` exception is the existing
`src/services/http` transport.

Do not add new Admin domain code to `src/views` or `src/services/<capability>`.
Those paths are migration history, not valid templates.

## Placement rules

| Code                                   | EC Admin location                                 |
| -------------------------------------- | ------------------------------------------------- |
| Endpoint, parsing, resource query keys | `app/features/<capability>/api/<resource>.api.ts` |
| React Query orchestration              | `app/features/<capability>/hooks/use-*.ts`        |
| UI-only enriched shape                 | `app/features/<capability>/types`                 |
| Route-level screen                     | `app/views/<resource>/<Resource>View.tsx`         |
| Next route adapter                     | `app/**/page.tsx`                                 |
| Cross-feature HTTP transport           | existing `src/services/http` adapter              |
| Cross-runtime JSON contract            | `@repo/shared/<capability>`                       |

Split API files by externally meaningful resource. Course, Unit, Lesson,
Challenge, and Challenge Option have independent HTTP paths, schemas, and cache
roots, so each has its own `.api.ts`. A hierarchy does not by itself justify one
`course-management.client.ts`.

## Route adapters

```tsx
import { CoursesView } from "@/app/views/courses/CoursesView";

export default function CoursesPage() {
  return <CoursesView />;
}
```

Routes stay thin. They do not own API calls, query keys, table configuration, or
form behavior. In this profile, a root feature barrel is optional rather than a
mandatory route Interface.

## Naming

- Business owner folders use stable plural nouns: `courses`, `users`.
- Resource API files use singular nouns: `course.api.ts`, `unit.api.ts`.
- Query hooks use `use-<plural>.ts`; React components use `PascalCase`.
- Add a child folder only when it names a real boundary. Do not invent
  `catalog` merely to avoid a repeated noun.
- Use `types`, `hooks`, and `api` only beneath a known owner; folder names never
  replace ownership reasoning.

The reusable standard may define other profiles, such as a self-contained
`src/features` profile. Choose one profile for a runtime and enforce it; do not
mix profiles within a touched capability.
