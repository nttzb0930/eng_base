# Architecture Overview

This repository applies **Web Base Standard 1.5.0** to a three-app pnpm/Turborepo
workspace:

- `apps/api` exposes HTTP, owns business behavior, Prisma, and PostgreSQL.
- `apps/web` owns the learner-facing Next.js interface.
- `apps/admin` owns the management Next.js interface.
- `packages/shared` is the stable TypeScript-only home for cross-runtime wire
  declarations and framework-neutral constants.
- `packages/ui` owns exact React presentation primitives shared by Web and Admin.
- `packages/eslint-config` and `packages/typescript-config` own workspace tooling.

The repository does not provide a speculative `packages/hooks` package. Apps
may import packages. Packages must not import apps. Runtime package ownership
and names are fixed by [ADR 0011](adr/0011-monorepo-runtime-ownership.md);
Shared's TypeScript-only root Interface is fixed by
[ADR 0021](adr/0021-ec-shared-typescript-profile.md).

The Course content hierarchy is the first completed capability-first golden
slice. Its decisions and compatibility constraints are documented in
[Course content architecture](architecture/course-content.md) and
[ADR 0012](adr/0012-course-content-capability-boundary.md). The Admin filesystem
profile is recorded separately in
[ADR 0013](adr/0013-ec-admin-frontend-profile.md). The API source profile is recorded in
[ADR 0014](adr/0014-ec-api-source-profile.md).
Auth use-case organization is recorded in
[ADR 0015](adr/0015-auth-use-case-organization.md).
Flat goal use cases and neutral Admin list queries are recorded in
[ADR 0018](adr/0018-flat-goal-use-cases-and-explicit-list-query.md).
Admin delivery, Course Management roles, Vocabulary ownership, and the script
Prisma Adapter are recorded in
[ADR 0016](adr/0016-domain-owner-locality.md).
Centralized HTTP logging, redaction, and exception mapping are recorded in
[ADR 0017](adr/0017-centralized-http-logging.md).

Reference documents:

- [Codebase structure](architecture/codebase-structure.md)
- [Backend folder structure](backend-folder-structure.md)
- [Frontend folder structure](frontend-folder-structure.md)
- [Frontend/API integration](frontend-api-calls.md)
- [Frontend route template](frontend-route-template.md)
