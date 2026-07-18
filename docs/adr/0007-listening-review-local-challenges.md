# ADR 0007: Generate Listening Challenges Without Persisted Lesson Types

## Status

Accepted

## Context

Pronunciation audio exists on vocabulary items. Listening practice is valuable,
but adding a persisted lesson challenge type would couple the feature to seeded
lesson content and the Prisma enum.

## Decision

Generate `LISTEN_SELECT` challenges at request time in learner review or
practice flows.

- Source: eligible vocabulary items with `audioUrl`; saved-word review narrows
  this to the learner's saved set.
- Prompt: play pronunciation audio.
- Answer options: English words.
- Progress write: existing `user_vocabulary_progress`.

Do not add `LISTEN_SELECT` to the persisted `type` enum yet.

## Consequences

- Listening practice ships without reseeding lesson content.
- Lesson challenges remain stable.
- The Review and Practice capabilities may compose listening sessions without
  owning a second persisted challenge model.
- Persisted lesson listening remains a separate future decision.
