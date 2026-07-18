# ADR 0013: Use Feature Ownership with Route-Level Views

## Status

Accepted

## Context

ADR 0012 established Course ownership, but the initial Admin layout introduced
an extra `catalog` grouping and one aggregate Course Management client. That
hid independently addressed HTTP resources and made route composition harder to
discover.

## Decision

Admin uses this filesystem profile:

```text
app/features/courses/
  api/<resource>.api.ts
  hooks/use-<resources>.ts
  types/
  tests/
app/views/<resource>/<Resource>View.tsx
app/(dashboard)/<resource>/page.tsx
```

- Each independently addressed HTTP resource owns a `.api.ts` module and its
  React Query key factory.
- Hooks orchestrate resource APIs and cache invalidation under the capability.
- `app/views` composes screen UI; thin route files import these views directly.
- A capability root barrel and semantic `catalog` folder are not required.
- Shared wire types come from the root `@repo/shared` interface; UI view models
  remain Admin-local.

Web follows the same feature/view ownership rule while retaining its localized
Next.js route tree. Physical route folders remain runtime-specific.

## Consequences

- Web and Admin share one ownership vocabulary without pretending their route
  runtimes are identical.
- Resource boundaries stay visible instead of being hidden by an aggregate
  client.
- Documentation distinguishes invariant ownership rules from runtime-specific
  route folders.
- ADR 0012 remains authoritative for domain ownership, contracts, and HTTP
  compatibility; this ADR supersedes only its Admin filesystem details.
