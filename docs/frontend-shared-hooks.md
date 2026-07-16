# Frontend Hook Placement

This file is retained so old links do not break, but it replaces the former
mojibake guide. There is currently no `packages/hooks` workspace package. Do not
import `@repo/hooks` or create that package as part of an unrelated feature.

Under **Web Base Standard 1.1.0**, hooks follow their smallest real owner:

| Scope                                 | Location                                                                |
| ------------------------------------- | ----------------------------------------------------------------------- |
| One screen/subcapability              | `src/features/<capability>/<subcapability>`                             |
| Several parts of one capability       | `src/features/<capability>/model` or a capability-local `hooks` folder  |
| Unrelated features in one application | `apps/<client>/src/hooks`                                               |
| Multiple applications                 | Create a separately reviewed React package only after real reuse exists |

React Query hooks are capability behavior. Keep them beside the feature client
and view, and keep query keys within that capability. They must not hardcode HTTP
requests in UI components.

`packages/shared` is framework-neutral and must not contain React hooks. It owns
wire schemas, Request/DTO types, and constants; Course hooks consume those via
`@repo/shared/courses`.

Hook rules:

- Prefix hook names with `use`.
- Keep browser access SSR-safe when the hook can render on the server.
- Return a focused Interface rather than exposing every internal state setter.
- Preserve query-key identity during structural moves.
- Move a hook upward only after a second real consumer demonstrates a common
  owner; avoid speculative `shared` folders.

Course Management query hooks in `apps/admin/src/features/courses` are the
reference. Their tests lock the resource root, paged key, and lookup key shapes.
