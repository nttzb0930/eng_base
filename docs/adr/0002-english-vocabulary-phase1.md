# ADR 0002: Seed English Vocabulary as the Initial Catalog

## Status

Accepted; data-source and generation details amended by the canonical vocabulary
pipeline

## Context

The product teaches English to Vietnamese learners. A mixed-language demo
catalog would make course progression, review scheduling, and content quality
harder to reason about.

## Decision

The initial seed loads only the canonical English vocabulary catalog.

- One course: `English Vocabulary`
- Four units: `A1 Vocabulary`, `A2 Vocabulary`, `B1 Vocabulary`, `B2 Vocabulary`
- 3,000 vocabulary items
- 15 words per lesson
- Two challenge directions per word:
  - `EN_TO_VI`
  - `VI_TO_EN`

The canonical catalog and topic taxonomy are maintained through
`docs/data/vocabulary-pipeline.md`. Seeding must be invoked explicitly and must
not silently reset learner progress as part of normal development or startup.

## Consequences

- Demo flow is focused and easier to explain.
- Multi-language support is deferred.
- Spanish demo data is no longer part of the main seed path.
- Destructive reset operations require a deliberate operator command and a
  verified backup or disposable database.
