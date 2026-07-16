# Frontend Folder Structure

This document replaces the former mojibake/technical-bucket guide. New frontend
code follows **Web Base Standard 1.1.0** and is organized capability-first.
Existing `src/views` and domain `src/services` folders are legacy migration
sources, not templates for new work.

## Standard tree

```text
apps/<web|admin>/
  app/                          Next.js route adapters and layouts
  src/
    features/
      <capability>/
        index.ts                public feature Interface
        api/                    capability HTTP adapter
        model/                  ViewModels, query keys, local state types
        components/             shared only inside this capability
        <subcapability>/         screen, hooks, private components
        tests/
    components/                 application-wide UI only
    config/                     application configuration
    hooks/                      truly cross-feature hooks in this app
    i18n/                       locale/navigation infrastructure
    lib/                        framework and library adapters
    services/http/              existing cross-feature HTTP transport
```

Create only the folders a capability needs. A small feature may contain one view
and `index.ts`; a large one may have semantic subcapabilities.

## Route adapters

`app/**/page.tsx` is a framework adapter. It imports the capability root and
renders one exported screen:

```tsx
import { CoursesView } from "@/src/features/courses";

export default function CoursesPage() {
  return <CoursesView />;
}
```

A route must not import `api`, `model`, hooks, or a view implementation path.
Keep table columns, request calls, form state, and business rules out of route
files. Localized routes preserve the active locale and remain under `[locale]`
when that is the canonical route.

## Capability Interface

The feature root `index.ts` is the route-facing Interface. Export screen-level
capabilities and intentionally shared subcapability Interfaces only:

```ts
export { CoursesView } from "./catalog";
export { UnitsView } from "./units";
```

Do not put implementation in a barrel. Do not export every internal type or
helper. A sibling that needs a lookup hook imports the documented subcapability
barrel, not a private file several levels deep.

## Placement rules

| Code                                              | Location                                      |
| ------------------------------------------------- | --------------------------------------------- |
| One capability's HTTP paths/parsing               | `features/<capability>/api`                   |
| One capability's query hooks/keys                 | owner or semantic subcapability               |
| UI-only enriched shape                            | `features/<capability>/model`                 |
| Private component                                 | nearest owning subcapability                  |
| UI used across subcapabilities of one owner       | capability `components`                       |
| UI/hook used across unrelated features in one app | app `components` or `hooks`                   |
| Framework/library adapter                         | app `lib` or existing infrastructure location |
| Cross-runtime JSON contract                       | `@repo/shared/<capability>`                   |

Do not promote something merely because two nearby files use it. Prefer
locality, then move it to the smallest common owner when reuse is real.

## Types and contracts

- Wire DTOs and mutation Request types come from a capability package subpath,
  for example `@repo/shared/courses`.
- Zod response schemas validate untrusted API data in the feature client.
- Admin ViewModels remain local. They may add display-only relationships or form
  state and are not API promises.
- Component props normally stay beside the component.
- Frontend code must never import Prisma models or generated API internals.

## Naming

- Use plural domain nouns for top-level capabilities: `courses`, `users`.
- Choose semantic child names: `courses/catalog`, `challenge-options`; avoid
  redundant paths such as `courses/courses`.
- Use `kebab-case` for files/folders and role suffixes only when useful:
  `course.queries.ts`, `courses.view.tsx`, `course-management.client.ts`.
- Use `PascalCase` for React components and `camelCase` for hooks/functions.
- Prefix React hooks with `use`; query-key roots use stable domain names.

## Forbidden for new domain code

Do not create new capability behavior in:

```text
src/views/<capability>
src/services/<capability>
src/types/<capability>
src/constants/<capability>
```

Those app-wide technical buckets scatter a feature. Existing legacy files may
remain until their capability is characterized and migrated. The existing
`src/services/http` transport is cross-cutting infrastructure, not a domain
service, and may be consumed by feature-local clients.

## Course Management reference

`apps/admin/src/features/courses` is the golden slice. It colocates the feature
client, ViewModels, query behavior, screens, and tests while exposing only screen
exports at its root. Its five route pages are checked by
`apps/admin/test/course-feature-architecture.test.ts`.

See [Course content architecture](architecture/course-content.md) for contracts
and compatibility behavior.
