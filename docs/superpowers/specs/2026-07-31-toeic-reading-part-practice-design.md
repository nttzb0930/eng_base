# TOEIC Reading Part Practice Design

## Goal

Allow a learner to select Part 5, Part 6, or Part 7, choose one of the ten
published 2026 tests, complete only that Part, and receive a Part-specific
result and history entry.

The existing full 100-question test behavior remains compatible and is
available from the learner UI. The learner UI defaults to Part 5 because Part
practice is the priority in this phase.

## Confirmed content model

- The local approved inventory identifies the selected source set as `2026`.
- It contains ten source tests titled `Test 1` through `Test 10`.
- Each imported test owns:
  - Part 5: 30 questions.
  - Part 6: 16 questions.
  - Part 7: 54 questions.
- Part 6 and Part 7 keep their stimulus-to-question grouping.
- The source does not provide a trustworthy test-level difficulty. The UI must
  not invent Level 1 through Level 5.
- `updatedAt` is source record metadata, not the test year.

## Considered approaches

### 1. Filter questions only in Web

Web could download all 100 questions, hide two Parts, and submit the visible
answers. This is rejected because the backend currently requires every test
question, the attempt would not truthfully record its scope, and history could
not distinguish Part practice from a full test.

### 2. Add Part-aware API queries and persist the selected Part

The list and detail endpoints accept an optional Part. Submission carries that
Part, grading requires exactly the questions in that Part, and the attempt
stores a nullable Part snapshot. This is the selected approach because it
preserves the existing full-test contract while making Part practice explicit
and auditable.

### 3. Split every imported test into three database tests

This would duplicate test identity and provenance and make later full-test
composition harder. It is rejected.

## Data and provenance

The canonical TOEIC package will carry both:

- `sourceSetId`: immutable provider identity.
- `sourceSetName`: the provider label, currently `2026`.

The importer will persist `sourceSetName` into the existing
`toeic_test_sets.title` column. No new column is required for the year.
Re-import remains idempotent and updates the set title without duplicating
tests.

`toeic_reading_attempts` receives a nullable `practice_part` integer:

- `5`, `6`, or `7`: Part practice.
- `null`: legacy or full-test attempt.

The migration constrains non-null values to `5`, `6`, or `7` and adds a
learner/Part/history index. Existing attempts remain valid.

## Shared and HTTP contracts

`ToeicReadingAttemptSummary` and `ToeicReadingAttemptResult` expose
`practicePart: 5 | 6 | 7 | null`.

`ToeicReadingTestSummary` exposes:

- `sourceSetName`
- the existing test identity and source version
- Part counts
- the latest attempt matching the requested Part

The learner endpoints become:

- `GET /toeic/reading/tests?part=5|6|7`
  - With `part`, returns the published tests that contain that Part.
  - `questionCount` describes the selected Part.
  - `latestAttempt` is scoped to the same Part.
  - Without `part`, preserves the full-test response.
- `GET /toeic/reading/tests/:testId?part=5|6|7`
  - With `part`, returns only that Part's stimuli and questions.
  - Without `part`, preserves the full-test response.
- `POST /toeic/reading/attempts`
  - Accepts optional `practicePart`.
  - With a Part, requires exactly all questions from that Part and rejects
    answers from other Parts.
  - Without a Part, preserves full-test grading.
- `GET /toeic/reading/attempts?part=5|6|7`
  - Optional Part filter for future history views.

The submission fingerprint includes `practicePart`, so the same idempotency key
cannot be reused across different practice scopes.

## Learner UI

The TOEIC Reading browser uses four semantic tabs:

- Full Test
- Part 5
- Part 6
- Part 7

Part 5 is selected by default. Each tab displays ten cards when all imported
tests are published. Selecting Full Test does not start a fixed test
automatically; it shows `2026 / Test 1` through `2026 / Test 10`, and the
learner chooses which 100-question test to start. A card presents:

- `2026 / Test N`
- selected Part or Full Test
- Part-specific question count or 100 questions for Full Test
- latest Part-specific result, if available
- start or retry action

The canonical session URL is:

`/[locale]/toeic/reading/tests/[testId]?part=5|6|7`

The session renders only the selected Part and requires only its questions
before enabling submit. Full Test renders all three Parts and requires all 100
questions. Back navigation retains the selected Part or Full Test selection in
the browser query.

The result screen labels the attempt as Part 5, 6, or 7. Legacy/full attempts
continue to show the existing multi-Part summary.

All new copy is added to both English and Vietnamese catalogs with identical
placeholder trees. The Reading list and session retain their route-specific
skeletons.

## Errors and compatibility

- Unsupported Part query values return HTTP 400.
- A published test missing the requested Part behaves as not found.
- A submission with questions outside the selected Part returns HTTP 400.
- A changed source version continues to return HTTP 409.
- Existing full-test URLs and submissions without `practicePart` continue to
  work.
- Existing attempt rows require no backfill.

## Verification

Backend tests cover:

- Part query DTO validation.
- Part-filtered list and detail responses.
- Part-only grading and foreign-Part rejection.
- fingerprints separated by Part.
- persisted `practice_part` snapshots.
- source set name import and idempotent update.
- legacy full-test compatibility.

Web tests cover:

- query keys separated by Part.
- four accessible scope tabs with Part 5 as default.
- Full Test lists all ten tests and starts only the test selected by the
  learner.
- card links preserve the selected Part.
- session state uses only returned Part questions.
- result copy distinguishes Part practice from full tests.
- English/Vietnamese key parity.

Final gates:

```bash
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api build
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
cd apps/api
pnpm exec dotenv -e ../../.env -- prisma validate
git diff --check
```

Applying the database migration remains an operator action and is not part of
source implementation verification.
