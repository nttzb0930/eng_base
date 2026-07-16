# Project Context

The architecture baseline is **Web Base Standard 1.2.0**, adopted incrementally.
Legacy modules may remain until their behavior is covered and moved; new code
must follow the capability-first rules in `docs/architecture/codebase-structure.md`.

## Shared language

- **Learner**: the authenticated user completing lessons, practice, review, or placement activities.
- **Vocabulary item**: one English word and its normalized Vietnamese learning content, including part of speech, meanings, pronunciation, and examples.
- **Lesson challenge**: a persisted question belonging to a lesson. Its correct answer may reference a vocabulary item.
- **Course content**: the ordered Course -> Unit -> Lesson -> Lesson challenge -> Challenge option hierarchy.
- **Course Management**: the Admin capability for listing and mutating course content. It is an Interface of the Courses domain, not a separate business owner.
- **Saved word**: a learner-selected vocabulary item kept for later study.
- **Vocabulary progress**: the learner's persistent correctness, mastery, and scheduling state for one vocabulary item.
- **Review session**: a set of challenges composed from saved, due, or weak vocabulary items.
- **Practice session**: a standalone activity such as fill-blank, listening, dictation, or weak-word practice.
- **Placement test**: an adaptive session used to estimate a learner's starting level and initialize course progress.
- **Normalized vocabulary dataset**: the reviewed 3,000-item dataset currently stored in PostgreSQL. Changes to it require the dedicated dry-run, backup, confirmation, and audit workflow.
- **Runtime owner**: the application responsible for an implementation. Web owns learner UI, Admin owns management UI, and API owns business behavior and database access.
- **Wire contract**: the JSON-safe request or response shape shared across API, Admin, and Web. Course wire contracts are imported from `@repo/shared/courses`.
- **Persistence model**: the Prisma/database representation owned only by API. It may use database naming such as `image_src` and must be mapped to a wire contract.
- **ViewModel**: UI-only state or enriched presentation shape owned by one frontend feature. It must not be promoted to a cross-runtime contract merely for convenience.

## Architecture principles

- Keep route modules thin. Route modules compose feature views; feature implementation does not live in `page.tsx`.
- Prefer deep modules: small public interfaces with behavior and invariants kept in one implementation.
- Business behavior belongs to its domain module, regardless of whether the caller is Learner UI or Admin UI.
- PostgreSQL and Prisma are owned exclusively by `apps/api`.
- Shared packages must not import from applications.
- Cross-runtime contracts belong in `packages/shared`; Nest-only DTOs and view-local state remain application-local.
- `packages/shared` is a transitional aggregator. New contracts use capability subpaths rather than expanding the legacy root barrel; the package name remains unchanged under ADR 0011.
- Ownership is capability-first. Each runtime may select a documented filesystem
  profile; the Admin EC profile separates `app/features` behavior from
  `app/views` screen composition without changing domain ownership.
- Courses owns both learner-facing reads and Admin Course Management CRUD. The Admin API module must not duplicate these mutations.
- Add seams only when there are at least two real adapters, such as Prisma in production and an in-memory repository in tests.
- Tests verify observable behavior through public interfaces, not private helpers or implementation layout.

## Compatibility constraints

- Course Management updates use `PUT`, not `PATCH`.
- The existing `/admin/challengeOptions` path is camelCase and remains unchanged until a separately versioned API migration.
- A list request with a `page` query key returns a pagination envelope. Omitting `page` returns a raw array and `Content-Range` for lookup use cases.
- Admin currently sends `search`, while the API filter decorator reads `q`. This drift is known and intentionally not repaired by the structural refactor.

## Data safety

- Architecture refactors must not run vocabulary seed, normalization, correction, or database apply commands.
- Prisma schema changes and data migrations require a separate reviewed task.
- Existing vocabulary backups and audit artifacts are retained until an explicit cleanup task approves removal.
