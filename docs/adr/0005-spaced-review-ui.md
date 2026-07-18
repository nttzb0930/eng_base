# ADR 0005: Add Spaced Review UI Before Advanced Scheduling

## Status

Accepted

## Context

The app now persists vocabulary progress and review scheduling fields. Users need a clear way to review due words separately from all saved words.

## Decision

Add review summary UI to the localized saved-words route.

- Show total saved words.
- Show due words.
- Show learning, review, and mastered counts.
- Support `/{locale}/saved-words/review?mode=due`.
- Support `/{locale}/saved-words/review?mode=all`.

Due words are vocabulary items with no progress yet or `nextReviewAt <= now`.

## Consequences

- Users can focus on due words first.
- Review scheduling becomes visible without adding a more complex spaced repetition algorithm yet.
- Queue scoring belongs to API use cases under
  `apps/api/src/module/review/use-cases`; it can change without changing page
  routes.
