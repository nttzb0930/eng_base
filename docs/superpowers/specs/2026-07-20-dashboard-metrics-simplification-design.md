# Dashboard Metrics Simplification

## Scope

This change makes the existing Learner Dashboard truthful without introducing
new analytics persistence or changing the database schema.

## Review queues

The Dashboard presents three independent review queues:

- Due uses `dailyReview.due`.
- Saved uses `dailyReview.saved`.
- Weak uses `dailyReview.weak`.

The Dashboard does not present an aggregate review-pool total. It therefore
does not render `dailyReview.total`. The Shared `ReviewSummary.total` field
remains available to Review callers that need the deduplicated aggregate.

## Learning overview

The quick-stat panel represents lifetime learning totals rather than a rolling
30-day period. Its localized title is “Learning overview” / “Tổng quan học
tập”. It displays only values the current persistence model can prove:

- lifetime reviewed cards from `dashboard.overview.totalReviews`;
- lifetime XP from `userProgress.points`;
- lifetime accuracy from `dashboard.overview.accuracy`.

The estimated time-spent value is removed. A future rolling-period design must
persist or derive timestamped XP events and real session duration before those
values may be displayed as 30-day facts.

## Seven-day activity

The activity panel describes the seven days returned by
`dashboard.activity`; it does not claim to be a learning streak. The panel
shows:

- the number of active days out of seven;
- the total reviewed words across those seven days;
- one localized weekday marker per returned day.

The View removes its streak calculation and the hard-coded 14-day milestone.
A future streak feature must be computed by API behavior from all qualifying
learning activity with an explicit timezone policy.

## Ownership

This task changes Web presentation and localized messages only. It does not
change Prisma, migrations, or Dashboard API behavior. Existing uncommitted UI
work outside this scope must remain untouched.

## Verification

- Add focused tests for the pure Dashboard presentation calculations and
  translation-facing values.
- Run the focused Web test first through a red-green cycle.
- Run Web typecheck, lint, formatting check, and relevant tests.
- Inspect the final diff to confirm no unrelated dirty file was staged or
  committed.
