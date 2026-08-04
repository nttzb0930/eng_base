# TOEIC Dictation Bulk Import

## Problem

The Dictation importer writes every item with a separate Prisma `upsert` inside
an interactive transaction. The licensed 2026 snapshot contains about 3,206
items across 40 sets. When the importer runs locally against production through
an SSH tunnel, the accumulated network round trips can exceed Prisma's
transaction timeout.

## Scope

Optimize only the Dictation importer. Reading and Listening have already
completed, Grammar now uses batched writes, the vocabulary-cache importer
already uses `createMany`, and the Writing imports are small enough to remain
unchanged.

## Design

Keep one atomic transaction per Dictation set. Before importing, shift existing
item order indexes and mark those rows inactive as today. Build validated item
rows in memory, then write them in bounded batches with a parameterized
`INSERT ... ON CONFLICT (set_id, source_item_id) DO UPDATE`.

The conflict update must preserve each existing item ID. This protects
`toeic_dictation_progress` and `toeic_dictation_attempts`; deleting and
recreating items is not allowed.

Each transaction receives importer-local `maxWait: 10_000` and
`timeout: 120_000`. The set is changed from `DRAFT` to `PUBLISHED` only after
all item batches succeed.

## Data and failure behavior

- Validate the audio URL and local media mapping before issuing item writes.
- Keep the current source version, transcript, translation, audio metadata,
  order, group, validation status, and active-state semantics.
- Set `updated_at` explicitly in raw SQL because Prisma `@updatedAt` does not
  apply to raw statements.
- On any batch failure, roll back the whole set. Other sets may continue and
  report their own result.
- Re-running the same published source version remains idempotent and returns
  `SKIPPED`.

## Verification

- A store test first proves the old per-item write behavior is unsuitable.
- Tests assert bounded bulk statements, parameterized values, preserved
  conflict identity, publication after content writes, and explicit transaction
  options.
- Existing Dictation importer tests, API lint, type checking, and
  `git diff --check` must pass.
- The production import is rerun with the previously approved Dictation SHA and
  must complete without transaction timeout or foreign-key errors.
