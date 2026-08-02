# TOEIC Writing Part 1-2 Design

## Goal

Deliver the first learner-ready TOEIC Writing capability for English Base. The
first release publishes the authorized Part 1 and Part 2 task catalogs, lets an
authenticated Learner write with backend autosave, records immutable
submissions, and reveals reference material only after submission.

This release deliberately does not claim to grade writing. AI scoring and
correction are a separate phase because English Base does not yet own a Writing
AI provider, rubric, quota policy, or failure contract.

## Scope

The release includes:

- 48 authorized Part 1 picture-description tasks;
- 50 authorized Part 2 email-response tasks;
- a private, checksummed acquisition pipeline for text and Part 1 images;
- Course-owned, publishable Writing content in PostgreSQL;
- a learner catalog with separate Part 1 and Part 2 views;
- one backend draft per Learner and task;
- idempotent, immutable submissions;
- post-submission comparison with samples and structured reference material;
- learner progress based on distinct tasks submitted;
- Vietnamese and English interface copy;
- task-specific loading, empty, error, autosave, and submission states.

The release excludes:

- Part 3, because no reviewed Part 3 content is available;
- AI scoring, correction, rewriting, generated samples, or provider calls;
- copying source-account progress or invoking source AI/quota endpoints;
- anonymous drafts or submissions;
- Admin authoring and editorial mutation;
- storing learner progress in `localStorage`;
- committing licensed content, media, credentials, or source payloads to Git.

## Ownership and Architecture

TOEIC Writing is a separate capability under the Course whose immutable code is
`toeic-600`. It is a peer of TOEIC Reading, Listening, Dictation, and Grammar.
It is not a CEFR lesson type and must not overload `LessonChallenge`, whose
short-answer lifecycle cannot preserve Writing prompts, long responses,
reference material, versions, and immutable submissions.

```text
Course(code = toeic-600)
  -> TOEIC Writing set
      -> TOEIC Writing task (Part 1 | Part 2)

Learner
  -> TOEIC Writing draft
  -> TOEIC Writing submission
```

Runtime ownership follows the repository's capability-first architecture:

```text
localized route
  -> app/views/toeic-writing
  -> app/features/toeic-writing hook
  -> toeic-writing.api.ts
  -> Auth-owned Web HTTP client

Nest controller
  -> goal-named Writing use case
  -> Prisma
```

The first implementation does not add a repository abstraction. Prisma is the
only production persistence adapter, so goal-named use cases may depend on
`PrismaService` while keeping queries and business rules out of controllers.

## Source and Private Acquisition

Source accessibility is not permission. Operators must confirm that the
configured account and license authorize retrieval and use. The adapter uses
only records visible to that authorization context and never attempts to bypass
authentication, row-level security, subscription checks, or source filters.

The pipeline exposes four explicit commands:

```text
data:inventory-toeic-writing
data:download-toeic-writing
data:validate-toeic-writing
data:import-toeic-writing
```

`inventory` reads source metadata and reports Part counts and image-size
information. It does not access PostgreSQL or download image bodies.

`download` requires an explicitly approved inventory SHA-256. It normalizes the
visible authorized content, downloads Part 1 images, verifies media bytes, and
writes immutable private packages. It does not access PostgreSQL.

`validate` reads only private packages. `import` reads only validated packages,
requires the approved inventory SHA-256, resolves `Course.code = toeic-600`,
and performs database writes. Neither command calls the source.

The default private storage layout is:

```text
var/licensed-content/dautoeic/writing/
  inventories/<inventory-sha>.json
  <source-task-id>/<source-version>/
    manifest.json
    content.json
    validation.json
    media/<sha256>.<extension>
```

The existing ignored `var/licensed-content/` boundary remains mandatory.
Canonical files contain provenance and safe source identifiers but never an
authorization header, token, signed URL, absolute local path, or learner data.
Logs contain bounded identifiers, counts, checksums, and failure categories;
they do not contain full prompts, samples, responses, or credentials.

## Canonical Content

Every canonical task has:

- schema version;
- source and source task identity;
- Part, source order, title, and difficulty;
- deterministic source version and content checksum;
- retrieval timestamp and operator-supplied license reference;
- English and Vietnamese instructions when supplied;
- a typed Part-specific payload;
- media checksums and storage-relative paths for Part 1;
- validation status and report checksum.

Part 1 payload contains:

- one verified picture;
- required English words and supplied Vietnamese word meanings;
- source pattern classification;
- structure suggestions, ideas, and sample sentences;
- supplied English and Vietnamese reference answers.

Part 2 payload contains:

- the email prompt in English and Vietnamese when supplied;
- ordered response requirements;
- level-one and level-two outlines/chunks;
- the supplied gap-reference values;
- supplied English and Vietnamese sample responses.

Unknown source fields are not copied automatically. Provider parsing is strict,
and an intentional payload change increments the canonical schema version.

## Validation

Validation is Part-aware and runs before database access.

Every task must have a valid source identity, Part, positive source order,
difficulty, deterministic version, content checksum, provenance, and license
reference. Source identity is unique within a canonical inventory.

Part 1 additionally requires:

- exactly one verified image with an allowed image MIME type;
- at least one required word;
- no blank or duplicate normalized required words;
- at least one non-empty reference sentence;
- no absolute local paths or unresolved media references.

Part 2 additionally requires:

- a non-empty email prompt;
- at least one ordered response requirement;
- valid ordered chunks for both supplied learning levels;
- one complete English reference response;
- no orphaned gap-reference value.

The approved first inventory must contain exactly 48 valid Part 1 tasks and 50
valid Part 2 tasks. A task failure does not delete another valid private
package. Commands finish with a bounded summary and a non-zero exit when any
task is rejected or fails.

## Persistence Model

A reviewed migration adds:

### `toeic_writing_sets`

- `id`, `course_id`, `source`, and `source_set_id`;
- title and display order;
- created and updated timestamps;
- uniqueness on `course_id + source + source_set_id`.

### `toeic_writing_tasks`

- `id`, `set_id`, `source_task_id`, `part`, and source order;
- title, difficulty, instructions, and typed canonical payload stored as JSON;
- optional Part 1 media storage key, checksum, bytes, and MIME type;
- source version, content checksum, provenance, and license reference;
- `DRAFT | PUBLISHED`, publication timestamp, and row timestamps;
- uniqueness on `source + source_task_id` and on `set_id + part + order`.

The JSON payload preserves heterogeneous Part-specific source material without
creating many nullable columns. The canonical validator and API mapper are the
typed boundaries; Prisma JSON never crosses the HTTP boundary directly.

### `toeic_writing_drafts`

- `id`, `user_id`, `task_id`, response text, and task content version;
- created and updated timestamps;
- uniqueness on `user_id + task_id`.

### `toeic_writing_submissions`

- `id`, `user_id`, `task_id`, and client-generated submission key;
- immutable response text and task content version;
- submitted timestamp;
- uniqueness on `user_id + submission_key`;
- indexes for learner history and task progress.

No AI score or feedback column is introduced. The future AI-grading phase must
design its own rubric-versioned result rather than repurposing reference
material as a score.

## Import and Publication

Import is idempotent by `source + sourceTaskId`.

- Missing source identity creates a complete task aggregate.
- Matching source version and checksum is skipped.
- A changed source version transactionally replaces the source-owned task
  fields and publishes the validated version immediately.
- Learner drafts and immutable submissions are never deleted or rewritten by a
  content import.
- Published historical submissions retain their submitted content version.
- Missing `toeic-600` Course fails the import without creating a substitute.

Immediate publication is acceptable for this phase because the operator has
explicitly approved and validated the 48 Part 1 and 50 Part 2 tasks. Future
unreviewed or generated Writing content must enter a separate editorial flow
and must not inherit this assumption silently.

Each task imports in its own transaction. The final report distinguishes
updated, skipped, rejected, and failed source task IDs without printing source
content or secrets.

## Learner API

All Writing routes require `UserJwtGuard`.

```text
GET    /api/toeic/writing/overview
GET    /api/toeic/writing/tasks?part=1|2
GET    /api/toeic/writing/tasks/:taskId
GET    /api/toeic/writing/tasks/:taskId/image
GET    /api/toeic/writing/tasks/:taskId/draft
PUT    /api/toeic/writing/tasks/:taskId/draft
DELETE /api/toeic/writing/tasks/:taskId/draft
POST   /api/toeic/writing/tasks/:taskId/submissions
GET    /api/toeic/writing/submissions/:submissionId
```

The overview returns published task totals and distinct submitted-task progress
per Part. The catalog returns stable database IDs, titles, order, difficulty,
and learner completion state. It never exposes source UUIDs.

Task detail before submission returns only the exercise material:

- Part 1 image URL, instructions, required words, and their supplied meanings;
- Part 2 email prompt and ordered response requirements;
- current content version.

It does not return samples, structure suggestions, ideas, outlines, chunks, gap
references, or other answer-like reference content.

Draft writes require the task content version. A response is trimmed for
validation but preserves the Learner's original internal whitespace. Part 1
accepts 1-1,000 Unicode characters and Part 2 accepts 1-10,000. A version
mismatch returns `409 WRITING_CONTENT_VERSION_CONFLICT` without altering the
stored draft.

Submission requires `contentVersion`, `submissionKey`, and response text. The
same Learner and submission key returns the existing submission. Reusing a key
for a different task, content version, or response returns a conflict. A
successful transaction creates the immutable submission and deletes the
matching draft.

Submission detail verifies ownership and returns the response plus the
post-submission reference material appropriate to the Part. A request for
another Learner's draft or submission returns `404` so ownership is not
disclosed.

The image endpoint verifies that the task is published, resolves only its
validated storage-relative media key, sets the stored MIME type and a bounded
cache policy, and never exposes the filesystem path.

## Web Experience

The localized catalog route is:

```text
/{locale}/learn/cert/toeic/writing
```

Focused session and result routes are:

```text
/{locale}/toeic/writing/part-1/{taskId}
/{locale}/toeic/writing/part-2/{taskId}
/{locale}/toeic/writing/submissions/{submissionId}
```

Every route file remains a thin server component that renders a view from
`app/views/toeic-writing`. Capability behavior, resource APIs, hooks, state,
and presentation components live under `app/features/toeic-writing`.

The catalog uses `ToeicBrowseContainer`, a compact back link and heading, and
two Part tabs. It does not render Part 3. Cards show task order, difficulty, and
submitted/not-submitted state; they never render a source UUID. Ordering is the
backend source order. The page has a Writing-specific skeleton and responsive
one-column mobile layout.

The desktop session is a two-pane focused workspace:

- the left pane presents the image or email prompt and task requirements;
- the right pane presents the editor, character/word count, autosave state, and
  submit action;
- a sticky footer presents Previous, task position, and Next controls.

Mobile stacks prompt before editor and keeps the primary submit/navigation
controls reachable without horizontal scrolling. Existing shadcn primitives
and `rounded-md` styling are used instead of feature-local button or input
reinventions.

The editor owns transient text while the feature autosave queue persists full
snapshots to the backend. The queue is serialized: only one request is in
flight, and rapid changes collapse to the newest pending snapshot. The UI shows
Saving, Saved, and Not saved states. A failed save keeps the text on screen and
offers retry. Navigation and submission flush pending saves first.

After submission, the result view places the Learner response beside the
source reference response and displays the Part-specific reference structures.
It clearly labels these as reference material, not a score. A Learner may start
a new draft for the same task after submission; prior submissions remain
immutable.

## Error Handling

- Unknown or unpublished task: `404 WRITING_TASK_NOT_FOUND`.
- Another Learner's draft/submission: `404` with the same public shape.
- Blank or oversized response: `400 WRITING_RESPONSE_INVALID`.
- Stale task content version: `409 WRITING_CONTENT_VERSION_CONFLICT`.
- Conflicting submission-key reuse: `409 WRITING_SUBMISSION_KEY_CONFLICT`.
- Missing private image: bounded server error without a filesystem path.
- Source authorization failure: no identity fallback and no database access.
- Source shape drift or invalid media: reject the affected package.

HTTP failures remain logged once by the common exception filter. Use cases do
not duplicate logs or include prompt, response, token, cookie, or authorization
content in diagnostics.

## Testing

Automated tests use small repository-authored synthetic fixtures. They never
contact the source and do not reproduce licensed prompts or samples.

Pipeline tests cover:

- strict Part 1 and Part 2 parsing;
- deterministic inventory and content checksums;
- approved-SHA enforcement;
- Part-specific validation and exact first-inventory counts;
- image MIME, bytes, checksum, safe storage root, and resume behavior;
- authorization failure without identity fallback;
- idempotent import, changed-version replacement, and missing Course failure;
- preservation of drafts and submissions during content replacement.

API tests cover:

- published catalog and progress projection;
- no reference content before submission;
- draft ownership, upsert, deletion, size limits, and version conflict;
- idempotent submission and conflicting key reuse;
- immutable response and content-version snapshots;
- reference content only through an owned submission;
- image path containment and publication checks;
- thin controller delegation and wire mapping.

Web tests cover:

- localized thin-route imports;
- catalog ordering, Part switching, and absence of source UUIDs;
- serialized autosave, retry, flush-before-submit, and local text retention;
- submit locking and result navigation;
- reference-content gating;
- Vietnamese and English message completeness;
- responsive layout and no horizontal overflow.

Development uses the narrowest test first. Final verification runs:

```text
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

Automated verification does not download source data, apply migrations, or
import content. Those remain explicit operator actions against a named local or
deployed environment.

## Delivery Sequence

1. Shared wire contracts and synthetic canonical fixtures.
2. Canonical schemas, validators, safe storage, and source inventory.
3. Resumable Part 1 media/content download and offline validation.
4. Reviewed Prisma migration and idempotent importer.
5. Learner catalog and pre-submission task API.
6. Backend drafts and serialized Web autosave.
7. Idempotent submissions and gated reference results.
8. Responsive Part 1 and Part 2 learner UI with complete i18n.
9. Narrow and full repository verification.
10. Separately authorized inventory, download, migration, import, and smoke
    test against the chosen environment.

Step 10 performs external and database writes and is not implied by completion
of the implementation code.

## Acceptance Criteria

The phase is complete when:

- the private pipeline deterministically validates 48 Part 1 and 50 Part 2
  authorized tasks and all required Part 1 images;
- repeated import creates no duplicate tasks and preserves learner history;
- every task belongs to the existing `toeic-600` Course and only published
  tasks appear to Learners;
- catalog, task, draft, submission, result, and image APIs enforce authentication
  and ownership;
- reference answers and learning structures cannot be retrieved before an
  owned submission;
- draft autosave survives navigation and reports failures without losing the
  editor text;
- submission is idempotent and stores an immutable response and content version;
- Part 1 and Part 2 work on desktop and mobile with complete English and
  Vietnamese copy;
- no AI score is displayed or persisted in this phase;
- licensed content, media, credentials, and source payloads remain outside Git;
- all relevant repository verification gates pass.
