# ADR 0022: Keep Certificate Learning in Courses

## Status

Status: Accepted

## Context

English Base presents IELTS, TOEIC, TOEFL, and VSTEP entry points, but the
current learner UI does not receive Certificate identity, membership, unlock,
or progress data. Its fixed counts and lock relationships are illustrative and
cannot define the domain.

Course Content already owns the ordered Course -> Unit -> Lesson -> challenge
hierarchy, immutable Course codes, Admin authoring, active Course selection,
and learner completion. A separate vocabulary taxonomy would duplicate that
ownership if a Certificate experience is expected to teach ordered lessons and
challenges.

The first-release requirements are recorded in
`docs/architecture/certificate-domain-inventory.md`.

## Decision

Decision: Certificate is a Course.

Courses owns Certificate content and behavior. Each Certificate experience is
a normal Course with numeric relational identity and one immutable business
code:

- `ielts-academic`;
- `toeic-600`;
- `toefl-ibt`;
- `vstep-b1`.

Editable Course titles and array positions never identify a Certificate.
Course Management owns Admin authoring for the Course, Units, Lessons,
challenges, and options.

Learner progress uses the existing Course, lesson, and challenge completion
model. Vocabulary coverage is derived from vocabulary references in Course
challenges. The first release does not add Certificate enrollment,
Certificate-specific vocabulary membership, independent progress, or unlock
dependencies between exam brands.

The localized `/learn/cert` route is the initial discovery route. It may expose
only returned Courses whose immutable codes match the accepted Certificate
codes. When no such Course exists, Learner UI displays a localized unavailable
state. Flashcards and Topics do not expose Certificate progress or membership
without a future Course-owned contract.

This decision requires no schema migration. Current environments seed only the
`english-vocabulary` Course, so Certificate content remains unavailable until
an authorized operator creates and authors a matching Course through the
existing Course Management workflow. Adding enrollment, a new persistence
model, or a new Certificate code requires a separate reviewed design.

The rejected model is a vocabulary taxonomy. It can group words but cannot own
the ordered lessons, challenges, authoring workflow, and learning progress
required for the accepted first-release experiences without duplicating
Courses.

## Consequences

- Certificate content reuses the existing Courses capability and public Course
  contracts.
- Certificate progress is never calculated from static UI values, Topic
  membership, or vocabulary catalog share.
- No Certificate endpoint, table, migration, or speculative enrollment behavior
  is introduced by this decision.
- Learner UI must fail closed to a localized unavailable state when an accepted
  Certificate Course is absent.
- Admin authors Certificate learning through Course Management.
- A future Certificate vocabulary deck must be derived through a reviewed
  Course-owned interface; it cannot be inferred in Web.
