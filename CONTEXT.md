# Project Context

English Base is a capability-first learning platform. New and changed code must
follow the ownership and dependency rules in
`docs/architecture/codebase-structure.md`.

## Shared language

- **Learner**: the authenticated user completing lessons, practice, review, or placement activities.
- **Vocabulary item**: one English word and its normalized Vietnamese learning content, including part of speech, meanings, pronunciation, and examples.
- **Canonical vocabulary catalog**: the versioned repository source at
  `data/vocabulary/vocabulary-catalog.json`. It defines vocabulary records and
  Topic relationships but does not prove that a particular database environment
  has applied the latest source.
- **Topic taxonomy**: the versioned set of exactly 103 learning Topics in
  `data/vocabulary/topics.json`.
- **Vocabulary classification**: the fail-closed workflow that assigns an
  existing catalog record to zero or one canonical Topic without creating new
  vocabulary.
- **Topic expansion proposal**: an AI-assisted proposal for new vocabulary that
  fills a Topic deficit. It cannot enter the catalog until its contract passes
  validation and a person accepts it.
- **Human vocabulary review**: a deliberate, versioned decision or override.
  Raw provider output, rejected responses, reports, and backups are not human
  review records.
- **Lesson challenge**: a persisted question belonging to a lesson. Its correct answer may reference a vocabulary item.
- **Course content**: the ordered Course -> Unit -> Lesson -> Lesson challenge -> Challenge option hierarchy.
- **Course code**: the unique, immutable kebab-case business identity of a
  Course. Numeric ID remains relational identity; title remains editable
  presentation content.
- **Course Management**: the Admin capability for listing and mutating course content. It is an Interface of the Courses domain, not a separate business owner.
- **Saved word**: a learner-selected vocabulary item kept for later study.
- **Vocabulary progress**: the learner's persistent correctness, mastery, and scheduling state for one vocabulary item.
- **Review session**: a set of challenges composed from saved, due, or weak vocabulary items.
- **Practice session**: a standalone activity such as fill-blank, listening, dictation, or weak-word practice.
- **Reading passage**: a publishable CEFR-scoped text with an optional Topic,
  estimated reading time, and ordered comprehension questions/options.
- **Reading attempt**: an idempotently submitted, backend-graded result owned by
  Reading. Its answer rows keep immutable question, selected-option, and
  correct-option text snapshots so later content edits do not rewrite history.
- **TOEIC Reading attempt**: an authenticated Learner submission for one
  published TOEIC test version. The API grades it from server-owned answer keys
  and stores immutable per-question, per-Part, and explanation snapshots.
- **TOEIC Writing task**: one published, versioned Part 1 or Part 2 prompt owned
  by the TOEIC Writing catalog. Safe task delivery contains only exercise
  material; reference responses remain private until submission.
- **TOEIC Writing draft**: the single mutable response for one Learner and one
  TOEIC Writing task. It is stored in PostgreSQL with the task content version
  and is never learner progress in `localStorage`.
- **TOEIC Writing submission**: an immutable, Learner-owned response created
  with an idempotency key. It snapshots the task title, Part, and
  source-provided reference material at submission time for stable historical
  comparison but does not imply a score or AI feedback.
- **TOEIC Writing AI grade**: an authenticated, Learner-owned Part 1 or Part 2
  coaching result produced only after deterministic validation. It is separate
  from an immutable submission and versioned by task, response, prompt, rubric,
  and model; cached retries do not consume quota.
- **TOEIC Grammar snapshot**: one checksum-approved, source-owned catalog of
  Grammar topics, subtopics, lessons, shared questions, mixed sets, and
  difficulty memberships. Grammar supports TOEIC Reading but is not owned by a
  mock test.
- **Learning session**: the Web lifecycle shared by Lesson, Practice, and Review
  presentation: answer feedback, attempt counts, reviewed items, and one-time
  completion recording. Each owning capability keeps its scoring, persistence
  endpoint, and mode-specific presentation.
- **Placement test**: an adaptive session used to estimate a learner's starting level and initialize course progress.
- **Runtime owner**: the application responsible for an implementation. Web owns learner UI, Admin owns management UI, and API owns business behavior and database access.
- **Authentication session**: the access-token and persisted refresh-token
  lifecycle shared by Learner and Admin login delivery. Auth owns the behavior;
  HTTP controllers own cookies.
- **Wire contract**: the JSON-safe request or response shape shared across API,
  Admin, and Web. Consumers import its TypeScript declaration from the root
  `@repo/shared` Interface.
- **Persistence model**: the Prisma/database representation owned only by API. It may use database naming such as `image_src` and must be mapped to a wire contract.
- **ViewModel**: UI-only state or enriched presentation shape owned by one frontend feature. It must not be promoted to a cross-runtime contract merely for convenience.

## Architecture principles

- Keep route modules thin. Route modules compose feature views; feature implementation does not live in `page.tsx`.
- Prefer deep modules: small public interfaces with behavior and invariants kept in one implementation.
- Business behavior belongs to its domain module, regardless of whether the caller is Learner UI or Admin UI.
- PostgreSQL and Prisma are owned exclusively by `apps/api`.
- The API persistence Adapter lives under `src/database/prisma`; persistence
  models come only from the generated `@prisma/client` Interface.
- Authentication behavior is organized by user goal under `module/auth`; Nest
  guards and request identity extraction are delivery infrastructure under
  `common`. Actor identity is passed explicitly into behavior; ambient request
  context is forbidden.
- Authentication rate limiting is HTTP delivery infrastructure under `common`.
  Auth controllers declare policies; Auth use cases never learn IP, request, or
  throttler storage details.
- Shared packages must not import from applications.
- Cross-runtime contracts belong in `packages/shared`; Nest-only DTOs and view-local state remain application-local.
- `packages/shared` is the stable TypeScript-only aggregator. Consumers use its
  root Interface; capability subpaths are forbidden by ADR 0021.
- Ownership is capability-first. Each runtime follows its documented filesystem
  profile; the frontend feature/view profile separates `app/features` behavior from
  `app/views` screen composition without changing domain ownership.
- Courses owns both learner-facing reads and Admin Course Management CRUD. The Admin API module must not duplicate these mutations.
- Course behavior locates a Course by immutable code, never by editable title.
  No Course slug or public Course Detail route exists yet.
- Admin is a caller and authorization mode, not a business owner; Admin HTTP
  delivery remains in the capability whose behavior it exposes.
- Vocabulary owns vocabulary item/progress/example types and the mapping and
  challenge-building implementation used by learning flows.
- Reading owns passage publication, learner discovery, comprehension grading,
  and Reading attempt history. It may reference the Topic taxonomy, but it does
  not update Practice sessions or Vocabulary progress.
- TOEIC Reading owns safe published-test delivery, version-aware grading, and
  Learner-scoped attempt history. Test detail never exposes correctness or
  grading explanations before submission.
- TOEIC Writing owns published Part 1-2 prompts, version-aware drafts,
  idempotent submissions, post-submission reference comparison, and Part 1-2 AI
  coaching. Reference content remains distinct from AI feedback. Provider calls
  are server-only, quota-reserved, schema-validated, and disabled by default.
- TOEIC Listening keeps Full Test exam-safe in the normal learner UI. Part
  practice may grade one explicit selection at a time and return only that
  question's translation, explanation, and vocabulary-catalog matches; test
  detail still never exposes answer keys or private review fields.
- TOEIC Grammar acquisition is private and fail-closed. Inventory, download,
  and validation remain database-free; only an approved snapshot import may
  replace source-owned Grammar data in PostgreSQL.
- Add seams only when there are at least two real adapters, such as Prisma in production and an in-memory repository in tests.
- A use case represents one goal. Plural CRUD/management use-case aggregates
  and compatibility facades that only forward to goal use cases are forbidden.
- Tests verify observable behavior through public interfaces, not private helpers or implementation layout.

## Compatibility constraints

- Course Management updates use `PUT`, not `PATCH`.
- The existing `/admin/challengeOptions` path is camelCase and remains unchanged until a separately versioned API migration.
- A list request with a `page` query key returns a pagination envelope. Omitting `page` returns a raw array and `Content-Range` for lookup use cases.
- Admin list delivery accepts both `search` and `q`; paged requests are capped at
  100 records while unpaged lookup behavior remains compatible.

## Data safety

- Repository source data and deployed PostgreSQL state are separate. A valid
  canonical catalog does not imply that seed or synchronization has run.
- Architecture refactors must not run vocabulary seed, normalization,
  correction, enrichment, provider, or database apply commands.
- Prisma schema changes and data migrations require a separate reviewed task.
- Generated vocabulary work and backups stay in ignored local directories;
  versioned review files contain only deliberate human decisions.
