# TOEIC Reading Practice Mode Design

**Date:** 2026-08-02  
**Status:** Approved for planning

## Problem

The current TOEIC Reading session treats Part 5, Part 6, Part 7, and Full Test as variants of the same exam experience. A learner can answer one active question at a time, but correctness and explanations only appear after submitting the whole scope. This makes Part practice feel like a test instead of guided learning.

The existing Part 7 stimulus can also contain source HTML displayed as literal text. Practice mode must render supported content safely rather than expose markup such as `<div>` and `<p>`.

## Goals

- Make Part 5, 6, and 7 sessions guided practice experiences.
- Grade each answer immediately without exposing the answer key before an answer is submitted.
- Persist practice progress under the authenticated account so another device can resume it.
- Show explanations and available translations after grading.
- Preserve the current deferred-grading Full Test experience.
- Provide a responsive workspace suited to the different reading requirements of Parts 5, 6, and 7.

## Non-goals

- Generating missing explanations, translations, or vocabulary with AI.
- Adding bilingual or vocabulary enrichment where the imported source has no reviewed data.
- Changing the scoring behavior of Full Test.
- Building annotations, reports, a dictionary, or saved-word actions in the first release.
- Replacing the existing TOEIC Reading content import pipeline.

## Product Decision

TOEIC Reading uses two separate session behaviors over the same published content:

1. **Part Practice** (`scope=5`, `scope=6`, or `scope=7`) grades one answer immediately and reveals feedback for that question.
2. **Full Test** (`scope=full`) keeps the existing draft, submission, and result flow and never reveals correctness before final submission.

The server remains the owner of answer keys. Learner test-detail responses must not include correct option identifiers or explanations that reveal the answer before grading.

## Alternatives Considered

### A. Dedicated practice session and answer records — selected

Create a server-owned practice session and persist each graded response separately. This supports cross-device resume, reliable correct/incorrect counts, retries, and future weak-question review without coupling practice to exam submissions.

### B. Reuse the draft JSON and submit the whole Part repeatedly

This reduces schema work but rewrites a growing JSON document on every answer and overloads the exam submission contract. It also makes per-answer idempotency and progress queries harder.

### C. Send the answer key to the browser

This gives instant local feedback but exposes every correct answer before the learner responds. It is rejected.

## Interaction Design

### Part Practice

- Render one active question at a time.
- Selecting an option submits that option immediately for grading.
- Disable duplicate option submissions while the request is pending.
- When grading succeeds, show the selected answer, the correct answer, explanation, and available translations.
- A question is graded once per practice session. Its options become read-only after success; retrying an incorrect question starts a new retry session.
- Keep feedback visible when the learner returns to an already answered question.
- Allow Previous, Next, direct question navigation, and Mark for review.
- Completing the Part shows a compact summary with actions to retry incorrect questions, restart the Part, or return to the test list.
- If grading fails, retain the learner's pending selection, show a retry action, and do not automatically move to another question.

### Full Test

- Retain the current active-question UI, authenticated draft autosave, final confirmation, submission, and result page.
- Do not show correctness, correct answers, explanations, or translations that disclose the answer while the attempt is active.

## Layout

### Desktop

- Use a full-height practice shell with a compact sticky header and sticky bottom navigation.
- Part 5 uses an approximately 38/62 workspace. The left pane contains instructions and available learning aids; the right pane contains the active question and feedback.
- Part 6 and Part 7 use an approximately 50/50 workspace. The stimulus stays in the left pane while the active question and feedback scroll in the right pane.
- The two panes scroll independently at `lg` and above.
- The bottom navigation contains Previous, a question-status trigger, and Next or Complete.

### Mobile and tablet

- Below `lg`, use one document flow rather than independent panes.
- Place the stimulus before the question and allow it to collapse after the learner has read it.
- Keep bottom navigation sticky and add enough content padding so it never covers controls or feedback.
- The question drawer shows answered-correct, answered-incorrect, unanswered, active, and marked states.
- No fixed minimum widths may expand `document.scrollWidth` beyond the viewport.

## Components

- `ToeicReadingPracticeShell`: practice header, progress, and bottom navigation.
- `ToeicReadingWorkspace`: responsive Part-specific pane layout.
- `ToeicReadingPassagePane`: sanitized stimulus rendering, translation disclosure, sticky/collapsible behavior.
- `ToeicReadingQuestionPane`: prompt, options, pending state, and graded state.
- `ToeicReadingFeedback`: correct answer, explanation, and available translations.
- `ToeicReadingQuestionDrawer`: direct navigation and question status legend.
- `ToeicReadingPracticeSummary`: Part completion and retry actions.

Full Test continues to use the existing exam-oriented view. Shared presentational pieces may be extracted only when their behavior is genuinely identical.

## API Contract

All routes require authentication.

### Start or resume

`POST /api/toeic/reading/practice-sessions`

Request:

```json
{
  "testId": 10,
  "part": 5,
  "sourceVersion": "approved-source-version"
}
```

The operation is idempotent for the user's active session for the same test, Part, and source version. It returns the session, learner-safe question data, restored graded answers, counts, and active question.

### Grade an answer

`POST /api/toeic/reading/practice-sessions/:sessionId/answers`

Request:

```json
{
  "questionId": 123,
  "optionId": 456,
  "requestKey": "client-generated-idempotency-key"
}
```

Response:

```json
{
  "questionId": 123,
  "selectedOptionId": 456,
  "correct": false,
  "correctOption": {
    "id": 457,
    "label": "B",
    "text": "will represent"
  },
  "explanation": "Available reviewed explanation or null",
  "questionTranslation": "Available reviewed translation or null",
  "optionTranslations": [],
  "progress": {
    "correct": 3,
    "incorrect": 1,
    "answered": 4,
    "total": 30
  },
  "nextQuestionId": 124
}
```

The endpoint validates that the question belongs to the session's test and Part and that the source version is still published. Repeating the same `requestKey` returns the original result.
The first successful response for a question is authoritative for that session. A later request that selects another option for the same question is rejected as a conflict.

### Read session

`GET /api/toeic/reading/practice-sessions/:sessionId`

Returns learner-safe content, persisted graded results, marked questions, active question, and summary counts. Correct-answer data is present only for questions already graded in that session.

### Update navigation state

`PATCH /api/toeic/reading/practice-sessions/:sessionId`

Persists `activeQuestionId` and marked question identifiers without grading an answer.

### Complete

`POST /api/toeic/reading/practice-sessions/:sessionId/complete`

Marks the session complete and returns its summary. Completion does not mutate or submit a Full Test attempt.

## Persistence

Add dedicated practice persistence rather than extending the draft JSON:

- `toeic_reading_practice_sessions`: user, test, Part, source version, status, active question, timestamps, and completion time.
- `toeic_reading_practice_answers`: session, question snapshot, selected option snapshot, correct option snapshot, correctness, feedback snapshots, idempotency request key, and answered time.
- Persist marked-question identifiers as a validated integer array in a session JSON field.

Store answer and feedback snapshots so a later content replacement cannot rewrite historical feedback. Enforce user ownership in every query, a unique session/question constraint, and a unique request-key constraint for answer idempotency.

## Safe stimulus rendering

- Convert imported HTML fragments to a documented safe subset during rendering or normalization.
- Allow structural reading content such as paragraphs, line breaks, tables, emphasis, and images when present.
- Remove scripts, inline event handlers, unsafe URLs, and arbitrary styling.
- Plain-text stimuli continue to render with preserved line breaks.
- Add fixtures covering the current literal `<div>`/`<p>` failure.

## State and error handling

- The server is authoritative for graded state and counts.
- React Query owns remote session state; component state may hold only the pending option and transient UI state.
- Disable answer options while a grade request is pending.
- A failed request leaves the current question and pending choice visible with Retry.
- A source-version conflict blocks further grading and offers Reload/return to list.
- A missing explanation or translation is omitted cleanly rather than shown as an empty panel.
- Unauthorized or foreign session identifiers return not found/forbidden without leaking session data.

## Delivery slices

1. Shared contracts, migration, persistence mappers, and practice-session use cases.
2. Practice APIs with ownership, version, grading, and idempotency tests.
3. Part 5 practice UI end to end.
4. Safe stimulus rendering and Part 6/7 workspace reuse.
5. Responsive, accessibility, navigation, retry, resume, and Full Test regression coverage.

## Testing

- Unit-test grading, ownership, version conflicts, idempotency, restore, completion, and retry-incorrect selection.
- Controller-contract tests verify routes and validation.
- Frontend state tests verify pending, graded, failed, restored, and completed states.
- Rendering tests verify correct-answer data appears only after grading.
- Sanitization tests cover permitted and rejected HTML.
- Responsive tests cover 360, 390, 768, 1024, and 1440 widths and assert no horizontal overflow.
- Existing Full Test draft/submission tests must remain green.

## Success criteria

- A Part learner receives correctness and feedback immediately after selecting an answer.
- Refreshing or using another authenticated device restores the same practice session.
- Full Test still reveals no answers before final submission.
- Part 6/7 passages render as formatted content rather than literal source tags.
- Practice pages produce no horizontal overflow at the target widths.
