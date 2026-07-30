# TOEIC Reading Published Learning Design

**Date:** 2026-07-31  
**Status:** Approved for implementation planning

## Goal

Turn the validated private TOEIC Reading packages into a learner-facing
certificate learning flow. The first release imports the ten acquired tests,
publishes them immediately, exposes safe learner APIs, and enters the experience
from the existing **Learn -> By Certificate** card.

This design covers TOEIC Reading Parts 5, 6, and 7. Listening, Speaking,
Writing, premium source access, and Admin content editing remain outside this
release.

## Product flow

The existing `/learn` certificate card remains the entry point:

```text
/learn
  -> /learn/cert
  -> /learn/cert/toeic
  -> /learn/cert/toeic/reading
  -> /toeic/reading/tests/:testId
  -> /toeic/reading/results/:attemptId
```

The localized route tree remains canonical. Browsing routes use the main
Learner shell; an active test and its result use the focused session shell.

`/learn/cert` shows TOEIC as available when published content exists. IELTS,
TOEFL, and VSTEP may remain unavailable; the UI must not invent courses,
progress, or question counts. The TOEIC page presents Reading as available and
Listening as coming later.

## Content ownership and persistence

TOEIC content is a dedicated Course-owned aggregate associated with the
immutable Course code `toeic-600`. It does not become a CEFR Reading passage and
does not reuse `reading_passages`, because TOEIC tests have numbered parts,
grouped stimuli, source identity, and exam-specific scoring behavior.

The API owns these persistence concepts:

- TOEIC test set: source grouping and provenance.
- TOEIC test: one imported test, source version, publication status, and title.
- TOEIC stimulus: the text/image context shared by Part 6 or Part 7 questions.
- TOEIC question: source number, Part 5-7, prompt, translation, and explanation.
- TOEIC option: label, text, and correctness.
- TOEIC practice statistic: optional source difficulty/error-rate snapshot.
- TOEIC attempt: one learner submission and immutable result totals.
- TOEIC attempt answer: immutable question, option, and correctness snapshots.

The database identity for an external test is the unique pair:

```text
(source, source_test_id)
```

`source_test_id` is provenance only and is never shown to learners.
`source_version` is the canonical package checksum used to detect changes.

## Published idempotent import

The command is:

```powershell
pnpm --filter @repo/api data:import-toeic-reading-practice
```

It reads only complete packages from the ignored private storage directory and
requires an existing Course with code `toeic-600`. It never creates a Course,
applies a migration, or fetches source data.

Before opening a write transaction, every package is revalidated:

- schema version and source identity are valid;
- `sourceVersion` matches canonical content;
- exactly 100 questions exist;
- question numbers cover 101 through 200;
- Part counts are 30, 16, and 54;
- every question has exactly one correct option;
- all referenced stimuli and required local media resolve.

For each valid package:

- no existing `(source, sourceTestId)`: create the aggregate as `PUBLISHED`;
- same identity and same `sourceVersion`: skip without writing;
- same identity and a different `sourceVersion`: replace all owned content in
  one transaction and leave the aggregate `PUBLISHED`.

Replacement updates provenance and recreates stimuli, questions, options, and
practice statistics atomically. It never mutates previous attempt snapshots.
Each test has its own transaction, so one failed package does not roll back
other valid tests.

The command prints deterministic, sorted `created`, `updated`, `skipped`,
`rejected`, and `failed` collections and exits non-zero when a package is
rejected or a transaction fails.

## Learner API

All routes require an authenticated learner. The API exposes only tests whose
status is `PUBLISHED`.

```text
GET  /toeic/reading/overview
GET  /toeic/reading/tests
GET  /toeic/reading/tests/:testId
POST /toeic/reading/attempts
GET  /toeic/reading/attempts
GET  /toeic/reading/attempts/:attemptId
```

The overview returns real published test/question counts, availability by
skill, and learner summary data. The list supports Part and difficulty filters
without returning answer keys.

Test detail includes Parts 5-7, ordered stimuli, questions, and options. Before
submission it must not include:

- option correctness;
- correct-answer labels;
- grading explanations that reveal the answer;
- source authorization or private storage paths.

Submission accepts all selected option IDs plus a client-generated idempotency
key. The API validates that every selected option belongs to the submitted
question and test, grades on the server, and persists the attempt in one
transaction. Repeating an identical submission key returns the original
result; reusing the key with a different payload is rejected.

Attempt detail is user-scoped and may return answer correctness, correct-option
snapshots, explanations, totals, accuracy, and per-Part results.

## Learner UI

The UI follows the existing feature/view architecture:

```text
localized route -> app/views -> app/features/toeic-reading
  -> TOEIC resource API -> Auth-owned Web HTTP client
```

The certificate page uses API-backed availability. Selecting TOEIC opens a
certificate overview with:

- Reading availability and published test/question totals;
- Listening marked as coming later;
- recent activity and resume/result links when real data exists.

The Reading browser allows selection by full test or Part. The session presents:

- Part 5 as independent sentence-completion questions;
- Part 6 as grouped text-completion stimuli;
- Part 7 as single, double, or triple reading stimuli;
- progress, question navigation, selected-answer state, and review markers;
- explicit submit confirmation.

The result screen shows overall and per-Part accuracy, selected and correct
answers, explanations when available, and navigation back to TOEIC Reading.

Each route owns a layout-matching skeleton. All copy is synchronized in English
and Vietnamese. Keyboard operation, visible focus, semantic form controls, and
non-color-only result indicators are required.

## Replacement and active learners

Published content may be replaced automatically when its source version changes,
as explicitly approved for this workflow. A learner who loaded an older version
may not submit it against a newly replaced question set. Test detail therefore
returns the current `sourceVersion`, and submission includes that version. A
mismatch returns a bounded conflict asking the learner to reload.

Completed attempt history remains truthful because answer rows store immutable
question and option text snapshots. No result view depends on current mutable
test content.

## Error and empty states

- Missing `toeic-600`: importer stops before any package write.
- Invalid package/checksum: reject that package and do not open its transaction.
- No published content: certificate UI truthfully reports TOEIC Reading as
  unavailable.
- Replaced test during a session: API returns a version conflict; UI preserves
  no stale grading claim and asks the learner to reload.
- Failed or repeated submission: idempotency prevents duplicate attempts.
- Unauthorized attempt/result access: return not found or forbidden without
  leaking another learner's data.

## Delivery phases

1. Prisma migration and idempotent direct-publish importer.
2. Shared wire types, learner read APIs, and answer-key boundary tests.
3. Attempt submission, grading, history, and version-conflict handling.
4. Certificate/TOEIC/Reading browsing UI and focused Part 5 session.
5. Part 6/7 grouped-stimulus UI, results, localized skeletons, and accessibility.
6. Operational documentation and full verification.

The migration and importer may be implemented and verified offline, but applying
the migration and importing into a named database environment remain explicit
operator actions.
