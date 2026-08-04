# TOEIC Dictation 2026 Design

**Status:** Approved in conversation  
**Date:** 2026-08-01

## Goal

Add a backend-owned dictation experience inside the TOEIC Course Listening
section. Phase 1 imports only the public/free 2026 collection from the approved
source and exposes it through an authenticated learner flow. The existing
Listening level/test flow remains available in the sibling `Nghe theo level`
tab.

## Confirmed product decisions

- Dictation is a sibling mode of TOEIC Listening, not a separate course.
- Phase 1 includes only collection `Đề 2026`.
- The phase contains 40 sets: Test 1–10 × Part 1–4, with 3,206 visible free
  items in the source inventory.
- Hidden items and all Pro/TOEIC MASTER sets are excluded.
- Users must sign in before opening dictation sets or submitting answers.
- Progress, attempts, typed text, accuracy, and mastery are stored by user in
  the backend; browser localStorage is not a source of truth.
- A new approved package replaces the prior imported version atomically and
  idempotently.
- Source media is downloaded to private local storage and never exposed as a
  provider URL or committed to Git.
- Mastery is reached at `accuracy >= 90`.

## Source findings and boundary

The source exposes `listening_sets` and `listening_items`. Anonymous metadata
inventory showed 129 visible sets, of which 120 are free and 9 are Pro. The
free sets are grouped into 2023, 2024, and 2026 collections. The 2026 free
collection contains 40 sets and 3,206 visible items. Items provide an audio
reference, English transcript, and Vietnamese translation.

The inventory pipeline must filter by:

```text
collection_name = "Đề 2026"
access_level = "free"
is_hidden = false
```

The pipeline must not use Pro rows that happen to be visible through a source
RLS mistake. A valid source authorization and permission to reproduce the
free content remain required for download/import.

## Product navigation

The existing TOEIC Listening route remains the owner of both modes:

```text
/:locale/learn/cert/toeic/listening?mode=level
/:locale/learn/cert/toeic/listening?mode=dictation
```

The page renders two localized tabs:

- `Nghe theo level`: existing TOEIC Listening full-test and Part 1–4 flow.
- `Nghe chép`: the new 2026 Test/Part dictation catalog.

The dictation catalog displays collection, Test 1–10, Part 1–4, item count,
correct/incorrect/unanswered counts, progress percentage, and a Start/Continue
action. The focused session displays one item at a time with audio, text input,
submit, result feedback, previous/next navigation, and a progress indicator.

## Domain model

Dictation content is not coerced into `toeic_questions`: source sets contain
short transcription items whose counts and grouping do not represent the
100-question Part 1–4 exam structure. Add a dedicated domain with these
logical records:

### `toeic_dictation_sets`

- internal id
- source, source set id, source version
- collection name, display name, test number, Part
- publication status and published timestamp
- imported item count and timestamps

Unique identity is `(source, source_set_id, source_version)`; the published
catalog identity is `(source, source_set_id)`.

### `toeic_dictation_items`

- set id and source item id
- stable order and optional source group metadata
- transcript and Vietnamese translation
- local audio asset id, duration, and validation status
- created/updated timestamps

### `toeic_dictation_progress`

One row per `(user_id, item_id)` containing latest accuracy, words correct,
total words, attempts, mastered flag, last typed text, last attempted time,
and completed time.

### `toeic_dictation_attempts`

Immutable submission records containing user, item, source version snapshot,
typed text, normalized comparison result, accuracy, word-level result JSON,
and submission timestamp. A client submission key makes retries idempotent.

Media metadata reuses the existing private asset/path-safety conventions but
must not reuse TOEIC exam question ownership or answer-option tables.

## Import and storage pipeline

Commands follow the existing licensed-content workflow:

```text
data:inventory-toeic-dictation -- --collection=2026
data:download-toeic-dictation -- --approved-sha=<sha>
data:validate-toeic-dictation
data:import-toeic-dictation -- --approved-sha=<sha>
```

Inventory performs source-shape validation and reports item count, audio count,
known bytes, unknown sizes, and checksum. Download is resumable and bounded by
configured concurrency. Canonical JSON excludes media bytes and records source
identity, version, transcript, translation, media checksum, content type, and
relative private storage path.

Validation rejects an item or package with missing transcript, missing audio,
unsupported/zero-byte media, checksum mismatch, duplicate source identity,
non-free/non-2026 membership, or invalid ordering. Import is transactional per
package: it creates/reuses the set, replaces only the matching dictation
version, binds local media, and publishes only after validation succeeds.

## API contract

All learner routes require JWT authentication:

```text
GET  /toeic/dictation/overview
GET  /toeic/dictation/sets?collection=2026&test=1&part=1
GET  /toeic/dictation/sets/:setId/items
GET  /toeic/dictation/sets/:setId/progress
POST /toeic/dictation/items/:itemId/submit
PUT  /toeic/dictation/sets/:setId/progress
GET  /toeic/dictation/media/:assetId
```

Catalog and item detail responses may include opaque audio asset ids, duration,
and item metadata, but must not include the source URL or filesystem path.
Before submission, the response must not expose the canonical transcript or
answer key. The submit response includes normalized score, word-level matches,
canonical transcript, Vietnamese translation, and mastery state.

The API verifies that the item belongs to a published 2026 free set and that
the authenticated user owns the progress/attempt being changed. Stale source
versions return a conflict without overwriting progress.

## Dictation grading

The server normalizes both strings by trimming, case-folding, normalizing
whitespace, and removing punctuation that is not meaningful for word matching.
It tokenizes the canonical transcript and typed text, aligns tokens in order,
and returns `wordsCorrect`, `totalWords`, `accuracy`, and a word-level result
for correct, missing, extra, and mismatched tokens. `accuracy >= 90` sets
`mastered=true`; a later lower score does not erase the historical attempts but
updates the latest progress state according to the product mastery policy.

## Error handling and security

- Source authentication, filtering, network, media, validation, and import
  failures are reported as separate categories.
- Pro or hidden content is rejected before download, even if the source API
  returns rows for anonymous requests.
- Media streaming checks status, checksum, and path containment before serving.
- Missing/expired progress returns a clean empty state.
- Duplicate submit keys return the original result without a second attempt.
- Transcript and translation are never logged with authorization data.

## Testing strategy

### Pipeline

- Fixture tests for 2026/free filtering and Pro/hidden rejection.
- Canonical checksum and manifest tests.
- Download resume, bounded concurrency, and media validation tests.
- Import idempotency and version replacement tests.

### API

- JWT/user isolation for catalog, progress, submit, and media.
- Transcript hidden before submit and returned after submit.
- Grading normalization, word alignment, and 90% mastery threshold.
- Idempotent retries, stale-version conflicts, and attempt snapshots.

### Web

- Mode tabs preserve `level` and `dictation` query state.
- Catalog sorting and Test/Part filters.
- One-item session, submit feedback, next/previous, and progress restore.
- English/Vietnamese message parity, loading/error/empty states.
- Typecheck, lint, focused tests, full tests, and production build.

## Rollout

1. Run inventory for 2026 and approve its SHA and reported media size.
2. Download and validate the private package.
3. Apply the migration and run idempotent import.
4. Smoke test Test 1 Part 1–4 through catalog, submit, reload, and progress.
5. Enable the dictation tab for published 2026 sets.
6. Consider 2024/2023 only after storage and product metrics are reviewed.

## Success criteria

- The TOEIC Listening page exposes both `Nghe theo level` and `Nghe chép`.
- All published 2026 free sets are discoverable with correct Test/Part counts.
- A signed-in learner can submit dictation, see word-level feedback, and resume
  progress on another session/device.
- No Pro/hidden content is imported, and no source URL/path leaks through the
  learner API.
- Existing TOEIC Listening full-test behavior remains unchanged.
