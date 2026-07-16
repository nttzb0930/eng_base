# ADR 0008: Store Example Sentences on Vocabulary Items

## Status

Accepted

## Context

Vocabulary cards currently show word, phonetic, audio, meaning, and progress. Learners also need usage context before fill-in-the-blank or LLM explanation features are useful.

## Decision

Add optional example sentence fields to `vocabulary_items`.

- `example_en`
- `example_vi`
- `example_source`

Use `scripts/enrich-vocab-examples.ts` to fetch examples from Free Dictionary API when available. Keep `example_vi` null until a translation or LLM enrichment phase is added.

## Consequences

- Vocabulary cards can show usage context immediately.
- Missing examples do not break lessons or review.
- Fill-in-the-blank challenges can use `example_en` in a later phase.
