# EC-Derived Web and Admin Profile Design

## Status

Approved direction; pending written-spec review before implementation planning.

## Objective

Refactor `apps/web` and the remaining legacy capabilities in `apps/admin` to a
single capability-first frontend profile derived from the EC Admin application.
Coders should learn one ownership rule: route files compose Views, Views consume
feature Interfaces, and feature implementation stays under its business owner.

This design covers only `apps/web` and `apps/admin`. It does not reorganize
`apps/api`, change database behavior, or redesign cross-runtime contracts.

## Selected approach

Both runtimes use the EC Admin ownership profile:

```text
Next route -> app/views -> app/features hook -> resource API -> HTTP transport
```

Web authentication and authenticated data loading use the simpler EC browser
profile. Access-token-aware API calls run in the browser after hydration. Web
does not maintain parallel authenticated Server Component and browser HTTP
stacks. Server Components may still own metadata, locale setup, and static or
public rendering; this decision removes only the authenticated server HTTP
path.

The following alternatives were rejected:

- EC Main's app-wide domain `api` and `hooks` buckets, because they scatter
  capability ownership as the English learning domain grows.
- Hybrid authenticated Server Component fetching, because it requires separate
  cookie, refresh, error, and cache behavior for server and browser runtimes.
- A new `platform` or `lib/http` layer under `app`, because neither is part of
  the selected EC frontend profile and the repository already owns a
  cross-cutting browser transport.

## Web filesystem profile

```text
apps/web/
  app/
    (marketing)/
      layout.tsx
      page.tsx
    [locale]/
      (auth)/
      (main)/
      lesson/
      placement-test/
      error.tsx
      layout.tsx
      page.tsx
    features/
      auth/
      courses/
      dashboard/
      flashcards/
      lessons/
      placement-test/
      practice/
      progress/
      review/
      saved-words/
      topics/
      vocabulary/
    views/
    components/
      feedback/
      layout/
      navigation/
      ui/
    hooks/
    schema/
    store/
    utils/
    i18n/
    messages/
    globals.css
    layout.tsx
    providers.tsx
  public/
  src/
    lib/
      web-http-client.ts
  test/
    architecture/
    routing/
  proxy.ts
```

`src/lib/web-http-client.ts` remains the single browser HTTP transport during
this scope. It is cross-cutting runtime infrastructure, not domain code. The
server-only `src/lib/api-client.ts` and the redundant
`src/lib/client-api-request.ts` are not part of the target profile. No new
domain code may be added under `src/modules`, `src/services`, `src/views`, or
`src/stores`.

## Web feature shape

Not every feature must contain every folder. Add a child folder only when the
feature has code with that responsibility.

```text
app/features/courses/
  api/
    course.api.ts
  components/
    CourseCard.tsx
  hooks/
    use-courses.ts
  schema/
    course-filter.schema.ts
  types/
    course-view-model.ts
  tests/
```

Resource API files use singular resource names. A capability with independent
Course, Unit, Lesson, Challenge, and Challenge Option HTTP resources owns one
`.api.ts` file per resource rather than one aggregate management client.

Web does not add `course.server.ts`, `course.client.ts`,
`api-request.server.ts`, or `api-request.client.ts`. A resource uses one browser
adapter such as `course.api.ts`.

## Admin filesystem profile

```text
apps/admin/
  app/
    (dashboard)/
    login/
    features/
      auth/
      courses/
      practice/
      settings/
      users/
    views/
    components/
      data-table/
      feedback/
      layout/
      ui/
    hooks/
    schema/
    store/
    utils/
    globals.css
    global-error.tsx
    layout.tsx
    not-found.tsx
    page.tsx
    providers.tsx
  test/
    architecture/
```

Courses already demonstrates the target Admin profile. Auth, Practice,
Settings, and Users migrate from legacy `src/views` and domain `src/services`
to their owners under `app/features`, with route-level composition under
`app/views`.

## Ownership and promotion rules

Technical folder names never decide ownership. Start code under the capability
that owns its language and behavior, then promote it only when real consumers
prove a wider scope.

| Concern | Location |
| --- | --- |
| Capability endpoint and query keys | `app/features/<capability>/api/<resource>.api.ts` |
| Capability query/mutation orchestration | `app/features/<capability>/hooks` |
| Capability form validation | `app/features/<capability>/schema` |
| Capability UI state or ViewModel | `app/features/<capability>/types` or `store` |
| Route-level composition | `app/views/<resource>/<Resource>View.tsx` |
| App-wide validation used by independent capabilities | `app/schema` |
| App-wide presentation hook/state/utility | `app/hooks`, `app/store`, `app/utils` |
| Cross-runtime JSON contract | `@repo/shared/<capability>` |

Using a schema in a feature API, hook, component, and View does not make it
app-wide; all of those consumers still belong to the same capability. Move a
schema to `app/schema` only after independent capabilities consume it. Promote
it to a shared contract only when multiple runtimes exchange that JSON shape.

Auth state remains under `features/auth`; app-wide `store` is reserved for
presentation state such as global navigation. Domain constants and types never
move into app-wide buckets merely because future reuse is possible.

## Route and View responsibilities

`page.tsx` and route layouts remain thin. They may read route parameters,
select metadata, and render a View. They do not own API calls, query keys,
forms, tables, or business state.

```tsx
import { CoursesView } from "@/app/views/courses/CoursesView";

export default function CoursesPage() {
  return <CoursesView />;
}
```

Authenticated Web Views are Client Components. A View uses feature hooks; the
hook calls its feature's resource API, which uses the single browser HTTP
transport. Loading, unauthorized, and request-error states are represented in
the client UI. Localized navigation must preserve the active locale.

## Authentication and data flow

The selected Web flow is:

```text
route renders client View
  -> auth session hydrates in browser
  -> feature hook starts query
  -> resource .api.ts calls web HTTP client
  -> access token is attached
  -> refresh is single-flight when required
  -> query returns data or stable API error
```

Login, register, refresh, logout, and current-user calls belong to
`features/auth/api/auth.api.ts`. Session storage and unauthenticated handling
belong to `features/auth`. Passwords, access tokens, refresh tokens, and cookies
must never be logged.

This choice trades server-preloaded private pages for one auth runtime and one
HTTP behavior. Private learning screens do not depend on search indexing, so
the simpler auth boundary is preferred for this base.

## Error handling

- The shared browser transport normalizes transport-level failures and performs
  at most one refresh attempt per failed request.
- Feature APIs translate resource-specific response details only when callers
  need a stable feature Interface.
- Views render loading, empty, unauthorized, and retry states through shared UI
  components.
- A 401 that cannot be refreshed clears the local session and navigates through
  the locale-aware auth path.
- Validation errors remain owned by the feature schema that produced the form.

## Migration constraints

- Preserve current URLs, locale behavior, HTTP methods, payloads, cache keys,
  and visible behavior while moving files.
- Move one capability at a time and update imports in the same change.
- Do not introduce compatibility facades that only forward from old domain
  services to new feature APIs.
- Remove an old domain file after its consumers move; do not leave duplicate
  implementations in `app` and `src`.
- Keep cross-cutting infrastructure outside feature ownership, but do not use it
  as a destination for domain code.
- Do not change API, Prisma, migrations, seeds, or vocabulary data.

## Verification

Architecture tests must reject:

- new Web domain code in `src/modules`, `src/services`, `src/views`, or
  `src/stores`;
- new Admin domain code in legacy `src/views` or `src/services/<capability>`;
- Web authenticated server HTTP adapters;
- feature schema, types, constants, API, or hooks placed in app-wide buckets
  without an approved cross-feature owner;
- non-localized navigation to localized Web routes.

Each migrated capability requires behavior tests for its API adapter and hooks,
followed by the repository gates:

```text
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```
