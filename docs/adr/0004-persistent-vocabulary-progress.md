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
- `last_reviewed_at`
- `next_review_at`

Saved Words Review updates this table after each answer.

## Consequences

- `/saved-words` can show mastery state and review stats.
- `/saved-words/review` can prioritize due and weak words.
- A future spaced repetition algorithm can deepen the scheduling implementation without changing the review UI interface.
