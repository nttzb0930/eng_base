# TOEIC Writing catalog redesign

## Goal

Make the TOEIC Writing catalog reflect the source content model instead of
presenting Part 1 image filenames as learner-facing titles.

Part 1 is an image exercise. Its catalog card shows the protected image, the
two required English words, progress action, and no title. Part 2 is an email
exercise. Its card shows the source English title, optional Vietnamese title,
progress action, and no image.

## Scope

- Keep the existing localized route and `part` query parameter.
- Replace the large Part selector cards with one compact segmented control.
- Render Part 1 as a responsive image catalog with pattern filters.
- Render Part 2 as a responsive email-title catalog.
- Preserve authenticated drafts, submissions, task routes, and start/continue
  behavior.
- Keep the current emerald English Base theme and existing `rounded-md`
  component convention.

The redesign does not add favorites, deletion, scoring, or AI feedback. Those
controls in the source reference are outside this change.

## Wire contract

`ToeicWritingTaskSummary` remains the list resource but becomes a discriminated
Part-specific shape.

Common fields:

- `id`, `part`, `order`, `difficulty`, `contentVersion`
- `submitted`, `hasDraft`

Part 1 preview fields:

- protected task image identity exposed through the existing authenticated
  `/toeic/writing/tasks/:taskId/image` endpoint
- `requiredWords`
- nullable `pattern`

Part 2 preview fields:

- `title`
- nullable `titleVi`

The API list use case selects `payload` and parses only the fields required for
the selected Part. It must never expose Part 1 source filenames as display
content. `ToeicWritingTaskDetail` will use its own compatibility base instead of
blindly extending the redesigned summary union. Existing task detail and
immutable submission snapshots keep their current internal `title` behavior so
session and result contracts do not change.

## Source and persistence

Part 1 already stores `requiredWords` and `pattern` inside the task JSON
payload, so no migration or re-import is required for its catalog.

The source Part 2 table provides `title_vi`, but the current acquisition adapter
drops it. The adapter will add `titleVi` to the Part 2 canonical payload. No
database migration is needed because the payload is JSON. Existing imported
rows return `titleVi: null` until an approved Writing snapshot is downloaded,
validated, and imported again. The implementation will not perform that
database write automatically.

## Web presentation

### Part selector

A compact two-item segmented control uses the existing URL-backed `part=1|2`
state. It remains keyboard accessible with `tablist` and `tab` semantics.

### Part 1

- Four columns on wide desktop, two on tablet, one on narrow mobile.
- Image uses a stable aspect ratio and `object-cover`.
- Two required-word badges appear in the card footer.
- The action shows the existing localized start, continue, or submitted state.
- Filters show `All` and each available non-empty pattern with a task count.
- Filtering is client-side over the already loaded 48 summary records and does
  not change the URL.
- No filename, UUID, generated title, task number, or difficulty line is shown.

Part 1 images remain protected. Each card starts the authenticated Blob request
only when it approaches the viewport. Object URLs are revoked when the card is
removed. Loading and failure placeholders preserve card dimensions to avoid
layout shift.

### Part 2

- Four columns on wide desktop, two on tablet, one on narrow mobile.
- English title is the primary heading.
- Vietnamese title appears below when available and the active locale is
  Vietnamese.
- The footer contains only the existing progress action.
- No image filename or generic task title is rendered.

## Error and compatibility behavior

- Catalog-level query errors keep the existing retry state.
- An individual Part 1 image failure affects only that card.
- Empty or unsupported Part 1 patterns are grouped under `All` only.
- Existing Part 2 rows without `titleVi` render only their English title.
- Session and result routes continue to use their current detail and snapshot
  contracts.

## Testing

- Shared/API mapper tests prove Part 1 summaries expose preview words and
  pattern without a display title, while Part 2 exposes `title` and nullable
  `titleVi`.
- API read-use-case tests prove list queries select payload safely and do not
  expose reference answers.
- Web catalog tests prove Part 1 cards contain images and words but no filename
  title, Part 2 cards retain email titles, and pattern filters derive stable
  counts.
- Image hook tests prove loading is visibility-gated and Blob URLs are revoked.
- Run focused Web and API tests, type checks, lint, and the repository
  verification gates before handoff.
