# Flashcard Deck Summary and Topic Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace client-derived Flashcard metrics and static Topic decks with server-owned deck summaries and explicit Topic session routing.

**Architecture:** Flashcards owns deck metric calculation over vocabulary progress. The summary returns overview metrics plus due/saved/weak, CEFR, and Topic deck arrays; Topic display names remain owned by Topics and are joined by slug in Web. Session parsing accepts legacy `deck` for due/saved/weak/A1-B2 and explicit `source=topic&slug=travel` routing for Topic membership.

**Tech Stack:** NestJS, Prisma, `@repo/shared`, React Query, Next.js, Node test runner.

## Global Constraints

- Requires Topic progress truth to be merged.
- Certificate decks are excluded.
- Accuracy is `null` when a deck has no attempts.
- CEFR progress is learner progress, not a level's share of the catalog.
- Unknown deck/source/Topic returns 400 or 404; it never falls back to due.
- Existing due/saved/weak/A1-B2 session links remain compatible.

---

### Task 1: Define Flashcard Deck Contracts

**Files:**

- Modify: `packages/shared/src/types/flashcard.ts`
- Test: `packages/shared/test/shared-root-interface.test.ts`

**Interfaces:**

- Produces: `FlashcardDeckSource`, `FlashcardDeckSummary`, and `FlashcardSummary`.

- [ ] **Step 1: Write the failing type contract**

Compile:

```ts
const deck: FlashcardDeckSummary = {
  key: "travel",
  source: "topic",
  total: 20,
  learned: 8,
  mastered: 3,
  due: 4,
  accuracy: 75,
  lastReviewedAt: new Date("2026-07-24T00:00:00.000Z"),
  available: true,
};

const summary: FlashcardSummary = {
  overview: {
    due: 4,
    saved: 6,
    weak: 2,
    learned: 8,
    mastered: 3,
    accuracy: 75,
    lastReviewedAt: deck.lastReviewedAt,
  },
  systemDecks: [],
  cefrDecks: [],
  topicDecks: [deck],
};
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/shared test
```

- [ ] **Step 3: Add the types**

Use:

```ts
export type FlashcardDeckSource = "due" | "saved" | "weak" | "cefr" | "topic";

export type FlashcardDeckSummary = {
  key: string;
  source: FlashcardDeckSource;
  total: number;
  learned: number;
  mastered: number;
  due: number;
  accuracy: number | null;
  lastReviewedAt: Date | null;
  available: boolean;
};
```

Define the `overview`, `systemDecks`, `cefrDecks`, and `topicDecks` shape shown
in the test. Remove the old `levels` contract after all consumers in this plan
are updated.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/shared check-types
```

Commit:

```powershell
git add packages/shared/src/types/flashcard.ts packages/shared/test/shared-root-interface.test.ts
git commit -m "feat(shared): define Flashcard deck summaries"
```

### Task 2: Add a Pure Deck Metrics Policy

**Files:**

- Create: `apps/api/src/module/flashcards/use-cases/flashcard-deck-summary.policy.ts`
- Create: `apps/api/src/module/flashcards/tests/flashcard-deck-summary.policy.spec.ts`

**Interfaces:**

- Consumes: mapped vocabulary items, the Vocabulary learner-state policy, and a fixed `now`.
- Produces: `summarizeFlashcardDeck(key, source, items, now)`.

- [ ] **Step 1: Write failing policy tests**

Cover:

```ts
test("empty deck is unavailable with null accuracy");
test("learned and mastered counts use learner progress");
test("due includes reviewed items with null or expired next review");
test("accuracy aggregates correct and wrong attempts");
test("last reviewed date is the newest progress timestamp");
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/flashcards/tests/flashcard-deck-summary.policy.spec.ts
```

- [ ] **Step 3: Implement exact aggregation**

For every item use its first user progress row. Calculate:

```ts
const learnedRows = rows.filter((row) => row.reviewCount > 0);
const correct = learnedRows.reduce((sum, row) => sum + row.correctCount, 0);
const wrong = learnedRows.reduce((sum, row) => sum + row.wrongCount, 0);
const attempts = correct + wrong;
```

Set `accuracy` to `null` for zero attempts, otherwise rounded correct percent.
Set `available` to `items.length > 0`.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/flashcards/tests/flashcard-deck-summary.policy.spec.ts
```

Commit:

```powershell
git add apps/api/src/module/flashcards/use-cases/flashcard-deck-summary.policy.ts apps/api/src/module/flashcards/tests/flashcard-deck-summary.policy.spec.ts
git commit -m "feat(api): define Flashcard deck metrics"
```

### Task 3: Compose Real Flashcard Summaries

**Files:**

- Modify: `apps/api/src/module/flashcards/use-cases/get-flashcard-deck-summary.use-case.ts`
- Create: `apps/api/src/module/flashcards/tests/get-flashcard-deck-summary.use-case.spec.ts`

**Interfaces:**

- Consumes: summary policy, vocabulary progress, saved words, CEFR, and Topic relations.
- Produces: Shared `FlashcardSummary`.

- [ ] **Step 1: Write failing use-case tests**

Mock Prisma and assert:

```ts
assert.deepEqual(
  result.cefrDecks.map((deck) => deck.key),
  ["A1", "A2", "B1", "B2"]
);
assert.equal(result.topicDecks[0]?.key, "travel");
assert.equal(result.topicDecks[0]?.accuracy, 75);
assert.equal(result.overview.mastered, 1);
```

Also assert an empty user returns zero overview and four unavailable CEFR decks.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/flashcards/tests/get-flashcard-deck-summary.use-case.spec.ts
```

- [ ] **Step 3: Load summary inputs in bounded queries**

Capture one `now`. Load vocabulary items with only the authenticated learner's
progress and saved rows, plus Topic membership:

```ts
include: {
  user_saved_words: { where: { user_id: userId } },
  user_vocabulary_progress: { where: { user_id: userId } },
  vocabulary_examples: { orderBy: [{ order: "asc" }, { id: "asc" }] },
  vocabulary_item_topics: {
    include: {
      vocabulary_topics: {
        select: { slug: true, order: true },
      },
    },
  },
}
```

Group mapped items into system, CEFR, and Topic input arrays. Sort Topic decks
by Topic order then slug.

- [ ] **Step 4: Build overview from distinct vocabulary**

Overview is calculated once across the full catalog/progress set:

```ts
due: dueDeck.total;
saved: savedDeck.total;
weak: weakDeck.total;
learned: allDeck.learned;
mastered: allDeck.mastered;
accuracy: allDeck.accuracy;
lastReviewedAt: allDeck.lastReviewedAt;
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/flashcards/tests/get-flashcard-deck-summary.use-case.spec.ts src/module/flashcards/tests/flashcard-deck-summary.policy.spec.ts
pnpm --filter @repo/api check-types
```

Commit:

```powershell
git add apps/api/src/module/flashcards/use-cases/get-flashcard-deck-summary.use-case.ts apps/api/src/module/flashcards/tests/get-flashcard-deck-summary.use-case.spec.ts
git commit -m "feat(api): compose Flashcard deck summaries"
```

### Task 4: Validate Explicit Topic Sessions

**Files:**

- Create: `apps/api/src/module/flashcards/dto/flashcard-session-query.dto.ts`
- Modify: `apps/api/src/module/flashcards/flashcards.controller.ts`
- Modify: `apps/api/src/module/flashcards/use-cases/flashcard-source.ts`
- Modify: `apps/api/src/module/flashcards/use-cases/get-flashcard-session-items.use-case.ts`
- Create: `apps/api/src/module/flashcards/tests/get-flashcard-session-items.use-case.spec.ts`
- Create: `apps/api/src/module/flashcards/tests/flashcards-controller.spec.ts`

**Interfaces:**

- Consumes: `deck`, or `source=topic&slug`.
- Produces: validated session items without fallback.

- [ ] **Step 1: Write failing tests**

Cover:

```ts
test("legacy due saved weak and CEFR decks remain valid");
test("invalid legacy deck throws BadRequestException");
test("Topic source requires a slug");
test("unknown Topic throws NotFoundException");
test("Topic session contains only members of that Topic");
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/flashcards/tests/get-flashcard-session-items.use-case.spec.ts src/module/flashcards/tests/flashcards-controller.spec.ts
```

- [ ] **Step 3: Add query DTO**

Define optional string `deck`, optional `source` restricted to `"topic"`, and
optional trimmed string `slug`. The use case enforces:

```text
deck cannot be combined with source or slug
source=topic requires slug
slug requires source=topic
```

- [ ] **Step 4: Remove fallback normalization**

Replace `normalizeFlashcardDeck` with a parser that returns a valid deck or
throws `BadRequestException`. Add a Topic query path through
`vocabulary_item_topics`.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/flashcards/tests/get-flashcard-session-items.use-case.spec.ts src/module/flashcards/tests/flashcards-controller.spec.ts
pnpm --filter @repo/api check-types
```

Commit:

```powershell
git add apps/api/src/module/flashcards
git commit -m "feat(api): support validated Flashcard Topic sessions"
```

### Task 5: Render Real Flashcard Decks

**Files:**

- Modify: `apps/web/app/features/flashcards/flashcard-deck.ts`
- Modify: `apps/web/app/features/flashcards/api/flashcard.api.ts`
- Modify: `apps/web/app/features/flashcards/hooks/use-flashcards.ts`
- Modify: `apps/web/app/features/flashcards/tests/flashcard.api.test.ts`
- Modify: `apps/web/app/views/flashcards/FlashcardsView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Test: `apps/web/test/flashcard-deck-truth.test.ts`

**Interfaces:**

- Consumes: real Flashcard summary and Topic list.
- Produces: deck cards and explicit Topic routes without static metrics.

- [ ] **Step 1: Write failing tests**

Assert:

```ts
assert.doesNotMatch(view, /CERT_DECKS|TOPIC_DECKS|percent:\s*\d+/);
assert.doesNotMatch(view, /savedCount\s*-\s*weakCount/);
assert.match(view, /summary\.topicDecks/);
assert.match(apiSource, /source=topic/);
```

API tests verify URL encoding for `source=topic&slug=travel`.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/flashcards/tests/flashcard.api.test.ts test/flashcard-deck-truth.test.ts
```

- [ ] **Step 3: Update adapters**

Accept:

```ts
type FlashcardSessionRequest =
  | { deck: "due" | "saved" | "weak" | PracticeCefrLevel }
  | { source: "topic"; slug: string };
```

Build query strings with `URLSearchParams`.

- [ ] **Step 4: Update the view**

Use `summary.overview` for metric cards, `summary.cefrDecks` for CEFR, and join
`summary.topicDecks` to `useTopics(locale)` by slug for localized title and
description. Hide the Certificate tab until the Certificate ADR has a real
implementation.

Render `accuracy === null` with localized `notAvailable`. Lock only when
`available` is false.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/flashcards/tests/flashcard.api.test.ts test/flashcard-deck-truth.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Commit:

```powershell
git add apps/web/app/features/flashcards apps/web/app/views/flashcards/FlashcardsView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test/flashcard-deck-truth.test.ts
git commit -m "feat(web): render truthful Flashcard decks"
```

### Task 6: Full Slice Verification

- [ ] Run:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
git diff --check
git status --short
```
