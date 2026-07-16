# ADR 0014: EC API Source Profile

## Status

Accepted; authentication placement details amended by ADR 0015

## Context

The API runtime split authentication implementation between `src/auth` and
`src/module/auth`, exposed two Prisma client generations, and used ambiguous
root folders named `db`, `prisma`, and `support`. Health delivery also lived at
the source root. These paths reduced locality and made the English Base differ
from the established EC backend profile without a domain reason.

## Decision

Adopt the EC API source profile:

```text
apps/api/src/
  common/                       cross-capability Nest infrastructure
    decorators/
    filters/
  config/                       validated runtime configuration
  database/prisma/              Prisma runtime and script adapters
  module/<capability>/          business owner and delivery
  app.module.ts                 composition root
  main.ts                       process bootstrap
```

- Authentication behavior and composition are owned by `src/module/auth`.
  Cross-capability guards and request context live under `src/common` as amended
  by ADR 0015.
- Health is a capability Module under `src/module/health`.
- Prisma has one generated client Interface: `@prisma/client`. The additional
  `prisma-client` generator and `src/generated/prisma` output are removed.
- Nest and offline data scripts use adapters under `src/database/prisma` and
  share database adapter configuration.
- Generic decorators and exception filters live under `src/common`.
- The no-op cache/revalidation wrappers are deleted. Cache invalidation remains
  the responsibility of the calling frontend adapter as accepted in ADR 0011.

The singular `src/module` name remains unchanged. This decision does not modify
the Prisma schema, database data, HTTP routes, or wire contracts.

## Consequences

- Auth and persistence knowledge have one owner and better locality.
- Callers use one Prisma type source, avoiding drift between generated clients.
- Data scripts retain a dedicated Prisma client adapter without creating a
  second database owner.
- Architecture tests reject the former root folders and duplicate generator.
- Other API Modules can migrate incrementally without copying EC domain code.
