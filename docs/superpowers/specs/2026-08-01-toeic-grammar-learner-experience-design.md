# TOEIC Grammar Learner Experience Design

## Goal

Expose the imported TOEIC Grammar snapshot as a complete authenticated learner
experience. Learners browse Grammar by topic, mixed set, or source difficulty,
practice one question at a time, receive server-graded feedback immediately,
and continue from progress stored against their account.

This phase includes the Shared wire interface, API behavior, persistence,
localized Web routes, list and practice views, and verification. It does not
generate missing explanations, translations, or vocabulary.

## Product shape

The existing TOEIC Reading browser gains a top-level mode switch:

```text
TOEIC Reading
|-- Test practice
|   |-- Full Reading
|   |-- Part 5
|   |-- Part 6
|   `-- Part 7
`-- Grammar practice
    |-- By topic
    |   `-- By subtopic
    |-- Mixed sets
    `-- Difficulty levels 1-5
```

Grammar practice uses every question in the selected collection. It is not a
random 20-question session. A learner may leave and later continue at the
first unanswered question. The same question may belong to several views, but
its learner progress is shared rather than duplicated.

## Routes and navigation

The main-shell routes are:

- `/learn/cert/toeic/reading`: existing test-practice browser;
- `/learn/cert/toeic/reading/grammar`: Grammar catalog.

The focused session route is:

- `/toeic/grammar/practice?mode=<mode>&target=<target>`.

`mode` is one of `topic`, `subtopic`, `set`, or `level`. `target` is a stable
source identifier for topic, subtopic, and set modes, and the decimal level
`1` through `5` for level mode. Invalid combinations fail closed and show the
localized unavailable state. All links preserve the active locale.

The existing Reading browser receives a two-item top-level switch for Test
practice and Grammar practice. Its existing Full/Part 5/Part 6/Part 7 controls
remain subordinate to Test practice and keep their current query behavior.

## Catalog experience

The Grammar catalog has three URL-backed tabs:

1. **By topic** shows ordered topics. Each topic exposes its ordered subtopics
   and may also start an aggregate topic practice.
2. **Mixed sets** shows the eight imported source sets.
3. **By level** shows source difficulty levels 1 through 5. These levels are
   explicitly labeled as practice difficulty and are not presented as CEFR.

Every actionable card shows:

- localized title, with the source title fallback when one locale is absent;
- total question count;
- latest-state correct, incorrect, and unanswered counts;
- a progress bar based on answered unique questions;
- Start, Continue, or Practice again according to server progress.

Catalog loading, empty, unavailable, and retry states use a page-specific
skeleton and the same visual language as current TOEIC Reading and Listening.
Cards use consistent height within each grid, but topic rows may expand to
show subtopics rather than forcing all content into equal-height cards.

## Practice experience

The focused view renders one active question at a time. It contains:

- a sticky header with a back link, answered progress, and current position;
- the English question and four options;
- immediate submitted-answer feedback;
- optional Vietnamese question translation, answer translation, explanation,
  and vocabulary after grading;
- Previous and Next controls in a sticky bottom action bar;
- a question navigator showing current, correct, incorrect, and unanswered
  states without relying on color alone.

The initial practice payload never includes correctness, the correct option,
private explanations, translations, or vocabulary. Selecting an option sends
one grading request. While the request is pending, that question is locked.
After a successful response, the selected answer is locked for that attempt
and feedback is displayed. A learner can answer the same question again on a
later visit; each deliberate submission is recorded.

The first active question is the first unanswered question. If every question
has been answered, practice begins at the first question and the UI labels the
collection as practice again. Navigation itself does not create progress.

## Learner-safe API

Grammar is an API-owned capability under `src/module/toeic-grammar`. It does
not reuse TOEIC Reading attempts or expose Prisma models.

### Catalog

`GET /toeic/grammar/catalog`

Returns the active snapshot identity plus ordered topic, subtopic, set, and
difficulty summaries. Each summary includes learner progress computed from
the current state of unique questions.

### Practice collection

`GET /toeic/grammar/practice?mode=<mode>&target=<target>`

Returns collection metadata, snapshot version, ordered safe questions, and the
learner's latest state for each question. Options contain only database ID,
label, and text. The response omits option correctness and all review-only
fields for unanswered questions.

For previously answered questions, the response contains the learner's last
selected option and whether that selection was correct, but it still does not
return the correct option or explanation until that question is submitted in
the current interaction. This prevents the list payload from becoming an
answer-key export while still allowing progress rendering.

### Grade an answer

`POST /toeic/grammar/answers`

The request contains:

- `submissionKey`: client-generated UUID for idempotency;
- `snapshotVersion`;
- `questionId` and `selectedOptionId`;
- `mode` and `target` practice context.

The API verifies that the active snapshot matches, the question belongs to the
requested collection, and the option belongs to the question. It grades from
the server-owned answer key, persists the attempt and aggregate progress in
one transaction, then returns:

- selected and correct option IDs;
- correctness;
- explanation and translation fields when present;
- vocabulary entries when present;
- updated question and collection progress.

A repeated `(userId, submissionKey)` returns the original result and does not
increment counters. A stale snapshot returns HTTP 409 so the Web client can
reload current content. Unknown membership and option mismatches return a
generic not-found or validation response without leaking the answer key.

## Persistence

Two learner-owned tables are added.

`grammar_question_attempts` is immutable history containing learner, question,
selected option, correctness, practice mode/context, submission key, and
timestamp. It preserves question, selected-option, and correct-option text
snapshots so later content replacement cannot rewrite history.

`grammar_question_progress` is the current aggregate keyed by learner and
source question identity. It contains attempts count, correct count, latest
selection, latest correctness, first answered timestamp, and updated timestamp.
Using source question identity keeps progress stable when a newly approved
snapshot replaces database row IDs for the same source-owned question.

The grading transaction inserts or reuses the idempotent attempt, then upserts
aggregate progress. Catalog counts are intersections between collection
membership and the learner's latest progress. No Grammar progress is stored in
`localStorage`.

## Shared and frontend ownership

Cross-runtime request and response types live in
`packages/shared/src/types/toeic-grammar.ts` and are exported from the root
`@repo/shared` interface.

Web behavior lives under `app/features/toeic-grammar`:

- `api/toeic-grammar.api.ts` owns endpoint paths and query keys;
- `hooks/use-toeic-grammar.ts` owns React Query coordination;
- feature components own catalog tabs, cards, feedback, navigator, and
  page-specific skeletons;
- local state utilities own active-question and one-time submission state.

Route-level composition lives under `app/views/toeic-grammar`. Route modules
remain thin and do not become Client Components. English and Vietnamese
messages are added together under a dedicated `toeicGrammar` namespace.

## Error handling

- Missing active content produces an empty catalog rather than an answer leak
  or database error.
- Catalog and practice reads expose localized retry states.
- A grading network failure preserves the selected option locally and enables
  an explicit retry using the same submission key.
- HTTP 409 prompts a content refresh before another submission.
- Double-clicks are disabled in the UI and are also safe at the API idempotency
  boundary.
- Optional enrichment is rendered only when non-empty. Missing content does
  not trigger an AI or external-source request.

## Testing and verification

Implementation follows red-green-refactor.

API tests cover learner-safe mapping, collection membership for every mode,
server-side grading, idempotency, snapshot conflict, progress aggregation, and
transaction behavior. Controller tests cover authentication, query validation,
and response status.

Web tests cover API paths and cache keys, URL mode parsing, progress labels,
answer-key absence, immediate feedback state, navigator semantics, retry with
the same submission key, i18n key parity, route thinness, and the prohibition
on Grammar progress in `localStorage`.

The narrow API, Shared, and Web tests run during implementation. Final handoff
runs architecture checks, full tests, type checks, lint, and build according to
the repository verification guide. Applying the migration remains an explicit
operator step; automated tests do not write to the user's development data.

## Delivery order

1. Shared learner-safe contracts and API repository/use-case/controller flow.
2. Progress migration and Prisma adapter with transactional grading.
3. Grammar catalog route, API adapter, hooks, cards, and localized skeleton.
4. Focused single-question practice route and immediate-feedback flow.
5. Integration with the TOEIC Reading mode switch and full verification.
