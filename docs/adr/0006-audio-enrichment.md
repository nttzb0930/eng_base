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

Use
`apps/api/scripts/vocabulary/dictionary-enrichment/enrich-vocab-audio.ts` to
fetch candidate audio from the Free Dictionary API. Follow the review and
database-write controls in `docs/data/vocabulary-pipeline.md` before applying
the result to PostgreSQL.

## Consequences

- Vocabulary cards can play pronunciation audio anywhere they render.
- The core lesson and review flows still work when audio is missing.
- Future listening challenge types can reuse `vocabulary_items.audio_url`.
- External enrichment is repeatable pipeline work, not an application runtime
  dependency.
