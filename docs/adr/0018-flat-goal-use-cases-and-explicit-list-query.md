# ADR 0018: Flat Goal Use Cases and Explicit List Queries

## Status

Accepted

## Context

Learner behavior accumulated in broad Practice, Review, Placement Test,
Courses, Flashcards, Progress, Dashboard, User, and Settings implementations.
Admin list delivery also exposed a `prismaQuery` object and duplicated pagination
formatting across capability owners.

## Decision

- Each HTTP/user goal is composed through one goal-named use case under a flat
  `module/<capability>/use-cases` directory.
- Do not create modality/workflow folders only to group filename prefixes.
- Do not retain compatibility services that forward one-to-one to use cases.
- Shared builders may own reusable challenge/session composition, but they are
  internal Implementation rather than public capability Interfaces.
- `FilterParse` returns a neutral `listQuery`; the owning use case maps it to its
  Prisma Adapter.
- Admin list response formatting is shared delivery infrastructure under
  `common/http`.
- Both `search` and `q` are accepted during compatibility, and paged list size is
  capped at 100.
- Progress and Placement Test multi-write goals use serializable transactions.
  Challenge progress identity is protected by the applied
  `20260716180000_add_challenge_progress_identity` migration.

## Consequences

- Goal changes and tests have Locality without adding nested folder ceremony.
- Delivery callers no longer learn Prisma query naming.
- Existing routes, response envelopes, `Content-Range`, and unpaged lookup
  behavior remain unchanged.
- Reapplying the same challenge completion cannot create a second progress
  identity.
