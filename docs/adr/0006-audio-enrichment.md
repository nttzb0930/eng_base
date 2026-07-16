# ADR 0006: Store Pronunciation Audio on Vocabulary Items

## Status

Accepted

## Context

The app has vocabulary, saved-word review, mastery, and due queues. It needs pronunciation playback before listening challenges are useful.

## Decision

Add optional pronunciation fields to `vocabulary_items`.

- `audio_url`
- `audio_source`
- `phonetic_source`

Use `scripts/enrich-vocab-audio.ts` to fetch audio from Free Dictionary API and store the URL in PostgreSQL.

## Consequences

- Vocabulary cards can play pronunciation audio anywhere they render.
- The core lesson and review flows still work when audio is missing.
- Future listening challenge types can reuse `vocabulary_items.audio_url`.
