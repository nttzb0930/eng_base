# TOEIC Listening Parts 1–4 Design

**Status:** Approved in conversation
**Date:** 2026-07-31

## Goal

Add TOEIC Listening Part 1–4 for the same ten source tests already imported for
Reading Part 5–7. Each test provides a standalone 100-question Listening test
and Part-specific practice. Licensed audio and images are downloaded to private
local storage, while learner answers, playback progress, and results are owned
by the backend.

## Confirmed product decisions

- Import Part 1–4 for all ten existing Test 1–10 records.
- Match Listening to Reading by `source` and `sourceTestId`, never by title.
- Store licensed audio and images below
  `var/licensed-content/dautoeic/toeic-listening-practice/`; do not commit them.
- A Listening Full Test contains 100 questions and remains separate from the
  existing 100-question Reading Full Test. A combined 200-question exam is a
  later phase.
- Part practice permits pause, seek, and unlimited replay.
- Full Listening permits pause and resume but forbids seek and replay through
  the normal product UI.
- Full Test keeps transcript, translation, answer correctness, explanation, and
  vocabulary guidance hidden until submission.
- Part practice may reveal correctness and learning support for one question
  only after the learner selects an answer and the API grades that selection.
- Part 1 shows an image and answer labels A–D without option text.
- Part 2 shows only the question number and answer labels A–C.
- Part 3 and Part 4 show the printed questions and options for each
  three-question audio group.
- Full, Part 1, Part 2, Part 3, and Part 4 drafts are independent and expire 30
  days after the latest save.

## Scope

### Included

- Inventory, size reporting, resumable download, canonicalization, validation,
  and idempotent import for the ten approved source tests.
- Local audio/image persistence with manifest, content checksum, byte size, and
  content type.
- Database links between TOEIC questions/stimuli and media assets.
- Listening-specific list, detail, draft, attempt, result, and media APIs.
- Full Listening and Part 1–4 learner browsing and sessions.
- Backend draft restoration and serialized Web autosave.
- Immutable result snapshots with transcript and translation.
- English and Vietnamese learner copy.

### Excluded

- A combined 200-question Reading plus Listening session.
- Difficulty Level 1–5 inference.
- Subscription or premium bypass.
- Browser TTS as a substitute for exam audio.
- Uploading licensed media to Git or exposing provider URLs.
- Proctoring-grade anti-cheat enforcement.
- Admin editing of licensed Listening packages.

## Source identity and matching

The approved Reading inventory is the authority for the ten selected tests.
Listening inventory reads its exact `(sourceSetId, sourceTestId, title, order)`
records and requests only Part 1–4 content belonging to those source test IDs.

Database identity remains:

```text
(source = "dautoeic", source_test_id)
```

For example, Reading Test 1 currently uses:

```text
sourceSetId  c9b365d2-4035-40a0-be44-2380359266eb
sourceTestId ad780150-f675-42b9-8ced-246862b0d0a8
```

Listening Part 1–4 must use the same IDs. A mismatch in source set, source test,
title, or order rejects the package before download/import. The importer never
creates a second test by matching a display title.

## Canonical content and local storage

Each downloaded test package is stored at:

```text
var/licensed-content/dautoeic/toeic-listening-practice/
  <sourceTestId>/
    <listeningSourceVersion>/
      content.json
      manifest.json
      validation.json
      media/
        <sha256>.<extension>
```

`content.json` contains normalized Parts, stimuli, questions, choices,
transcripts, translations, and references to media IDs. It does not embed media
bytes. `manifest.json` records source identity, package version, every media
checksum, byte size, content type, and relative storage path.

Download and inventory do not require a database connection. Authorization is
read through the existing private source-authorization adapter and is never
printed or persisted in a package. Download is resumable and skips an existing
file only after its checksum and byte size match.

## Required TOEIC structure

Every package must satisfy:

| Part | Questions | Required presentation                 | Required media               |
| ---- | --------: | ------------------------------------- | ---------------------------- |
| 1    |         6 | One photograph, labels A–D            | Image and audio per question |
| 2    |        25 | Labels A–C; no printed prompt/options | Audio per question           |
| 3    |        39 | 13 groups of three printed questions  | Audio per group              |
| 4    |        30 | 10 groups of three printed questions  | Audio per group              |

Validation rejects:

- any count other than 6/25/39/30 or a total other than 100;
- a question outside Part 1–4;
- missing or duplicate question numbers;
- a Part 1 question without both image and audio;
- a Part 2 question without audio or without exactly A/B/C;
- a Part 3/4 group without audio or without exactly three questions;
- missing or multiple correct choices;
- missing transcript required for post-submit review;
- missing local media, a checksum mismatch, unsupported content type, or zero
  byte media;
- a source identity mismatch against the approved Reading inventory.

Source probing may discover provider-specific field names, but those fields are
normalized into this fixed canonical contract. If the source cannot provide the
required mapping, inventory fails with a categorized report instead of
guessing.

## Persistence model

### Existing aggregate

`toeic_tests`, `toeic_stimuli`, `toeic_questions`,
`toeic_question_options`, and `toeic_media_assets` remain the content owner for
all seven Parts.

The existing `toeic_tests.source_version` continues to identify Reading content
so importing Listening cannot invalidate an active Reading session. Add:

- `listening_source_version` nullable SHA-256;
- `listening_status` with `DRAFT`/`PUBLISHED`;
- `listening_published_at`.

Listening is visible only when its status is `PUBLISHED` and all 100 questions
and required media are valid.

Add immutable transcript fields to question and stimulus records. Question
transcript serves Parts 1–2; stimulus transcript serves grouped Parts 3–4.

Add a media-binding table:

```text
toeic_media_bindings
  media_asset_id
  question_id nullable
  stimulus_id nullable
  role AUDIO | IMAGE
  ordinal
```

A database check requires exactly one owner: question or stimulus. This permits
one asset to be reused without duplicating its metadata and makes content/media
association explicit.

### Import behavior

Listening import finds the existing test by `(source, source_test_id)` and
transactionally replaces only:

- Part 1–4 questions and options;
- Part 1–4 stimuli;
- their media bindings and unreferenced Listening media metadata;
- Listening version/publication fields.

Part 5–7 content, Reading version, Reading attempts, and Reading drafts are
preserved. The same Listening version is skipped. A new version replaces Part
1–4 atomically and publishes only after validation.

### Attempts

Listening owns separate tables:

- `toeic_listening_attempts`;
- `toeic_listening_attempt_answers`.

Attempts use `(user_id, submission_key)` idempotency and a normalized
fingerprint containing test, scope, Listening version, and answers. Answer
records persist immutable snapshots of question number, Part, selected/correct
choice, prompt where printable, transcript, transcript translation,
explanation, and relevant media identity.

### Drafts

`toeic_listening_drafts` has unique identity:

```text
(user_id, test_id, scope)
```

Scope values are `FULL`, `PART_1`, `PART_2`, `PART_3`, and `PART_4`. A complete
snapshot stores:

- Listening source version;
- active question/group;
- selected answers;
- review question IDs;
- completed media asset IDs;
- active media asset ID, if any;
- latest persisted playback position in milliseconds;
- timestamps and 30-day expiry.

The user ID always comes from JWT request context. Save validation ensures all
questions, options, and media belong to the published test and selected scope.
Successful submission deletes the matching draft in the attempt transaction;
an identical idempotent retry also cleans up the draft.

## API design

All routes use the learner JWT guard:

```text
GET    /toeic/listening/overview
GET    /toeic/listening/tests?part=1|2|3|4
GET    /toeic/listening/tests/:testId?part=1|2|3|4
POST   /toeic/listening/tests/:testId/check-answer
GET    /toeic/listening/tests/:testId/draft?part=1|2|3|4
PUT    /toeic/listening/tests/:testId/draft
DELETE /toeic/listening/tests/:testId/draft?part=1|2|3|4
POST   /toeic/listening/attempts
GET    /toeic/listening/attempts?part=1|2|3|4
GET    /toeic/listening/attempts/:attemptId
GET    /toeic/listening/media/:assetId
```

Omitting `part` means Full Listening.

Test detail returns:

- printable prompt/options only for Parts 3–4;
- option labels without text for Parts 1–2;
- opaque internal media asset IDs;
- Part 1 image asset IDs;
- no correctness, transcript, translation, explanation, provider URL, or
  filesystem path.

Part-practice answer checking requires an explicit Part, current Listening
source version, question ID, and selected option ID. The API verifies that all
four belong to the same published test and Part before returning correctness,
the correct choice, question/transcript translation, explanation, and a small
set of matching entries from the canonical vocabulary catalog. There is no
Full-Test form of this endpoint, so the normal learner detail contract never
becomes an answer-key download.

Attempt result returns immutable review snapshots, including transcript,
translation, correct answers, explanations, and replayable internal media IDs.

## Media delivery

The API resolves an opaque asset ID to a downloaded `storage_path`, verifies
that the resolved absolute path remains inside the configured licensed-content
root, and streams only assets with `DOWNLOADED` status. It supports `HEAD` and
single HTTP byte ranges with correct `Accept-Ranges`, `Content-Range`,
`Content-Length`, and `Content-Type` headers.

The API never sends `source_url` or `storage_path`. Missing files, invalid
ranges, and checksum/status failures return stable errors and are logged without
authorization data.

This is product-level playback control rather than proctoring. A determined
technical user could still call authenticated media requests directly.

## Playback policy

### Part practice

- Explicit play button for each question/group.
- Play, pause, seek, and replay are available.
- Moving between questions does not consume the media.

### Full Listening

- The learner performs one explicit “Start Listening” gesture to satisfy browser
  autoplay requirements.
- Audio follows numeric question/group order.
- Pause/resume is allowed.
- Seek and replay controls are absent.
- Completing an audio marks its asset as consumed in the backend draft.
- Reload while an asset is incomplete resumes near the last persisted position.
- A completed asset cannot be replayed through the normal Full Test UI.

Playback position is checkpointed at a limited interval and on pause/end, while
answers, review markers, active position, and completion transitions use the
same serialized latest-snapshot queue as Reading. The queue is flushed before
submission so a late save cannot recreate a deleted draft.

Before Full Listening begins, the client preflights the first required asset.
If playback fails mid-asset, the learner may retry/resume that same asset; it is
not considered consumed until the ended event.

## Learner UI

The TOEIC overview enables the Listening card and links to:

```text
/:locale/learn/cert/toeic/listening
```

The browser exposes Full Listening and Part 1–4 tabs. Each Test 1–10 card shows
question count, backend draft progress, latest result, and Start/Continue/Retry
action.

The focused session route is:

```text
/:locale/toeic/listening/tests/:testId?scope=full|1|2|3|4
```

Session presentation uses a responsive split workspace. On desktop, the left
pane owns instructions, audio, and question/stimulus images; the right pane owns
the active question group, answer feedback, learning-support disclosures,
navigation, and previous/next actions. Mobile stacks these regions in the same
order.

Session presentation:

- Part 1: photograph, question number, and A–D labels.
- Part 2: question number and A–C labels.
- Parts 3–4: one group audio with three printed questions/options.
- Navigation distinguishes active, answered, review-marked, consumed-audio, and
  not-yet-heard questions without relying on color alone.
- Saving, saved, and save-error states are localized.
- Local interactive state is retained after a save error.
- Learner progress is never stored in `localStorage`.
- Part practice grades a selected option immediately. Correctness is announced
  accessibly and the learner may expand question translation and matching
  vocabulary guidance. Full Test renders neither immediate feedback nor those
  learning aids before submission.

The result route shows total score, per-Part score, answers, transcript,
translation, explanation, Part 1 image, and review audio. Result audio permits
replay.

## Error handling

- Inventory/download reports authentication, source-shape, network, media, and
  validation failures separately.
- Import is all-or-nothing per test and never publishes incomplete Listening.
- A save using an outdated Listening version returns 409 without overwriting or
  deleting the existing draft. On the subsequent reload, draft loading detects
  that stale version, removes the unusable snapshot, and initializes the current
  package cleanly.
- An unavailable asset prevents starting Full Listening.
- A mid-stream network error preserves answers and the last acknowledged
  playback checkpoint.
- An invalid or expired draft is removed and the session starts clean.
- Submission validation rejects missing, duplicate, foreign, or wrong-scope
  answers without deleting the draft.

## Testing strategy

### Pipeline

- Fixture-driven source adapters for Parts 1–4.
- Approved Reading inventory identity matching.
- Count, grouping, choice, transcript, media, checksum, resume, and manifest
  tests.
- Idempotent merge tests proving Part 5–7 are preserved.
- Default tests never access the provider or database.

### API

- Migration constraints and cascade behavior.
- Learner detail does not select or return correctness/transcript.
- Authenticated account/scope isolation.
- Draft validation, expiry, version conflict, and playback state.
- Idempotent grading and immutable result snapshots.
- Draft cleanup on new and retried submission.
- Media path containment, HEAD, valid/invalid ranges, missing files, and
  content-type headers.

### Web

- Resource paths and cache identities.
- Serialized autosave and playback checkpoint collapsing.
- Draft restoration and consumed-media enforcement.
- Part 1–4 presentation and hidden text rules.
- Full versus Part playback controls.
- Accessible player/navigation states.
- English/Vietnamese message parity, route architecture, type-check, lint, and
  production build.

## Rollout

1. Implement inventory and run size-only reporting for the approved ten IDs.
2. Operator approves the inventory SHA and reported local media size.
3. Download and validate all ten private packages.
4. Add/review migration and importer; do not apply either automatically.
5. Operator applies migration and runs the idempotent importer.
6. Smoke test Test 1 in Part practice and Full Listening.
7. Verify draft restore, media resume, submission, result transcript, and that
   Reading Part 5–7 remain unchanged.
8. Enable Listening availability only for fully published tests.

## Success criteria

- The same ten database test identities contain Reading Part 5–7 and Listening
  Part 1–4 without duplicate test rows.
- Every published Listening test has exactly 100 valid questions and complete
  local media.
- Normal learner APIs do not expose answer keys, transcripts, provider URLs, or
  filesystem paths before submission.
- Part practice and Full Listening enforce their distinct playback policies.
- Drafts restore per account/test/scope and successful submission removes them.
- Existing Reading behavior, attempts, drafts, and source version remain valid.
