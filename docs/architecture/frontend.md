# Frontend Architecture

English Base has two Next.js runtimes. Web owns the localized Learner
experience; Admin owns management workflows. Both use the same ownership model
so a coder learns one placement rule, while authentication state, HTTP clients,
cache state, and presentation remain runtime-local.

## Runtime ownership

```text
apps/web/       Learner routes, localized navigation, learning presentation
apps/admin/     Admin routes, management presentation, React Query coordination
packages/shared TypeScript wire types and framework-neutral constants
packages/ui     exact reusable React primitives shared by Web and Admin
```

Neither frontend imports Prisma, Nest DTO classes, API implementation, or the
other application. Both call `apps/api` through authenticated browser HTTP.

## Environment boundary

Web and Admin read only explicit `NEXT_PUBLIC_APP_NAME`,
`NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_API_URL` values. These values are public
and may be compiled into browser bundles. There is no generic frontend
environment module or Shared application-identity constant; framework
boundaries read their owned public value directly. The canonical file policy,
security rules, and deployment examples live in
[Environment configuration](../guides/environment-configuration.md).

## Feature and view profile

The dependency flow is:

```text
Next route -> app/views -> app/features hook -> resource .api.ts -> Auth-owned HTTP client
```

- A route selects a screen and passes route parameters.
- A View composes the route-level screen from feature and shared presentation.
- A feature owns resource APIs, hooks, local state, ViewModels, and
  capability-specific components.
- A resource API owns endpoint strings, request/response typing, and its query
  key namespace.
- The Auth feature owns bearer-token injection, refresh coordination, session
  clearing, and logout callbacks for its runtime.

`app/views` does not own business behavior. It is allowed because it is a thin
composition layer backed by capability-owned features; it is not a global
technical `src/views` bucket.

## Learner Web layout

```text
apps/web/app/
  [locale]/                    canonical localized Learner routes
  (marketing)/                 non-domain route grouping
  components/                  Web-wide presentation and layout
  features/
    auth/
    courses/
    dashboard/
    flashcards/
    leaderboard/
    learning-session/
    lessons/
    placement-test/
    practice/
    progress/
    review/
    topics/
    vocabulary/
  i18n/                        locale configuration and path helpers
  messages/                    locale message catalogs
  utils/                       demonstrated Web-wide utilities
  views/                       route-level screen composition
  layout.tsx
  providers.tsx
```

Web has no domain `src/` tree. Authenticated learning data is fetched in Client
Components through feature hooks. `next/headers` and request configuration are
reserved for Next.js/next-intl infrastructure; they are not a second domain HTTP
runtime.

Localized Learner routes separate browsing screens from focused learning
sessions without changing their public URLs:

```text
apps/web/app/[locale]/
  (main)/                 navigation-enabled Learner browsing routes
    practice/page.tsx     Practice mode selection
  (session)/              focused full-viewport learning routes
    practice/*            active Practice quizzes
  lesson/                 focused Lesson routes using the same session frame
```

Route groups such as `(main)` and `(session)` do not appear in the URL. Session
routes do not render global navigation or the main page container; their owning
feature supplies focused exit, progress, and completion controls. Authentication
and placement confirmation remain centralized in `LearnerShell` for both route
profiles.

## Admin layout

```text
apps/admin/app/
  (dashboard)/                 authenticated management routes
  login/                       login route
  components/                  Admin-wide presentation and data-table pieces
  features/
    auth/
    courses/
    practice/
    settings/
    users/
  hooks/                       demonstrated cross-capability Admin hooks
  store/                       demonstrated Admin-wide client state
  utils/                       Admin-wide utilities
  views/                       route-level management screens
  layout.tsx
  providers.tsx
```

Admin has no domain `src/` tree. Admin is a caller and authorization mode in the
API, not a backend domain owner. Frontend features are named after the capability
whose data and workflows they present.

## Browser data flow

Web and Admin each own an Auth transport:

```text
apps/web/app/features/auth/api/web-http-client.ts
apps/admin/app/features/auth/api/admin-http-client.ts
```

Resource modules delegate generic request/envelope/session behavior to that
transport and keep capability knowledge local. Do not create `platform/`,
`app/lib/http`, a new frontend `src/services`, or paired domain
`*.server.ts`/`*.client.ts` transports.

A resource API method:

1. accepts a Shared Payload or a feature-local input;
2. calls the runtime Auth transport;
3. preserves the exact HTTP method, path, body, and compatibility behavior;
4. returns typed response data rather than leaking the transport envelope;
5. performs runtime parsing only when the owning runtime has a demonstrated
   boundary requirement.

## Authentication transport

Access-token state is memory/client-session state. Refresh credentials are
HTTP-only cookies owned by API delivery. During bootstrap, each frontend attempts
at most one refresh, clears invalid sessions, and avoids exposing tokens through
logs or application-wide constants.

Auth providers compose session lifecycle; they do not become a general service
locator. Domain features consume the Auth-owned client through their resource
API rather than importing token stores directly.

## Resource APIs and query keys

Use one `.api.ts` file per independently addressed resource. Course, Unit,
Lesson, Challenge, and Challenge Option have different endpoints and cache
identities even though Courses owns their hierarchy. They therefore remain:

```text
app/features/courses/api/course.api.ts
app/features/courses/api/unit.api.ts
app/features/courses/api/lesson.api.ts
app/features/courses/api/challenge.api.ts
app/features/courses/api/challenge-option.api.ts
```

Do not replace these Interfaces with an aggregate
`course-management.client.ts`. Query key factories live with the resource API;
hooks own React Query orchestration and invalidation. Preserve key roots during
file moves so existing caches and mutation invalidation keep their behavior.

Paged and unpaged list capabilities may share an endpoint but remain distinct
when their wire shapes differ. Course Management uses `listPage(query)` for the
pagination envelope and `listAll()` for a raw lookup array.

## Localized navigation

`apps/web/app/[locale]` is the canonical Learner route tree. Links, redirects,
and navigation helpers preserve the active locale. Do not add a second
non-localized implementation route for a localized feature.

Locale setup, messages, and path helpers belong under `app/i18n` and
`app/messages`. Feature code consumes those Interfaces; it does not construct
locale prefixes ad hoc.

## Learning session ownership

`app/features/learning-session` owns the reusable presentation lifecycle shared
by Lesson, Practice, and Review: answer feedback, attempt state, reviewed items,
and one-time completion coordination. It does not own mode-specific scoring,
challenge generation, API endpoints, or persistence policy. Each capability
adapts its own behavior to the shared lifecycle Interface.

## Shared types, ViewModels, and UI primitives

| Concern                                          | Owner                           |
| ------------------------------------------------ | ------------------------------- |
| JSON-safe cross-runtime shape                    | `packages/shared/src/types`     |
| Framework-neutral runtime value                  | `packages/shared/src/constants` |
| UI-only joined or formatted shape                | owning feature `types/`         |
| Reusable React primitive with identical behavior | `packages/ui`                   |
| App-wide layout/navigation/feedback              | owning app `components/`        |
| Capability-specific presentation                 | owning feature `components/`    |

Consumers import Shared declarations only from `@repo/shared` and UI primitives
only from the `@repo/ui` root Interface. `packages/shared` contains no React
hooks, HTTP clients, Auth state, ViewModels, or runtime response schemas.

Move presentation to `packages/ui` only after Web and Admin have an exact shared
implementation and behavior. Similar-looking domain screens remain in their
owners.

## Route template

```tsx
import { CoursesView } from "@/app/views/courses/CoursesView";

export default function CoursesPage() {
  return <CoursesView />;
}
```

Routes do not own API calls, query keys, table configuration, mutation flows,
form behavior, or feature state. A feature root `index.ts` is optional and is
created only for a real public Interface.

## Placement and naming rules

| Code                        | Location                                          |
| --------------------------- | ------------------------------------------------- |
| Endpoint/resource Interface | `app/features/<capability>/api/<resource>.api.ts` |
| Query orchestration         | `app/features/<capability>/hooks/use-*.ts`        |
| Capability client state     | `app/features/<capability>/store/`                |
| UI-only type                | `app/features/<capability>/types/`                |
| Capability component        | `app/features/<capability>/components/`           |
| Route-level composition     | `app/views/<resource>/<Resource>View.tsx`         |
| Next.js adapter             | `app/**/page.tsx`                                 |

- Capability folders use stable domain nouns such as `courses`, `users`,
  `vocabulary`, and `placement-test`.
- Resource API filenames are singular kebab-case and end in `.api.ts`.
- Hooks begin with `use`; React components use `PascalCase`.
- Add `api`, `hooks`, `store`, `types`, or `components` only below a known owner.
- Add semantic child folders only for real workflows or presentation modes, not
  to hide repeated filename prefixes.

## Verification

- `pnpm --filter @repo/web architecture:check` verifies localized routes,
  feature/view placement, Auth transport, learning-session use, and removal of
  legacy roots.
- `pnpm --filter @repo/admin architecture:check` verifies Admin feature/view
  placement, shared UI imports, and Course Management ownership.
- Behavioral tests under each feature protect endpoint, payload, cache-key, and
  session behavior.
- Run the repository architecture, test, type, lint, and build gates before
  handoff.
