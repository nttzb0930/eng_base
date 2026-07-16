# ADR 0013: EC Admin Frontend Profile

## Status

Accepted

## Context

ADR 0012 correctly established Course ownership and contracts, but its first
Admin layout introduced `src/features/courses/catalog`, a root barrel, and one
aggregate Course Management client. Those choices were not present in the EC
reference and made the reusable standard look more prescriptive than intended.

## Decision

Admin adopts the EC filesystem profile:

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
- Shared wire contracts remain at `@repo/shared/courses`; UI ViewModels remain
  Admin-local.

This is a repository profile of Web Base ownership rules, not a universal
requirement that every frontend use the same physical folders.

## Consequences

- Admin code now resembles the proven EC reference and is easier for existing
  EC contributors to navigate.
- Resource boundaries stay visible instead of being hidden by an aggregate
  client.
- Reusable documentation must distinguish invariant architecture rules from
  selectable filesystem profiles.
- ADR 0012 remains authoritative for domain ownership, contracts, and HTTP
  compatibility; this ADR supersedes only its Admin filesystem details.
