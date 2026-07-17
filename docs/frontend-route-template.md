# Frontend Route Template

Use this template for a new route in the frontend EC profile.

```tsx
// app/(dashboard)/examples/page.tsx
import { ExamplesView } from "@/app/views/examples/ExamplesView";

export default function ExamplesPage() {
  return <ExamplesView />;
}
```

Minimal supporting structure:

```text
app/features/examples/
  api/example.api.ts
  hooks/use-examples.ts
  types/example.types.ts        only when UI-local types exist
app/views/examples/ExamplesView.tsx
```

Add only boundaries used by the behavior. Do not add a root `index.ts`,
`catalog`, or aggregate client by default.

Checklist:

- [ ] The route imports its EC view and contains no feature behavior.
- [ ] Each HTTP resource has an owning `.api.ts` and runtime response parsing.
- [ ] Query keys live with the resource API; hooks own query orchestration.
- [ ] Wire contracts come from `@repo/shared/<capability>`.
- [ ] UI-only state stays local to the owning capability/view.
- [ ] No code was added to the rejected `src/features` profile for this runtime.
- [ ] Tests cover HTTP compatibility, schemas, keys, and import boundaries.
- [ ] Architecture, test, type, lint, and build gates pass.

See [Frontend folder structure](frontend-folder-structure.md) and ADR 0013.
