# Learner Data Truthfulness and Learning Features Roadmap Design

**Date:** 2026-07-24  
**Status:** Approved for implementation planning

## Purpose

This design turns the remaining learner-facing work into independently
reviewable vertical slices. The immediate objective is to remove derived,
index-based, and hard-coded learner state before adding Reading, Writing, or
AI capabilities.

The roadmap does not treat an attractive UI or static sample data as a
completed feature. A slice is complete only when the owning backend capability,
the shared wire contract, and the learner or Admin interface work end to end
with persisted or reproducibly computed data.

## Current Baseline

The following foundations are already present:

- system-language selection is part of first-run onboarding, defaults to
  English, uses repository-owned English and Vietnamese flag assets, and is
  remembered in browser local storage;
- Unit CEFR is persisted and managed through Admin;
- `GET /progress/cefr-levels` owns A1-B2 progress and the 80 percent mastery
  unlock rule;
- Learn and Learn Level consume Dashboard and CEFR progress instead of the
  former illustrative values;
- Flashcards and Learn copy touched by the CEFR work use the English and
  Vietnamese message catalogs;
- CI, tests, type checks, lint, architecture checks, and production builds pass
  on the merged `develop` baseline.

The remaining data-truthfulness gaps are concentrated in Topics, Topic
Practice, Flashcard deck presentation, onboarding validation, dashboard streak
data, Certificate modeling, and incomplete localization.

## Architectural Principles

- API capability owners compute learner state and business rules.
- Web views render typed responses; they do not infer weak, mastered, due, or
  locked state from array positions.
- Challenge composition and distractor selection run in the Practice or
  Vocabulary backend capability, never in a route-level view.
- Cross-runtime JSON-safe contracts are exported from the root
  `@repo/shared` interface.
- Prisma schema changes use reviewed migrations. Plans must not use `db:push`
  or ad hoc production backfills.
- Progress mutations preserve the existing idempotency, transaction, and
  concurrency guarantees.
- AI providers live behind capability-owned adapters. Default tests use fake
  adapters and never call a provider or the network.
- Missing translations fall back to reviewed English domain content; clients
  do not invent translated content.

## Delivery Model

Work is split into one master roadmap and separate implementation plans.
Each plan produces an independently testable and mergeable result. Plans may
share contracts only through an explicitly completed predecessor.

```text
Unit CEFR migration deployment
              |
              v
      Topic progress truth
          |           |
          v           v
 Topic Practice   Flashcard Topic decks
          |           |
          +-----+-----+
                |
                v
     Personalized daily planning

Dashboard streak, onboarding validation, and localization cleanup can proceed
independently after their contracts are defined.

Certificate modeling is a decision gate. Reading, Writing, and AI Assistant
start only after the data-truthfulness phase has stable contracts.
```

## Phase 1: Make Existing Learner Data Truthful

### Slice 1: Deploy the Unit CEFR Migration

Apply the versioned Unit CEFR migration through the reviewed deployment
workflow before enabling the new CEFR endpoint in a target environment.

This is an operational plan, not a schema redesign. It must include preflight
queries, migration deployment, constraint verification, endpoint smoke tests,
and a rollback decision procedure. It must not use `prisma migrate reset`,
`db:push`, seed, or vocabulary synchronization.

Success means target environments expose the same Unit CEFR contract already
compiled and tested in the repository.

### Slice 2: Topic Progress Truth

Extend Topic list and detail projections with learner-owned counts and
per-vocabulary status:

- total;
- learned;
- learning;
- unlearned;
- mastered;
- weak;
- due.

The API derives these values from `user_vocabulary_progress` using one
capability-owned policy. Topic list aggregates counts in batches. Topic detail
returns enough status for filters and row badges without the Web assigning
status by index.

Web removes fallback filter counts, fixed weak counts, index-based Hot/Weak
badges, and fixed mastery scores. A promotional `hot` marker may remain only
if it becomes an explicit presentation field or a documented static editorial
label unrelated to learner progress.

Success means reordering vocabulary or Topics cannot change learner status.

### Slice 3: Backend-Owned Topic Practice

Add a Practice interface equivalent to:

```http
GET /practice/topics/:slug/challenges?mode=weak|new|all
```

The Practice capability validates mode and Topic identity, selects vocabulary
using learner progress, and delegates option composition to the existing
Vocabulary challenge builder. `weak` selects actual weak progress, `new`
selects items without learning progress, and `all` uses eligible Topic
vocabulary.

The response reuses the existing learning-session-compatible challenge
contract where possible. Selection uses a seedable shuffle seam in tests; the
production adapter supplies randomness.

Web removes `Math.random()`, positional slicing, and client-side distractor
construction.

Success means identical seeded inputs produce identical challenges and every
option set contains exactly one correct answer with no duplicates.

### Slice 4: Flashcard Summary and Topic Decks

Replace the thin Flashcard summary with typed deck summaries:

```ts
type FlashcardDeckSummary = {
  key: string;
  source: "due" | "saved" | "weak" | "cefr" | "topic";
  total: number;
  learned: number;
  mastered: number;
  due: number;
  accuracy: number | null;
  lastReviewedAt: Date | null;
  available: boolean;
};
```

The exact transport may group overview totals and deck arrays, but the API must
own all learner metrics. CEFR deck progress must not be calculated as the
catalog share of a level. Topic decks use explicit Topic slug identity, for
example:

```http
GET /flashcards/session?source=topic&slug=travel
```

Invalid deck inputs return a validation error rather than silently becoming
the due deck.

Certificate decks remain excluded until the Certificate decision slice is
accepted.

Success means Flashcards contains no fixed deck percentage, lock state,
accuracy, mastery count, or review timestamp.

### Slice 5: Certificate Domain Decision

Run a design spike and record an ADR selecting one model:

1. Certificate is a Course when it owns ordered Unit, Lesson, and challenge
   content.
2. Certificate is a taxonomy when it only groups vocabulary and tracks
   enrollment or coverage independently from Course progress.

The spike inventories the intended IELTS, TOEIC, TOEFL, and VSTEP experiences,
their content ownership, enrollment behavior, progress calculation, and Admin
workflow. It defines migration implications and API boundaries but does not
implement speculative endpoints.

Success means Courses, Learn, and Flashcards can remove fictional Certificate
progress and link only to a defined domain.

### Slice 6: Onboarding Constants and Validation

Move target-language IDs, goals, and intensity IDs into `@repo/shared`.
Web option components and API DTO validation consume the same constants.

Validation rules:

- `languages` contains only supported IDs;
- `primaryLanguage` is supported and belongs to `languages`;
- `goals` contains only supported goal IDs;
- `intensity` is one supported intensity ID;
- `customGoal` is trimmed and at most 300 characters;
- unknown values receive a stable 400 response.

System interface language remains a Web presentation preference in local
storage and is not added to PostgreSQL.

Success means a modified client cannot persist unsupported onboarding values.

### Slice 7: Localization Completion

Audit every primary learner route in both locales. Move remaining presentation
copy, including Topic badges and empty/error states, to matching English and
Vietnamese message keys.

Add structural catalog parity tests and route-level smoke coverage that fails
on missing messages. Domain content such as vocabulary, Topic title, or Admin
authored text follows the explicit English fallback rule and is not treated as
UI copy.

Success means primary routes emit no `MISSING_MESSAGE` error and learner views
contain no hard-coded Vietnamese presentation strings.

### Slice 8: Dashboard Streak Contract

Extend Dashboard with:

```ts
type DashboardStreak = {
  currentStreak: number;
  longestStreak: number;
  lastLearningAt: Date | null;
};
```

Define an active day using persisted qualifying learning events and a
documented timezone rule. The first slice may use UTC dates if learner timezone
does not yet exist, but the contract and UI must label that policy explicitly.
The calculation must not depend on client refresh time.

Success means Learn and Dashboard display the same streak and repeated reads do
not mutate it.

## Phase 2: Reading by CEFR

Reading is a separate capability with passage, CEFR level, optional Topic,
estimated reading time, comprehension questions, publication state, and
learner results.

Deliver A1 as the first vertical slice:

1. Shared contracts and persistence.
2. Admin create, edit, publish, and unpublish workflow.
3. API list, detail, submit, and result behavior.
4. Accessible learner reading view.
5. Result persistence isolated from vocabulary review counters.

A2-B2 are enabled only after A1 result persistence and authoring workflow are
stable.

## Phase 3: Writing Before AI Feedback

The first slice persists writing prompts, drafts, attempts, rubric version, and
submission status without an AI dependency.

The second slice adds one provider adapter with:

- structured output validation;
- timeout and bounded retry;
- prompt and model version metadata;
- safe usage metadata;
- rate limit and quota;
- fake adapter tests;
- preservation of the original learner draft on every failure.

Web compares original and corrected text and presents grammar and vocabulary
suggestions as proposals, never silent replacement.

## Phase 4: Personalized Review

Build on truthful Topic progress and Flashcard decks:

1. daily plan based on due words, onboarding intensity, and available-time
   policy;
2. accuracy segmented by `EN_TO_VI`, `VI_TO_EN`, and challenge type;
3. explainable selection reasons;
4. lapse and overdue priority behind a stable scheduler interface.

AI does not select progress mutations. It may later explain or rank
rule-generated candidates after the signals are trustworthy.

## Phase 5: AI Learning Assistant

Deliver in three ordered slices:

1. contextual explanation for the current vocabulary item or challenge;
2. learning-coach recommendations from a minimal typed progress projection;
3. conversation persistence only after privacy, quality, and cost review.

Responses include internal citations, suggested actions, safe provider
metadata, and an AI-generated label. The Assistant cannot directly edit
scores, mastery, lesson completion, or review scheduling.

## Cross-Cutting Verification

Every implementation plan must include:

- a failing test before behavioral code;
- focused unit or contract tests;
- architecture checks for ownership and root shared imports;
- Web/API/Admin type checks for touched runtimes;
- scoped lint followed by workspace lint;
- production builds for touched applications;
- `git diff --check`;
- confirmation that tests do not call databases, migrations, seeds, vocabulary
  synchronization, or AI providers unless a separately reviewed operational
  plan explicitly authorizes the action.

## Plan Documents

After this design is approved, create:

1. one master roadmap plan that tracks dependencies and merge order;
2. one implementation plan for each Phase 1 slice;
3. separate implementation plans for Reading, Writing, Personalized Review,
   and AI Learning Assistant when each phase is approved to start.

Future-feature plans must not be combined into one implementation branch. Each
phase begins from the verified `develop` baseline produced by its dependencies.
