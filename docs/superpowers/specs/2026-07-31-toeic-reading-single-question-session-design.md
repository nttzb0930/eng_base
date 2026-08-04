# TOEIC Reading Single-Question Session Design

## Goal

Replace the current long-form TOEIC Reading session with a focused flow that
renders one question at a time. Learners retain full control over question
order, answers, and review markers while avoiding a 30- or 100-question page.

## Scope

- Apply to Full Test and Part 5, Part 6, and Part 7 practice.
- Keep the existing API detail response and fetch the complete selected test
  once.
- Keep answer selections, review markers, and submission identity in client
  state.
- Preserve the existing exact-completeness requirement for submission.
- Do not change database schema, API contracts, grading, or attempt history.

## Interaction

- The session opens at the first question in source-number order.
- Only the active question is rendered.
- `Previous question` moves back one position and is disabled on the first
  question.
- `Next question` moves forward one position and does not require an answer.
- On the final question, the primary forward action becomes `Submit test`.
- Selecting a number in question navigation activates that question directly.
- Answer and review state remains unchanged while moving between questions.
- The header shows both the active position and answered progress.
- Submission remains unavailable until all questions have answers. An
  incomplete session keeps the learner in the test with its state intact.

## Part 6 and Part 7 Stimuli

When the active question references a stimulus, the session renders that
stimulus immediately before the question. Questions sharing a stimulus reuse
the same API object but only the active question is rendered. A question
without a stimulus renders independently.

## Component Boundaries

- `toeic-reading-session-state.ts` owns pure active-question navigation helpers
  in addition to answer and review state.
- `ToeicReadingSessionView.tsx` owns active-question orchestration, Previous,
  Next, and Submit actions.
- `ToeicPartNavigation.tsx` receives the active question ID and emits a question
  selection callback. It remains responsible for answered and review
  indicators.
- `ToeicQuestion.tsx` and `ToeicStimulus.tsx` remain presentation components.

## Accessibility and Responsive Behavior

- Previous and Next are native buttons with localized accessible names.
- Question-number controls are buttons rather than fragment links because they
  change client state instead of scrolling.
- The active question has an explicit current-state treatment and
  `aria-current`.
- Focus moves to the active question heading after question navigation.
- On narrow screens, navigation remains usable without rendering the entire
  question list in the main content column.

## Testing

- Pure state tests cover initial position, Previous/Next bounds, and direct
  question selection.
- Architecture tests protect single-question rendering and callback-based
  question navigation.
- Existing answer, review, submission, i18n, route, API, and result tests remain
  green.
- Web test, typecheck, lint, format, and production build are required before
  handoff.
