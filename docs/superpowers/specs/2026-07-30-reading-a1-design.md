# Reading A1 Vertical Slice Design

## Goal

Deliver the first complete Reading capability for A1 learners. Administrators
can author and publish English passages with single-answer comprehension
questions. Learners can browse published passages, complete an accessible
reading session, submit answers for server-side grading, and review the
persisted result.

Reading owns its content and learner results. It does not reuse Course lessons,
Lesson challenges, Practice sessions, or Vocabulary progress counters.

## Scope

The first release supports:

- A1 passages only at the HTTP and UI boundaries;
- English passage, question, and answer-option content;
- localized English and Vietnamese interface copy;
- an optional canonical Vocabulary Topic association;
- draft, published, and unpublished content workflow;
- one correct option per question;
- idempotent learner submission and persisted answer-level results;
- learner passage list, session, result, and basic attempt history.

The persistence shape uses the existing A1-B2 CEFR vocabulary so later levels
do not require another structural migration. A2-B2 remain disabled in Reading
request validation, Admin controls, and learner filters until the A1 workflow is
stable.

Vocabulary highlighting, inline dictionary lookup, free-text answers, content
generation, AI grading, adaptive passage selection, and certificates are out of
scope.

## Domain Model and Persistence

Add a versioned Prisma migration and matching models:

### Reading Passage

- integer identity and unique immutable slug;
- title and English body;
- CEFR level constrained to A1-B2;
- optional `vocabulary_topics` relation;
- positive estimated reading minutes;
- publication status: `DRAFT` or `PUBLISHED`;
- created, updated, and nullable published timestamps;
- ordered comprehension questions.

Unpublishing returns a passage to `DRAFT` and clears `published_at`. Existing
attempts remain readable after unpublishing.

### Reading Question and Option

A question belongs to one passage and has a stable order. An option belongs to
one question and has a stable order and a correctness flag. Database uniqueness
protects order within each parent. API behavior additionally rejects a passage
unless every question has at least two options and exactly one correct option.

### Reading Attempt and Answer

An attempt belongs to a learner and passage and stores:

- a client-generated submission key;
- the passage title captured at submission time;
- correct count, total count, and integer accuracy;
- submission timestamp;
- one persisted answer per passage question.

Each answer stores question, selected-option, and correct-option text snapshots
plus the correctness result captured at submission time. Result history
therefore remains stable when an unpublished passage is edited later. A unique
learner/submission-key constraint makes retries idempotent. A transaction
creates the attempt and all answers together. Reading rows have no relation to
Vocabulary progress or Practice session rows.

The migration is committed and verified structurally but is not applied to any
database without separate environment authorization.

## Shared Interface

`packages/shared` owns framework-neutral Reading types and constants exported
from the package root:

- enabled Reading CEFR levels, initially `["A1"]`;
- passage publication status values;
- passage summary and learner detail shapes;
- Admin passage detail and create/update payloads;
- learner submission and result shapes;
- attempt-history summary.

Learner passage detail never includes option correctness. Correct option
identity is returned only in the graded result. Prisma records and Nest DTO
classes remain inside API.

## API Behavior

Reading is a new capability under `apps/api/src/module/reading`. Controllers
receive validated input and delegate to goal-named use cases.

Learner endpoints:

- `GET /reading/passages?level=A1` lists published passage summaries;
- `GET /reading/passages/:slug` returns one published passage without answers;
- `POST /reading/passages/:passageId/attempts` grades and persists one
  idempotent submission;
- `GET /reading/attempts?level=A1` returns the learner's recent results;
- `GET /reading/attempts/:attemptId` returns answer-level feedback owned by the
  authenticated learner.

Admin endpoints:

- `GET /admin/reading-passages`;
- `GET /admin/reading-passages/:id`;
- `POST /admin/reading-passages`;
- `PUT /admin/reading-passages/:id`;
- `POST /admin/reading-passages/:id/publish`;
- `POST /admin/reading-passages/:id/unpublish`.

Admin create/update accepts the passage, questions, and options as one
aggregate. The API validates A1, unique question/option order, at least one
question, at least two options per question, exactly one correct option, a
canonical Topic when supplied, and a positive reading duration.

Publishing revalidates the complete aggregate. Learner detail returns not found
for draft or missing content. Submission rejects unknown questions, duplicate
question answers, options belonging to another question, and incomplete
answers. A duplicate submission key returns the original persisted result
without awarding or recording anything twice. Reusing the key for another
passage or a different answer set is rejected as a conflict. Accuracy is
`Math.round(correctCount / totalCount * 100)`.

## Admin Experience

Admin adds a `Reading passages` route and a Reading-owned feature. The list
shows title, A1 level, Topic, duration, question count, and publication state.
The editor supports passage fields and ordered question/option editing.

The form clearly marks the single correct option for each question. Invalid
aggregates are blocked client-side for quick feedback and validated again by
API. Publish and unpublish are explicit actions with visible status. The first
slice exposes A1 only.

## Learner Experience

Web adds localized routes:

- `/[locale]/reading` inside the main learner layout;
- `/[locale]/reading/[slug]` inside the focused session layout;
- `/[locale]/reading/results/[attemptId]` for persisted feedback.

The list groups only published A1 passages and shows Topic, estimated minutes,
and the learner's latest result when available. The focused session displays
the passage before its ordered questions and supports:

- semantic headings, fieldsets, and radio controls;
- full keyboard operation and visible focus;
- adjustable font size and line height with local browser persistence;
- no color-only correct/incorrect signaling;
- page-specific loading, empty, error, and submission states.

The submit action is disabled until every question has one selection. Web
creates one submission key per session and reuses it for retries. The result
screen shows score and per-question selected/correct answers without mutating
Vocabulary or Practice state.

## Error and Security Rules

Learner endpoints use the existing learner authentication guard; Admin
endpoints use the Admin guard. Attempt lookup is always scoped by authenticated
learner identity. Correctness flags never cross the pre-submission learner
boundary.

Validation failures use the existing HTTP error contract. Concurrent duplicate
submissions resolve to the same attempt through the database uniqueness
constraint and transaction behavior. Logs must not include answer payloads,
tokens, or learner session credentials.

## Verification

Implementation follows test-driven development:

- migration and Prisma structure tests;
- Shared root-interface and constant tests;
- pure aggregate validation and grading-policy tests;
- API use-case tests for publication, grading, ownership, transactions, and
  duplicate submission;
- controller metadata and authenticated actor-forwarding tests;
- Admin resource, query-key, form-structure, and route tests;
- Web resource, query-key, locale parity, route, accessibility structure, and
  result-presentation tests.

Before integration, run the repository architecture, full test, standalone
Vocabulary workflow, type-check, lint, production build, documentation
formatting, and Git diff gates. No verification step applies a migration, seeds
data, calls an AI provider, or writes to a database.

## Release Gate

A1 Reading is ready for environment deployment when:

- Admin can create, edit, publish, and unpublish a valid A1 passage;
- only published A1 passages are visible to learners;
- backend grading returns deterministic answer-level feedback;
- retrying a submission key produces exactly one persisted attempt;
- attempt history is learner-scoped;
- Reading activity leaves Practice and Vocabulary counters unchanged;
- English and Vietnamese UI catalogs remain in parity;
- the versioned migration has a separately reviewed deployment plan.

A2-B2 remain disabled until A1 authoring, submission persistence, and operational
monitoring have been validated in a target environment.
