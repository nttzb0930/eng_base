# ADR 0003: Saved Words Review Uses a Local Session First

## Status

Superseded by ADR 0004

## Context

The application already supported saved words and lesson challenge progress. A
local-only review session was chosen as an incremental first implementation
before persistent vocabulary scheduling existed.

## Decision

The original implementation used a local saved-word review session.

- Source: saved words for the current user
- Challenge types: `SELECT` and `ASSIST`
- Distractors: vocabulary pool from PostgreSQL
- Progress writes: none

The session showed correct and incorrect counts in the client but did not
persist review history.

## Consequences

- Review mode initially shipped without a schema change.
- ADR 0004 superseded the no-persistence decision by introducing
  `user_vocabulary_progress`.
- This ADR remains as historical context and must not guide current
  implementations.
