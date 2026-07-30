# Licensed TOEIC Content Pipeline Design

## Goal

Create an operator-run pipeline that retrieves every TOEIC mock test exposed
by the authorized Dautoeic source, preserves the licensed source material in
private local storage, validates each complete 200-question test, imports valid
tests as reviewable drafts, and requires an explicit Admin action before
publication.

The pipeline is an offline content operation. It is never invoked by API
startup, application builds, migrations, seeds, or CI. Source accessibility is
not treated as permission: operators are responsible for confirming that the
configured source account, endpoint, and license authorize retrieval and use.
The repository does not contain source credentials or licensed test content.

## Scope

The first delivery includes:

- an authorized Dautoeic source adapter;
- full source inventory and media-size estimation before download;
- resumable retrieval of all visible test sets and tests;
- canonical normalization of test metadata, passages, transcripts, questions,
  answer options, answer keys, images, and audio;
- strict validation of one complete 200-question TOEIC test at a time;
- private, versioned canonical packages with provenance and checksums;
- idempotent database import in `DRAFT` state;
- an Admin list/detail review flow with validation and provenance information;
- explicit publish and unpublish actions;
- ownership by the immutable `toeic-600` Course.

The first delivery excludes:

- learner test-taking screens;
- attempts, scoring, progress, analytics, or certificates;
- automatic publication;
- scraping data that the authorized source does not return;
- bypassing authentication, row-level security, paywalls, or access controls;
- committing licensed test text or media to Git;
- background or scheduled synchronization.

## Architecture and Ownership

Certificate remains a Course as required by ADR 0022. The TOEIC test catalog is
a Course-owned content capability linked to the Course whose immutable code is
`toeic-600`. It does not introduce independent Certificate enrollment,
Certificate progress, or vocabulary membership.

The existing Course `LessonChallenge` model is intentionally not overloaded.
It supports short `SELECT` and `ASSIST` learning challenges but cannot preserve
TOEIC parts, shared stimuli, transcripts, audio, image assets, source
provenance, test-level publication, or a 200-question integrity boundary.
Dedicated TOEIC test-content tables therefore store the mock-test aggregate
while retaining `course_id` as the ownership link.

```text
Course(code = toeic-600)
  -> TOEIC test set
      -> TOEIC test (DRAFT | PUBLISHED)
          -> stimulus
          -> question
              -> option
          -> media asset
```

The API module follows the repository's pragmatic Clean Architecture:

```text
controller -> use case -> repository -> Prisma adapter
```

Admin is a delivery surface, not a separate owner. Source acquisition remains
under offline API scripts and does not become an HTTP endpoint.

## Source Authorization and Configuration

The Dautoeic adapter reads runtime configuration from local environment
variables. Source URL, Supabase URL, anonymous key, user token, or any future
authorized credential must not be committed, printed, copied into canonical
JSON, or returned by validation reports.

The adapter uses only source operations required to:

1. list test sets;
2. list tests visible to the configured authorization context;
3. retrieve questions and shared passages for each test;
4. retrieve source media referenced by that content.

The implementation must not attempt to discover hidden records, weaken source
filters, guess identifiers, or invoke privileged endpoints. A request that
returns `401`, `403`, or a row-level-security denial is reported and not
retried as a different identity.

The adapter is isolated behind a provider-neutral interface so source parsing
does not leak into validation, storage, import, or Admin behavior.

## Operator Commands

The pipeline exposes explicit package commands with non-zero failure exits:

```text
data:inventory-toeic-source
data:download-toeic-source
data:validate-toeic-content
data:import-toeic-drafts
```

`inventory` performs source discovery and media `HEAD` or bounded metadata
requests. It reports:

- source test-set and test counts;
- question and passage counts returned by source inventory;
- media asset counts grouped by audio and image;
- known byte total, unknown-size count, and estimated download size;
- tests that do not advertise a complete question inventory.

It does not download media bodies, create canonical packages, or access
PostgreSQL.

`download` retrieves all authorized tests by default. Optional source set/test
filters may narrow an operator run for recovery or diagnosis but cannot broaden
source authorization. It normalizes content, downloads media, validates each
test, and writes private packages. A single invalid test does not discard other
valid packages; the process finishes with a bounded batch report and a non-zero
exit when any test is rejected.

`validate` works only from private canonical packages and does not call the
source or database. `import` works only from packages that passed validation
and does not call the source.

## Private Storage

The storage root is configured by `TOEIC_CONTENT_STORAGE_DIR`. Its safe
repository-local default is:

```text
var/licensed-content/toeic/
```

The entire `var/licensed-content/` tree is ignored by Git. The pipeline refuses
to use a storage root that resolves to the repository root, the user's home
directory, a filesystem root, or a tracked repository path.

Each source test and source version receives an immutable package:

```text
var/licensed-content/toeic/
  dautoeic/
    <source-test-id>/
      <source-version>/
        manifest.json
        test.json
        validation.json
        media/
          <sha256>.<extension>
```

Temporary downloads use a sibling partial file and are atomically renamed only
after byte-count and checksum verification. Checkpoints record completed source
records and media hashes so interrupted runs can resume without re-downloading
verified files.

Licensed content, source payload snapshots, transcripts, answers, and media
remain private. Git stores only code, canonical schemas, validation rules,
documentation, and test fixtures authored specifically for repository tests.
Fixtures must not reproduce source questions.

## Canonical Package

`manifest.json` contains package-level provenance:

- canonical schema version;
- source provider and source test identifiers;
- source test-set identifier;
- source URL;
- retrieval timestamp;
- source version derived from an upstream version when available, otherwise a
  deterministic content digest;
- license name;
- license reference supplied through operator configuration;
- intended use recorded by the operator;
- content and media file checksums;
- byte counts and MIME types;
- validation status and report checksum.

`test.json` contains normalized content:

- source identifiers and display metadata;
- title and optional description;
- ordered TOEIC parts;
- ordered stimuli with passage text, transcript, and media references;
- exactly 200 ordered questions;
- each question's source identifier, number, part, prompt, stimulus reference,
  and ordered options;
- exactly one correct option per question;
- optional explanation when supplied by the source.

Canonical records never contain source credentials, local absolute paths,
database IDs, publication status, learner state, or timestamps owned by the
database.

Unknown source fields are not silently copied. Provider parsing uses strict
input adapters, and intentional canonical additions require a schema-version
change.

## Retrieval, Rate Limiting, and Media

Retrieval is bounded and respectful:

- configurable concurrency with a conservative default;
- request timeout and maximum response-body size;
- exponential retry for transient `429` and `5xx` responses only;
- support for `Retry-After`;
- no retry for authorization or structural validation failures;
- maximum redirect count;
- HTTPS-only media by default;
- allowlisted source hosts;
- streamed media writes rather than buffering large audio files in memory.

Images and audio are downloaded into the canonical package rather than
hotlinked. Deduplication is content-addressed by SHA-256, so repeated assets do
not require duplicate physical storage when the storage adapter can safely
reuse them. MIME type, extension, declared size, actual size, and checksum are
recorded.

The first implementation uses private filesystem storage. Object storage is a
future adapter and does not change the canonical manifest.

## Validation

Validation occurs before database access. Each test is accepted or rejected as
one aggregate.

Blocking rules include:

- required source, license, version, and checksum metadata;
- exactly 200 questions;
- unique and contiguous question numbers `1..200`;
- valid TOEIC parts `1..7`;
- standard part distribution:
  - Part 1: 6;
  - Part 2: 25;
  - Part 3: 39;
  - Part 4: 30;
  - Part 5: 30;
  - Part 6: 16;
  - Part 7: 54;
- non-empty prompts where the part requires textual prompts;
- the expected option labels for the normalized question;
- exactly one correct option per question;
- no duplicate option labels or normalized option text within a question;
- every stimulus reference resolves within the test;
- every canonical media reference resolves to a verified local asset;
- no unreferenced credential-like values in canonical content;
- manifest and file checksums match the stored bytes.

The source may represent listening prompts primarily through audio or images.
Validation therefore follows part-aware prompt requirements rather than
requiring non-empty visible text for every question.

Non-blocking editorial warnings include missing explanations, absent optional
transcripts, suspiciously duplicated prompts across questions, missing media
size metadata, and unexpected but harmless source metadata.

Rejected tests are not imported. Their private validation reports retain
source identifiers, error paths, and safe diagnostics without copying secrets
or full question text into logs.

## Persistence Model

A migration introduces Course-owned TOEIC content tables:

- `toeic_test_sets`
  - `id`, `course_id`, `source`, `source_set_id`, title, order and timestamps;
- `toeic_tests`
  - `id`, `test_set_id`, `source_test_id`, title, source version,
    `DRAFT | PUBLISHED`, provenance fields, content checksum, publication
    timestamps and timestamps;
- `toeic_stimuli`
  - `id`, `test_id`, part, order, passage, transcript and timestamps;
- `toeic_questions`
  - `id`, `test_id`, optional `stimulus_id`, source question ID, question
    number, part, prompt, explanation and order;
- `toeic_question_options`
  - `id`, `question_id`, label, text, correctness and order;
- `toeic_media_assets`
  - `id`, `test_id`, optional `stimulus_id`, media kind, storage key, source
    URL, MIME type, bytes and checksum.

Database constraints enforce source identity uniqueness, question-number
uniqueness within a test, option-label uniqueness within a question, and
content-address identity where appropriate. Aggregate validation remains in a
use case because relational constraints alone cannot prove a complete TOEIC
part distribution or exactly 200 questions.

No attempt or progress table is added in this phase.

## Idempotent Import

Import resolves `Course.code = toeic-600` before any content write. If the
Course is absent, import fails without creating a substitute Course.

Source identity is:

```text
source + sourceTestId
```

For each valid package:

- a missing source identity creates a complete `DRAFT` aggregate;
- an existing `DRAFT` with a different package checksum is replaced
  transactionally from the new canonical version;
- an unchanged `DRAFT` is skipped;
- an existing `PUBLISHED` test is skipped and never changed by import.

Each test imports in its own transaction. One failing aggregate rolls back
fully while independent valid tests can still import. The final command
reports created, updated, unchanged, published-skipped, rejected, and failed
counts. Re-running the same package creates no duplicates.

Import stores only private storage keys, never machine-specific absolute paths.

## Admin Review and Publication

Admin receives:

- a paginated test list filtered by status, set, source, and search;
- source identity, version, checksum, retrieval date, license reference, counts,
  validation result, and media completeness;
- a detail view organized by Parts 1–7;
- stimulus, transcript, question, option, answer-key, image, and audio review;
- explicit `Publish` and `Unpublish` actions.

Publication re-runs aggregate validation against database state. A test cannot
publish unless:

- it contains exactly 200 valid questions with the required part distribution;
- every question has one correct option;
- every required stimulus and media record resolves;
- provenance and license reference are present;
- the linked Course remains `toeic-600`.

Publish changes only status and publication timestamps. It does not make any
learner route available in this phase. Unpublish returns a test to `DRAFT`,
after which a later import may replace it.

Admin cannot edit source identity, source version, checksums, or correctness
provenance in the first delivery. Editorial mutation of licensed source content
requires a separate design because it changes the relationship between source
version and canonical checksum.

## API and Shared Contracts

Shared types expose Admin list/detail response shapes, publication status,
filter query shapes, and publish/unpublish responses. Nest-only validation DTOs
remain within the API module.

The API exposes Admin read and publication routes only. Download and import are
not reachable over HTTP.

Controller behavior is limited to authentication/authorization, DTO handling,
and calling goal-named use cases. Repository interfaces and Prisma adapters own
persistence operations.

## Failure Handling and Observability

Operator logs use bounded summaries. They may contain source provider, source
set/test IDs, safe URLs, counts, byte totals, checksum prefixes, validation
paths, and retry status. They must not contain credentials, complete question
content, answer keys, or signed media URLs.

Expected failure categories are:

- authorization/configuration;
- source transport/rate limit;
- source shape/version drift;
- incomplete test;
- invalid answer key;
- missing or invalid media;
- private storage safety;
- canonical checksum mismatch;
- missing `toeic-600` Course;
- database transaction.

An interrupted download retains verified checkpoints. A failed import never
deletes canonical packages.

## Testing

All automated tests use synthetic repository-authored TOEIC-like fixtures.
They do not contact Dautoeic and do not contain copied source material.

Tests cover:

- strict source-adapter parsing and provider-neutral mapping;
- inventory counts and byte estimation with unknown sizes;
- rate limiting, retry behavior, authorization failure, and host allowlisting;
- resumable streamed media download and checksum verification;
- path traversal and unsafe storage-root rejection;
- canonical schema validation;
- the exact 200-question and Part 1–7 distribution rules;
- missing/duplicate answers, questions, stimuli, and media;
- deterministic version and manifest checksums;
- draft create/update/unchanged behavior;
- published-content protection;
- transaction rollback;
- missing `toeic-600` Course;
- Admin list/detail mapping and publication validation;
- authorization on every Admin route;
- architecture boundaries for scripts, module, Shared, and Admin views.

Verification includes narrow tests followed by workspace architecture checks,
type checking, lint, tests, formatting checks, and production builds.

No real source download, migration application, database import, or publication
is part of automated verification. Those are explicit operator actions against
a named environment.

## Delivery Sequence

Implementation proceeds in checkpoints:

1. canonical schemas, synthetic fixtures, validators, and storage safety;
2. authorized source inventory and dry-run size report;
3. resumable content/media downloader and canonical packaging;
4. persistence migration, repository, and idempotent draft importer;
5. Admin list/detail review and publish/unpublish;
6. local verification;
7. separately authorized source inventory;
8. separately authorized full download;
9. separately authorized migration/import into a named database;
10. manual Admin review and publication.

The implementation does not run steps 7–10 merely because their code is
complete. Each external or database-writing operation requires an explicit
operator command and environment choice.

## Acceptance Criteria

The phase is complete when:

- inventory reports every source-visible set/test and a defensible media-size
  estimate without downloading media bodies;
- full download can resume and produces private, checksummed packages;
- each accepted package proves exactly 200 valid questions and complete media;
- invalid tests are rejected without database writes;
- repeated import is idempotent and never overwrites published tests;
- every imported test belongs to the existing `toeic-600` Course and starts as
  `DRAFT`;
- Admin can inspect provenance, content, answers, and media and explicitly
  publish a valid test;
- licensed source content and credentials remain outside Git and bounded logs;
- all relevant repository verification gates pass.
