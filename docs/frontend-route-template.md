# Frontend Route Template

Use this **Web Base Standard 1.1.0** template for a new Admin or Web route.

## Route adapter

```tsx
// app/(group)/examples/page.tsx
import { ExamplesView } from "@/src/features/examples";

export default function ExamplesPage() {
  return <ExamplesView />;
}
```

The route imports the feature root, not `examples.view.tsx` or another private
file. Keep it free of client state, API calls, table columns, domain constants,
and form logic. Add `"use client"` to the owning feature component when needed,
not to a route adapter without a framework-specific reason.

## Minimal feature

```text
src/features/examples/
  index.ts
  examples.view.tsx
```

```ts
// src/features/examples/index.ts
export { ExamplesView } from "./examples.view";
```

As behavior grows, add only real boundaries:

```text
src/features/examples/
  index.ts
  api/example.client.ts
  model/example.view-model.ts
  catalog/
    index.ts
    example.queries.ts
    examples.view.tsx
    components/
  tests/
```

Avoid the redundant `features/examples/examples/` name; choose a semantic child
such as `catalog`, `editor`, or `settings`.

## Type checklist

- JSON Request/DTO/schema shared with API: `@repo/shared/examples`.
- Form, selection, modal, table, or enriched display state: feature-local model.
- Component props: colocated with the component unless genuinely reused.
- Prisma/generated API model: never imported by frontend code.

## Route checklist

- [ ] `page.tsx` imports only `@/src/features/<capability>`.
- [ ] The root `index.ts` only exports the intended public Interface.
- [ ] Domain HTTP calls live inside the feature, using app HTTP infrastructure.
- [ ] Private UI/hooks/state stay inside their smallest owner.
- [ ] No new domain code was added under legacy `src/views`, `src/services`,
      `src/types`, or `src/constants` buckets.
- [ ] Localized routes preserve the active locale.
- [ ] Tests cover the public behavior and import boundary.
- [ ] Architecture, test, type, lint, and build gates pass.

See [Frontend folder structure](frontend-folder-structure.md) and
[Course content architecture](architecture/course-content.md).
