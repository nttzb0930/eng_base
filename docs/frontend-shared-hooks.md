# Frontend Hook Placement

There is no `packages/hooks` workspace package. Hooks follow their smallest real
owner.

| Scope                             | Location                                                    |
| --------------------------------- | ----------------------------------------------------------- |
| One Admin capability              | `app/features/<capability>/hooks`                           |
| One view only                     | colocated with that view when it is truly presentation-only |
| Unrelated capabilities in one app | app-level hook only after demonstrated reuse                |
| Multiple applications             | separately reviewed React package after real reuse          |

React Query hooks call resource APIs and own orchestration/invalidation. Query
key factories remain in `<resource>.api.ts`, beside the HTTP resource Interface.
Hooks do not hardcode endpoint strings.

`packages/shared` stays framework-neutral and contains no React hooks. It owns
wire schemas, Request/DTO types, and constants.

- Prefix hook names with `use`.
- Preserve query-key identity during structural moves.
- Expose a focused Interface rather than every internal setter.
- Move a hook upward only when real consumers demonstrate a common owner.

Course Management hooks in `apps/admin/app/features/courses/hooks` are the EC
profile reference.
