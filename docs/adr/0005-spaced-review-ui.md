# ADR 0005: Add Spaced Review UI Before Advanced Scheduling

## Status

Accepted

## Context

The app now persists vocabulary progress and review scheduling fields. Users need a clear way to review due words separately from all saved words.

## Decision

Add review dashboard UI to `/saved-words`.

- Show total saved words.
- Show due words.
- Show learning, review, and mastered counts.
- Support `/saved-words/review?mode=due`.
- Support `/saved-words/review?mode=all`.

Due words are vocabulary items with no progress yet or `nextReviewAt <= now`.

## Consequences

- Users can focus on due words first.
- Review scheduling becomes visible without adding a more complex spaced repetition algorithm yet.
- The next scheduling implementation can change queue scoring inside `modules/vocabulary/review-session.ts` without changing page routes.
