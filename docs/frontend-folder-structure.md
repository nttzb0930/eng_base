# Frontend Folder Structure

Web Base standardizes ownership and dependency direction. In this repository,
both learner Web and Admin use the EC-derived frontend profile:

```text
route -> app/views -> app/features hook -> resource .api.ts -> transport
```

Routes stay thin. Views compose screens. Features own capability behavior,
query hooks, API adapters, types, local state, and feature-owned components.

## Learner Web profile

```text
apps/web/
  app/
    [locale]/**/page.tsx
    components/
      feedback/
      layout/
      navigation/
      ui/
    features/<capability>/
      api/<resource>.api.ts
      hooks/use-*.ts
      components/
      store/
      types/
      tests/
    views/<resource>/<Resource>View.tsx
    i18n/
    messages/
    providers.tsx
    schema/
    store/
    utils/
  src/
    lib/web-http-client.ts        retained browser HTTP transport only
```

Authenticated Web data is browser-only. Do not add `*.server.ts`,
`*.client.ts`, `api-request.server.ts`, `api-request.client.ts`, `platform`, or
`app/lib/http`. Do not reintroduce authenticated fetching through `cookies()` or
`next/headers`; those are reserved for framework infrastructure such as
next-intl request setup.

Every resource keeps its own external HTTP Interface:

```text
app/features/courses/api/course.api.ts
app/features/courses/api/unit.api.ts
app/features/lessons/api/lesson.api.ts
app/features/progress/api/progress.api.ts
app/features/topics/api/topic.api.ts
app/features/vocabulary/api/vocabulary.api.ts
app/features/review/api/review.api.ts
app/features/flashcards/api/flashcard.api.ts
app/features/practice/api/practice.api.ts
app/features/placement-test/api/placement-test.api.ts
```

There is no `learning` aggregate API in Web. Course, Unit, Lesson, Progress,
Topic, Vocabulary, Review, Flashcard, Practice, and Placement Test are separate
resource Interfaces because they have separate endpoints and cache roots.

## Admin profile

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
      hooks/use-*.ts
      types/
      tests/
    views/<resource>/<Resource>View.tsx
    hooks/
    utils/
    providers.tsx
  src/
    services/http/                retained Admin HTTP transport
```

`app/views` is the EC screen-composition layer and does not transfer domain
ownership away from the feature owner. Shared presentation primitives live under
`app/components`, `app/hooks`, `app/utils`, and `app/providers.tsx`.

Do not add frontend domain code to legacy `src/views`, `src/services`,
`src/modules`, or `src/stores`. Those paths are migration history, not valid
templates.

## Placement rules

| Code                                   | EC location                                      |
| -------------------------------------- | ------------------------------------------------ |
| Endpoint and resource API              | `app/features/<capability>/api/<resource>.api.ts` |
| Query keys and React Query orchestration | `app/features/<capability>/hooks/use-*.ts`      |
| UI-only enriched shape                 | `app/features/<capability>/types`                |
| Feature-owned state                    | `app/features/<capability>/store`                |
| Feature-owned component                | `app/features/<capability>/components`           |
| Route-level screen                     | `app/views/<resource>/<Resource>View.tsx`        |
| Next route adapter                     | `app/**/page.tsx`                                |
| Cross-runtime TypeScript type/constant | root `@repo/shared`                              |

Split API files by externally meaningful resource. Course, Unit, Lesson,
Challenge, and Challenge Option have independent HTTP paths, shapes, and cache
roots, so each has its own `.api.ts`. A hierarchy does not justify one broad
`course-management.client.ts`.

## Route adapters

```tsx
import { CoursesView } from "@/app/views/courses/CoursesView";

export default function CoursesPage() {
  return <CoursesView />;
}
```

Routes do not own API calls, query keys, table configuration, mutation flows, or
form behavior. A root feature barrel is optional; routes do not need one.

## Naming

- Business owner folders use stable plural nouns: `courses`, `users`,
  `vocabulary`, `placement-test`.
- Resource API files use singular nouns: `course.api.ts`, `unit.api.ts`,
  `lesson.api.ts`, `progress.api.ts`.
- Query hooks use `use-<resource>.ts`; React components use `PascalCase`.
- Add a child folder only when it names a real boundary. Do not invent
  `catalog`, `management`, or `platform` merely to organize technical concerns.
- Use `types`, `hooks`, `store`, `components`, and `api` only beneath a known
  owner; folder names never replace ownership reasoning.

Choose one profile for a runtime and enforce it. Do not mix `src/features`,
`app/features`, global `src/services`, and server/client adapter pairs within the
same touched capability.
