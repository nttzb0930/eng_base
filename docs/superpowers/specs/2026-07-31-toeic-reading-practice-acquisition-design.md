# TOEIC Reading Practice Acquisition Design

## Goal

Create an operator-run pipeline that inventories public/free Dautoeic mock
tests and downloads only their TOEIC Reading content from Parts 5, 6, and 7.
The first operator run is a bounded pilot containing the 10 newest tests in the
2026 source set.

The pipeline preserves source content as private, versioned canonical JSON for
validation and review before any database import. It does not replace or modify
the existing 70 bilingual `reading_passages` packages.

## Scope

The first delivery includes:

- public/free mock-test inventory with source-set and test ordering;
- `--set` and `--limit-tests` boundaries, defaulting the documented pilot to
  source set `2026` and 10 tests;
- direct retrieval of only Parts 5, 6, and 7 for approved tests;
- canonical normalization of test metadata, questions, passage groups,
  choices, answer keys, explanations, translations, and referenced media;
- an independent, time-stamped practice-statistics snapshot containing the
  source-provided Level, error rate, and attempt count when available;
- deterministic checksums and versioned private packages;
- resumable downloads with bounded concurrency;
- offline validation and an aggregate completeness report;
- metadata/JSON download without Reading media by default, followed by an
  explicit `--media-only` operation;
- CLI operation without a database connection;
- credentials supplied through CLI input or an ignored private authorization
  file, never committed to Git or printed.

The first delivery excludes:

- premium, hidden, or RLS-protected records;
- bypassing authentication, authorization, paywalls, or source filters;
- database migrations or imports;
- Admin and learner interfaces;
- attempts, progress, scoring, or analytics;
- deleting or reclassifying the previously acquired bilingual Reading data;
- downloading Listening Parts 1 through 4, transcripts, or audio during the
  Reading pilot;
- automatic publication.

## Domain Boundaries

This content is TOEIC practice content, not CEFR Reading content.

```text
Course(code = toeic-600)
  -> public mock test
      -> skill = READING
          -> Part 5 | Part 6 | Part 7
              -> stimulus (optional)
              -> question(s)
                  -> choices and answer key
```

CEFR level and vocabulary topic are not acquisition requirements.

The source practice-statistics RPC currently returns `difficulty_level`,
`error_rate`, and `total_attempts`. These values represent a changing
performance-based grouping used by the source UI. They are not stable authored
content metadata and therefore must not participate in package identity,
storage paths, content checksums, completeness requirements, or learner-domain
classification. They are preserved in a separate, time-stamped snapshot so the
initial source grouping can be reviewed without changing canonical content
versions.

The 70 existing `reading_passages` packages remain a separate supplementary
bilingual-reading collection:

```text
var/licensed-content/dautoeic/reading/
```

The new practice bank uses:

```text
var/licensed-content/dautoeic/toeic-reading-practice/
```

## Recommended Acquisition Strategy

The pipeline first creates an immutable inventory, then downloads only records
approved by that inventory.

```text
public source
  -> inventory public mock-test metadata
  -> select source set 2026 and newest 10 tests
  -> operator verifies count and checksum
  -> download only questions in Parts 5, 6, and 7
  -> download only passages referenced by those questions
  -> optionally attach the public practice-statistics snapshot
  -> offline validation
  -> aggregate report
```

It must not seed the database directly. Canonical files form the review and
rollback boundary between an external source and application persistence.

## Source Access and Safety

The source adapter may call only public operations used by the source
application to retrieve free Reading practice content. It may use the public
anonymous key required by Supabase to identify the anonymous role.

The adapter must:

- accept only configured HTTPS source and media hosts;
- select tests only from source-returned public/free test metadata;
- request only Parts 5 through 7 for the approved test IDs;
- retrieve only passages referenced by the selected Reading questions;
- retain only records returned to the anonymous/public authorization context;
- reject or report records marked premium, hidden, or otherwise unavailable;
- stop on `401`, `403`, or RLS denial instead of retrying with another identity;
- never guess IDs or enumerate outside returned source indexes;
- redact authorization values and signed URL query parameters from logs;
- use timeouts, bounded retries, and bounded concurrency.

Source accessibility is not itself a license grant. The operator remains
responsible for confirming that acquisition and intended use are authorized.

## Inventory

The inventory command discovers source-visible mock tests and their Reading
question indexes without downloading question bodies, passage bodies, media,
Listening content, or connecting to PostgreSQL.

It reports:

- visible and accepted source-set and test counts;
- selected test IDs and deterministic source order;
- question counts by Part;
- standalone-question and passage-group counts;
- public/free, premium, hidden, malformed, and inaccessible counts;
- media counts and known/unknown byte sizes;
- duplicate source IDs and missing relationships;
- the observed source difficulty/error-rate distribution as non-authoritative,
  time-stamped diagnostics when the public RPC returns it;
- an inventory SHA-256 derived from canonical inventory content.

For the current 10-test pilot, the expected Reading baseline is 300 Part 5
questions, 160 Part 6 questions, and 540 Part 7 questions: 1,000 questions in
total. Inventory reports actual public rows and fails approval if a selected
test does not advertise the standard `30/16/54` Reading distribution.

The source UI's Level totals are treated as a statistics snapshot, not as
separate downloadable content sets. A mismatch is visible to the operator and
does not trigger ID guessing or restricted-data access.

## Canonical Package

One canonical package contains the complete Reading subset of one source mock
test. It is stored at:

```text
toeic-reading-practice/
  <sourceTestId>/
    <sourceVersion>/
      content.json
      practice-stats.json
      manifest.json
      validation.json
      media/
```

`content.json` contains:

```ts
type ToeicReadingPracticeTest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetId: string;
  sourceTestId: string;
  sourceVersion: string;
  title: string;
  parts: Array<{
    part: 5 | 6 | 7;
    stimuli: Array<{
      sourceStimulusId: string;
      kind: "text" | "image" | "mixed";
      body: string | null;
      translation: string | null;
      mediaIds: string[];
    }>;
    questions: Array<{
      sourceQuestionId: string;
      sourceNumber: number;
      stimulusId: string | null;
      prompt: string;
      translation: string | null;
      explanation: string | null;
      choices: Array<{
        label: string;
        text: string;
        correct: boolean;
      }>;
    }>;
  }>;
  media: Array<{
    id: string;
    sourceUrl: string;
    storagePath: string | null;
    sha256: string | null;
    bytes: number | null;
    contentType: string | null;
    status: "PENDING" | "DOWNLOADED";
  }>;
};
```

`practice-stats.json` contains source item identity, Part, observed Level,
error rate, total attempts, and observation time. It is optional when the
public RPC does not return statistics and never affects `sourceVersion`.

`manifest.json` contains provenance, source-set/test identity, acquisition
time, license reference, content checksum, inventory checksum, statistics
snapshot checksum, and media state. The manifest must not contain credentials.

`validation.json` contains only bounded validation findings and counts; it must
not duplicate the full licensed content.

## Identity, Versioning, and Resume

Stable identity is `source + sourceTestId`. A deterministic checksum of the
Reading content, excluding dynamic statistics and media download state, becomes
`sourceVersion`.

- Unchanged tests reuse the existing version and are reported as resumed.
- Changed Reading content creates a new version directory.
- Complete verified packages are never overwritten.
- Interrupted downloads use a checkpoint and atomic finalization.
- A download requires the approved inventory checksum, preventing a different
  inventory from being downloaded accidentally.

## Validation

Every pilot package must satisfy:

- stable non-empty source-set, source-test, stimulus, and question IDs;
- Parts are exactly 5, 6, and 7;
- exactly 30 Part 5, 16 Part 6, and 54 Part 7 questions;
- exactly 100 Reading questions with unique source numbers;
- source numbers are `101..200`;
- every question has a non-empty prompt or a resolvable stimulus;
- every question has the expected source choices and exactly one correct
  choice;
- choice labels are unique within a question;
- Part 5 has no required shared passage;
- Parts 6 and 7 preserve their source passage/stimulus relationship;
- metadata-only validation permits referenced Reading media with `PENDING`
  status;
- full-media validation requires every referenced Reading asset locally and
  verifies byte and SHA-256 metadata;
- package checksum matches the canonical content.

Cross-package validation reports duplicate test IDs and question IDs. It also
verifies the selected pilot has 10 packages and 1,000 Reading questions.

Invalid tests are retained in a rejected report and are not finalized as valid
canonical packages.

## Commands

The pipeline exposes:

```text
data:inventory-toeic-reading-practice
data:download-toeic-reading-practice
data:validate-toeic-reading-practice
```

The documented pilot invocations are:

```text
data:inventory-toeic-reading-practice --set=2026 --limit-tests=10
data:download-toeic-reading-practice --set=2026 --limit-tests=10 --skip-media
data:validate-toeic-reading-practice --set=2026 --limit-tests=10
data:download-toeic-reading-practice --set=2026 --limit-tests=10 --media-only
```

Inventory and download do not require `.env` or a database. Authorization may
come from an explicit CLI argument or:

```text
var/licensed-content/dautoeic/source-authorization.txt
```

The private file is ignored by Git. Command output contains counts, storage
keys, and checksums only.

## Testing

Automated tests use synthetic fixtures and mocked `fetch`:

- source-set ordering, 10-test limiting, pagination, and Part filters;
- no Listening questions, transcripts, or audio requests;
- dynamic difficulty/error-rate statistics do not affect identity or content
  checksums;
- anonymous authorization and redaction;
- exclusion of premium and hidden records;
- deterministic inventory and content checksums;
- 100-question per-test Reading validation with `30/16/54` distribution;
- Part 5 standalone and Part 6/7 passage-group mapping;
- exactly one correct choice;
- resume and atomic finalization;
- unsafe host, path traversal, authorization failure, and malformed source
  rejection;
- validation without `.env` or PostgreSQL.

Real inventory and download are operator actions and are not executed by CI,
application startup, migrations, or tests.

## Acceptance Criteria

- The existing 70 bilingual Reading packages remain untouched.
- The approved pilot selects the 10 newest public/free tests in source set 2026.
- Inventory reports 300 Part 5, 160 Part 6, and 540 Part 7 questions before
  download, or fails without downloading content.
- Download processes only the operator-approved inventory.
- Every completed test has 100 Reading questions, canonical content, a
  statistics snapshot when available, manifest, and validation.
- The default pilot download fetches no Listening content or audio and leaves
  Reading media pending until the explicit `--media-only` operation.
- The example Part 5 sentence numbered 119 is acquired if and only if it is
  included in the public/free records returned by the approved source
  inventory.
- No credentials or licensed content are committed to Git or printed in logs.
- No database connection is required for inventory, download, or validation.
