# ADR 0002: Seed English Vocabulary Only for Phase 1

## Status

Accepted

## Context

The app is being converted from a language demo into an English learning app for Vietnamese learners. Spanish seed data from the original demo makes the product story unclear.

## Decision

Phase 1 seeds only English Vocabulary.

- One course: `English Vocabulary`
- Four units: `A1 Vocabulary`, `A2 Vocabulary`, `B1 Vocabulary`, `B2 Vocabulary`
- 3,000 vocabulary items when the source data can satisfy quota
- 15 words per lesson
- Two challenge directions per word:
  - `EN_TO_VI`
  - `VI_TO_EN`

The seed script may reset local content and progress tables during development.

## Consequences

- Demo flow is focused and easier to explain.
- Multi-language support is deferred.
- Spanish demo data is no longer part of the main seed path.
