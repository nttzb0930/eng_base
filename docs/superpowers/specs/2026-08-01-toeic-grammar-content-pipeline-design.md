# TOEIC Grammar Content Pipeline Design

## Goal

Add a private, reproducible pipeline that acquires the Grammar content the
configured source account is permitted to read, validates it offline, and
imports an approved snapshot into English Base. The resulting data will support
a later TOEIC Reading UI with two branches: test practice and grammar practice.

This phase delivers data acquisition, persistence, tests, and operator
documentation. Learner API endpoints and the Grammar UI are explicitly outside
this phase.

## Product shape

The later learner experience will organize TOEIC Reading as:

```text
TOEIC Reading
|-- Test practice
|   |-- Part 5
|   |-- Part 6
|   |-- Part 7
|   `-- Full Reading (100 questions)
`-- Grammar practice
    |-- By topic and subtopic
    |-- Mixed sets
    `-- Difficulty levels 1-5
```

Grammar is useful throughout TOEIC Reading, with its strongest direct
application in Part 5 and a substantial supporting role in Part 6. It is not
owned by an individual mock test.

## Scope

The source snapshot contains all accessible records in these three views:

1. Visible Grammar topics and subtopics, plus their accessible questions.
2. Accessible mixed Grammar sets and the questions assigned to each set.
3. Accessible difficulty levels 1 through 5 and their question membership.

The pipeline does not invoke source AI functions, generate missing content,
bypass subscription checks, or attempt to infer hidden records. Source access
rules remain authoritative.

## Architecture

Grammar is a separate API-owned capability. It must not be represented as a
synthetic TOEIC mock test or inserted into the existing `toeic_questions`
hierarchy.

The normalized persistence model is:

```text
grammar_topics
  `-- grammar_subtopics
        `-- grammar_questions
              `-- grammar_question_options

grammar_sets
  `-- grammar_set_questions -- grammar_questions

grammar_question_difficulties -- grammar_questions
```

Every source-owned entity retains its stable source identifier. Questions are
deduplicated by `(source, source_question_id)` so the same question can appear
under a subtopic, in one or more mixed sets, and in one difficulty level without
duplicating its body or answer key.

Difficulty is source classification metadata, not CEFR. A difficulty record may
also retain source-provided attempt or error-rate statistics when present.

## Private storage

Generated and downloaded artifacts live under the ignored private root:

```text
var/licensed-content/dautoeic/
|-- inventories/toeic-grammar/<inventorySha256>.json
`-- toeic-grammar/<snapshotVersion>/
    |-- content.json
    |-- manifest.json
    `-- validation.json
```

The repository contains schemas, source adapters, validators, import behavior,
tests, and documentation only. Downloaded source content is never committed.

The existing private authorization files are reused:

```text
var/licensed-content/dautoeic/source-authorization.txt
var/licensed-content/dautoeic/source-user-access-token.txt
```

The first file holds the public source API key. The second holds a short-lived
user access token and may contain either the raw JWT or `Bearer <JWT>`. Commands
must never accept the user token as a CLI argument or print either credential.

## Pipeline

### 1. Inventory

`data:inventory-toeic-grammar` performs bounded read-only requests and records:

- visible topic and subtopic identifiers;
- accessible mixed-set identifiers and access metadata;
- accessible question counts by topic, set, and difficulty level;
- exclusions and authorization failures;
- a deterministic SHA-256 of the normalized inventory.

Catalog requests that the source exposes anonymously use the public API key as
the anonymous bearer identity. Requests that require an authenticated identity
use the user token. A missing or expired token fails with a categorized error;
the command does not silently downgrade to an incomplete authenticated
inventory.

### 2. Download

`data:download-toeic-grammar -- --approved-sha=<SHA256>` accepts only an exact
64-character inventory checksum. It reads that inventory from private storage,
downloads accessible question content in bounded batches, normalizes shared
questions, and writes a complete snapshot atomically.

A complete `manifest.json` is the completion marker. Re-running an interrupted
download resumes completed work and does not rewrite a complete identical
snapshot.

### 3. Offline validation

`data:validate-toeic-grammar` makes no network or database connection. It
verifies:

- unique and valid source identifiers;
- topic/subtopic referential integrity;
- exactly four non-empty options per question;
- exactly one valid correct option;
- valid mixed-set question membership and ordering;
- difficulty levels restricted to integers 1 through 5;
- question membership references only canonical questions;
- manifest identity and content checksum consistency.

Missing required content is rejected rather than repaired or generated.

### 4. Import

`data:import-toeic-grammar -- --approved-sha=<SHA256>` is the only command in
this workflow that connects to PostgreSQL. It reads a locally validated
snapshot and replaces the source-owned Grammar catalog in one transaction.

Idempotency uses `(source, snapshot_sha256)`. Importing the active checksum
returns `SKIPPED`. A new approved checksum atomically replaces source-owned
topics, subtopics, questions, options, sets, memberships, and difficulty
metadata, then marks the new snapshot active immediately. It does not modify
learner progress because that behavior is not introduced in this phase.

An import failure rolls back the whole snapshot. It must never leave a mixture
of old and new source content.

## Canonical contract

The canonical JSON snapshot has this conceptual shape:

```text
schemaVersion
source
snapshotVersion
inventorySha256
contentSha256
topics[]
  subtopics[]
questions[]
  options[]
sets[]
  questionIds[]
difficultyLevels[]
  questionIds[]
```

Question records may preserve source-provided Vietnamese translation,
Vietnamese and English explanations, answer translation, vocabulary JSON, and
AI-preference flags. Optional enrichment fields remain optional; their absence
does not trigger generation.

## Error handling and safety

- Only HTTPS requests to the configured source allowlist are accepted.
- Redirect targets are checked against the same allowlist.
- Requests use finite timeouts, bounded retries, and bounded worker counts.
- Authentication failures, rate limits, malformed responses, validation
  failures, and database failures have distinct operator-facing categories.
- Logs contain counts, source record IDs, checksum prefixes, and categories;
  they never contain tokens, authorization headers, complete responses, or
  answer content.
- Inventory and download do not load the application `.env` or connect to the
  database.
- Import requires an exact approved checksum and the normal API database
  configuration boundary.

## Testing strategy

Implementation follows red-green-refactor. Tests cover:

- anonymous versus authenticated source requests and header separation;
- token normalization without token logging;
- response parsing and rejection of malformed question/option data;
- deterministic inventory hashing;
- shared-question deduplication across topics, sets, and levels;
- checkpoint resume and atomic completion markers;
- offline referential and answer-key validation;
- import idempotency, full replacement, and transaction rollback;
- command boundaries proving inventory/download/validate stay database-free;
- package scripts and private-storage documentation.

Narrow script tests run during development. Before handoff, the relevant API
tests, type checks, lint, architecture checks, and build gates run according to
`docs/guides/verification.md`.

## Follow-up phase

After this pipeline is stable and one approved snapshot is imported, a separate
design will expose learner-safe Grammar APIs and add the Grammar branch to the
TOEIC Reading UI. That phase must keep answer keys server-owned before grading
and persist progress per authenticated learner.
