# ADR 0007: Generate Listening Challenges Only in Review Sessions

## Status

Accepted

## Context

Pronunciation audio now exists on vocabulary items. Listening practice is valuable, but adding a new persisted challenge type would require reseeding lesson content and changing the Prisma enum.

## Decision

Generate `LISTEN_SELECT` challenges only inside saved-word review sessions.

- Source: saved vocabulary items with `audioUrl`.
- Prompt: play pronunciation audio.
- Answer options: English words.
- Progress write: existing `user_vocabulary_progress`.

Do not add `LISTEN_SELECT` to the persisted `type` enum yet.

## Consequences

- Listening practice ships without reseeding lesson content.
- Lesson challenges remain stable.
- If listening works well, a later phase can add persisted listening challenges to the main lesson seed.
