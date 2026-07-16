# Codebase Structure

This document defines the target structure used during the incremental architecture migration. Existing code may temporarily remain in legacy locations, but new moves should converge on this structure.

## Workspace

```text
apps/
  web/       learner UI
  admin/     management UI
  api/       business behavior and database ownership
packages/
  shared/    cross-runtime contracts and constants
  eslint-config/
  typescript-config/
data/        vocabulary snapshots, proposals, audits, and backups
docs/adr/    accepted architecture decisions
```

## Frontend

```text
apps/<web|admin>/
  app/                     Next.js route adapters
  src/
    components/            application-wide UI
    config/                application configuration
    hooks/                 reusable application hooks
    i18n/                  locale configuration and navigation
    lib/                   framework/application infrastructure
    messages/              application-owned locale catalogs
    modules/               domain-facing client behavior
    services/              HTTP and external adapters
    stores/                application state
    views/<feature>/        feature implementation
```

Rules:

- A route adapter imports and renders a feature view.
- A feature view may use application components, domain modules, hooks, and adapters.
- Application-wide components do not import private feature implementation.
- Types shared with API belong in `packages/shared`; view-only types stay with the feature.

## Backend

The current path is `apps/api/src/module`. It will be renamed to `modules` only after imports and tests make that mechanical move safe.

```text
apps/api/src/modules/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  dto/
  use-cases/
  repository/
  domain/
  tests/
```

Not every module needs every folder. Add structure only when behavior exists:

- Controller: HTTP delivery adapter.
- Use case: application flow and domain decisions.
- Repository: data access behind a real seam.
- Domain: reusable pure domain behavior inside the module.
- Tests: behavior through the module's public interface.

## Dependency direction

```text
route adapter -> feature view -> client domain module -> HTTP adapter
controller -> use case -> repository -> Prisma adapter
                       -> internal domain implementation
```

Applications may import packages. Packages must not import applications.
