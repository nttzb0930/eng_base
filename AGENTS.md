# Agent Workflow

Read `CONTEXT.md` before changing domain behavior and read the relevant ADR in `docs/adr/` before changing an accepted architecture decision.

## Runtime ownership

- `apps/web`: learner-facing Next.js runtime.
- `apps/admin`: management Next.js runtime.
- `apps/api`: NestJS runtime, Prisma, PostgreSQL, business behavior, and data scripts.
- `packages/shared`: cross-runtime contracts and framework-neutral constants.

## Frontend conventions

- Keep `app/**/page.tsx` and route layouts thin.
- Put feature views in `src/views/<feature>`.
- Put application-wide UI in `src/components`; feature-private UI stays with its view.
- Put HTTP adapters in `src/services` or a clearly named feature module.
- Localized navigation must preserve the active locale.
- Do not create a non-localized implementation route when the canonical route is under `[locale]`.

## Backend conventions

- Controllers receive validated input and call domain behavior; they do not query Prisma directly.
- Domain behavior, data access, and tests stay local to the owning module.
- Introduce repository seams only with real production and test adapters.
- Do not duplicate domain mutations in the Admin module.

## Verification

Run the narrowest relevant command while developing, then run all gates before handoff:

```bash
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

## Vocabulary data safety

Do not run `db:seed`, `db:push`, `data:sync-vocab-normalization`, or `data:sync-vocab-pos-correction` during architecture refactors. Database writes require explicit user confirmation.
