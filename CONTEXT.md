# Project Context

## Shared language

- **Learner**: the authenticated user completing lessons, practice, review, or placement activities.
- **Vocabulary item**: one English word and its normalized Vietnamese learning content, including part of speech, meanings, pronunciation, and examples.
- **Lesson challenge**: a persisted question belonging to a lesson. Its correct answer may reference a vocabulary item.
- **Saved word**: a learner-selected vocabulary item kept for later study.
- **Vocabulary progress**: the learner's persistent correctness, mastery, and scheduling state for one vocabulary item.
- **Review session**: a set of challenges composed from saved, due, or weak vocabulary items.
- **Practice session**: a standalone activity such as fill-blank, listening, dictation, or weak-word practice.
- **Placement test**: an adaptive session used to estimate a learner's starting level and initialize course progress.
- **Normalized vocabulary dataset**: the reviewed 3,000-item dataset currently stored in PostgreSQL. Changes to it require the dedicated dry-run, backup, confirmation, and audit workflow.
- **Runtime owner**: the application responsible for an implementation. Web owns learner UI, Admin owns management UI, and API owns business behavior and database access.

## Architecture principles

- Keep route modules thin. Route modules compose feature views; feature implementation does not live in `page.tsx`.
- Prefer deep modules: small public interfaces with behavior and invariants kept in one implementation.
- Business behavior belongs to its domain module, regardless of whether the caller is Learner UI or Admin UI.
- PostgreSQL and Prisma are owned exclusively by `apps/api`.
- Shared packages must not import from applications.
- Cross-runtime contracts belong in `packages/shared`; Nest-only DTOs and view-local state remain application-local.
- Add seams only when there are at least two real adapters, such as Prisma in production and an in-memory repository in tests.
- Tests verify observable behavior through public interfaces, not private helpers or implementation layout.

## Data safety

- Architecture refactors must not run vocabulary seed, normalization, correction, or database apply commands.
- Prisma schema changes and data migrations require a separate reviewed task.
- Existing vocabulary backups and audit artifacts are retained until an explicit cleanup task approves removal.
