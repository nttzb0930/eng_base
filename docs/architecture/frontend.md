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
    reading/
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
    reading/page.tsx      published A1 passage discovery
  (session)/              focused full-viewport learning routes
    practice/*            active Practice quizzes
    reading/[slug]        passage and comprehension questions
    reading/results/*     persisted Reading attempt result
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
    reading/
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

### Admin styling and presentation

Admin uses a CSS-first Tailwind 4 and Shadcn source profile. The registry at
`apps/admin/components.json` points `components`, `ui`, and `utils` to
`@/app/components`, `@/app/components/ui`, and `@/app/utils/cn`. Global CSS owns
the Tailwind import, shared `packages/ui` source scan, semantic color tokens,
browser scrollbar behavior, and the class-based dark variant; there is no
Admin `tailwind.config.ts`.

Shadcn source used only by Admin stays under `app/components/ui`. Avatar,
Dialog, and Separator remain thin re-exports from `@repo/ui` because Web and
Admin use those exact implementations. Similar primitives are not promoted to
`packages/ui` until their behavior is genuinely identical across runtimes.

The root layout loads Inter explicitly. Normal body and table copy uses weight
400, controls and navigation use 500, and headings use 600. Broad bold or black
weights are not part of the normal management hierarchy. `AdminThemeProvider`
offers light, dark, and system modes through `next-themes`; components consume
semantic classes such as `bg-background`, `bg-card`, `text-foreground`, and
`text-muted-foreground` instead of hard-coded light surfaces.

Admin-wide shell, grouped navigation, page headers, table composition, feedback,
and form composition belong under `app/components`. Capability-specific columns,
editors, dialogs, and workflow presentation stay below their owning feature.
Desktop navigation groups course content, Reading, operations, and system
settings and persists only its collapsed presentation preference. Mobile
navigation uses the shared Sheet primitive; authentication and session data do
not enter the sidebar store.

The Admin Settings route keeps `SettingsView` as a thin composition boundary.
Its typed form, schema, category navigation, loading/error handling, and partial
update behavior belong to `app/features/settings`. Desktop uses vertical tabs,
mobile uses a Select for the same categories, and neither surface exposes
persistence storage keys to operators.

Reading uses the same feature/view profile in both frontends. Admin exposes
`/reading-passages` for nested question authoring and publication. Web exposes a
localized `/reading` list plus focused session/result routes. Display
preferences contain only font scale and line height and are stored defensively
under `reading-display-preferences`; they are not learner progress or a server
contract.

TOEIC Reading uses the Web feature/view profile under
`app/features/toeic-reading` and `app/views/toeic-reading`. The localized main
shell owns `/learn/cert/toeic` and `/learn/cert/toeic/reading`; the focused
session shell owns `/toeic/reading/tests/:testId` and
`/toeic/reading/results/:attemptId`. Each route imports a distinct
layout-matching skeleton rather than a generic page placeholder.

The Full Test session keeps answer selections, review markers, and its
idempotency key in client state. It submits the exact `sourceVersion` received
with the test and does not infer correctness before submission. Result
presentation consumes immutable attempt snapshots and communicates correctness
with icons, text, and border treatment in addition to color.

TOEIC Reading sessions render one active question at a time. Full Test keeps
correctness private until final submission. Part 5, 6, and 7 instead start an
authenticated backend practice session: selecting an option grades that one
question immediately, locks its first graded answer, and reveals only the
returned correctness, correct option, explanation, and available translation.
Previous, Next, and direct question-number controls do not fetch another test.
Part 6 and Part 7 render only the stimulus referenced by the active question.
Part completion remains unavailable until every question has been graded.
Imported stimulus markup is parsed into a strict React-rendered allowlist;
inline styles, event handlers, executable elements, and unsafe image URLs are
discarded. Web never injects TOEIC source HTML with `dangerouslySetInnerHTML`.

Full Test also fetches the authenticated backend draft before initializing
interactive state. Answer, review-marker, and active-question changes enqueue
complete snapshots through a feature-owned serialized queue; only one save is
in flight and rapid pending changes collapse to the newest snapshot. The UI
keeps local state after a save error, reports saving/saved/error status, and
flushes queued work before submission so a late request cannot recreate a
deleted draft. Part practice stores graded answers and navigation state in its
backend session instead. No learner progress is stored in `localStorage`. Test
cards use server-projected progress for answered/remaining counts and their
Continue action.

The Reading browser exposes four URL-backed scopes: Full Test, Part 5, Part 6,
and Part 7. Part 5 is the default. Every scope lists the published tests so the
Learner chooses the exact test before entering a session. Full Test omits the
API Part query and requires all 100 questions; Part scopes pass the selected
Part through cache keys, detail delivery, practice-session persistence, and
back navigation.

Cards render the backend-owned source-set label and test title. Web does not
derive a year from `updatedAt` and does not invent Level 1-5 classifications.
Part 6 and Part 7 retain their stimulus grouping in focused sessions.

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

## TOEIC Listening learner browser

`app/features/toeic-listening` owns the authenticated resource adapter, React
Query cache keys, Full/Part scope parsing and Listening-specific presentation
components. Cache identities include the selected Part so Full Test and Parts
1–4 never share draft, test or attempt state. The localized route remains a thin
adapter to `ToeicListeningListView`; learner progress comes from the backend and
is never reconstructed from `localStorage`.

Listening session routes use the focused learner shell. Protected audio and
images are fetched through the authenticated resource adapter and rendered from
short-lived Blob URLs, so access tokens never appear in media URLs. Full Test
requires an explicit Start gesture, prevents seeking and replay after an asset
ends, and checkpoints playback through the backend draft queue. Part practice
allows replay and seeking. Transcript, translation, explanations and answer
keys are rendered only from immutable result snapshots after submission.

The session uses a two-pane desktop workspace and a stacked mobile layout. The
left pane owns instructions, protected audio, and images; the right pane owns
questions, navigation, and actions. In Part practice, selecting an option calls
the one-question check endpoint and renders accessible correct/incorrect
feedback plus expandable source-provided Listening translation and
catalog-backed vocabulary guidance. Current imported Parts 3–4 provide a
conversation/talk translation rather than a separately translated question.
Part 1–2 additionally render a dedicated answer-translation disclosure from
the labels returned by the check-answer API. This support remains absent from
Full Test before submission.
The Full Test path does not call that endpoint and keeps learning aids hidden
until the result screen.

## TOEIC Grammar learner practice

`app/features/toeic-grammar` owns the authenticated catalog, subtopic lesson,
and practice resources, React Query cache identities, URL parsing, retry-safe
answer state, and Grammar presentation components. `app/views/toeic-grammar`
composes the catalog, lesson detail, and single-question session. Localized
`page.tsx` files remain thin adapters, and every route provides a
layout-specific skeleton.

TOEIC Reading exposes test practice and Grammar practice as sibling modes. The
Grammar catalog keeps its topic, mixed-set, and difficulty selections in the
URL. Progress is projected by the backend for the authenticated learner and is
never reconstructed from browser storage.

Each catalog subtopic opens a localized detail route with URL-backed Lesson and
Practice tabs. Lesson blocks render safe text or structured content without
injecting source HTML. The Practice tab hands off to the existing focused
subtopic session, so option grading, retry idempotency, and progress remain
single-owned rather than duplicated in the lesson view.

The focused Grammar session renders one active question and submits an option
immediately. It does not receive or infer the answer key before grading. A
failed request retains the same submission key for an explicit safe retry;
translation, explanation, correctness, and prepared vocabulary render only
from the grading response. Previous, Next, and direct question-number controls
live in a sticky footer and communicate correct, incorrect, current, and
unanswered states with icons and text in addition to color.

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
