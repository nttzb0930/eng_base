# ADR 0004: Persist Vocabulary Progress

## Status

Accepted

## Context

Saved Words Review originally scored a local session only. The app needs persistent per-word progress before spaced repetition, review queues, audio practice, or LLM personalization can be meaningful.

## Decision

Add `user_vocabulary_progress`.

The table stores:

- `user_id`
- `vocabulary_item_id`
- `correct_count`
- `wrong_count`
- `review_count`
- `mastery_level`
- `ease_factor`
- `interval_days`
- `repetition_count`
- `last_reviewed_at`
- `next_review_at`

Review, practice, and flashcard result flows update this table through
capability-owned use cases. Updates that increment counters must be atomic so
concurrent answers cannot overwrite one another.

## Consequences

- `/saved-words` can show mastery state and review stats.
- `/saved-words/review` can prioritize due and weak words.
- Scheduling can evolve without changing the frontend response interface.
- Progress mutation requires behavioral and concurrency tests because it is a
  shared learner-state boundary.
