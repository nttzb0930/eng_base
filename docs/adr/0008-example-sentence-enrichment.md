# ADR 0008: Store Example Sentences on Vocabulary Items

## Status

Accepted

## Context

Vocabulary cards currently show word, phonetic, audio, meaning, and progress. Learners also need usage context before fill-in-the-blank or LLM explanation features are useful.

## Decision

Keep optional primary example fields on `vocabulary_items`.

- `example_en`
- `example_vi`
- `example_source`

Store the reviewed one-to-many example set in `vocabulary_examples`, including
English text, optional Vietnamese translation, provenance, and order. Use
`apps/api/scripts/vocabulary/dictionary-enrichment/enrich-vocab-examples.ts` for
dictionary candidates and the canonical vocabulary pipeline for bilingual AI
enrichment. The current catalog targets exactly ten distinct bilingual examples
per vocabulary item.

## Consequences

- Vocabulary cards can show usage context immediately.
- Missing examples do not break lessons or review.
- Consumers prefer `vocabulary_examples` and may fall back to the primary
  fields during migration or partial enrichment.
- Fill-in-the-blank and dictation flows can reuse the reviewed examples.
