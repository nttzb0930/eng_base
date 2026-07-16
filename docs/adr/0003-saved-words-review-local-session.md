# ADR 0003: Saved Words Review Uses a Local Session First

## Status

Accepted

## Context

The app already supports saved words and lesson challenge progress. A review feature is useful before adding spaced repetition tables.

## Decision

Phase 2.3 uses a local saved-word review session.

- Source: saved words for the current user
- Challenge types: `SELECT` and `ASSIST`
- Distractors: vocabulary pool from PostgreSQL
- Progress writes: none

The session shows correct/wrong counts in the client but does not persist review history.

## Consequences

- Review mode ships without schema changes.
- Existing lesson progress remains untouched.
- A future `user_vocabulary_progress` table can replace local scoring when spaced repetition is implemented.
