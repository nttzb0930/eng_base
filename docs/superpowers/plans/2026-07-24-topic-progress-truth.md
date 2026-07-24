# Topic Progress Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace index-derived Topic status and counts with one server-owned learner-progress policy used by Topic list and detail.

**Architecture:** Add a pure learner-state policy to the API Vocabulary owner, expose JSON-safe learner-state and aggregate types through `@repo/shared`, and map both Topic use cases through the Vocabulary public interface. Web filters and badges consume the response without reconstructing business state.

**Tech Stack:** NestJS, Prisma, TypeScript, `@repo/shared`, React Query, Next.js, Node test runner.

## Global Constraints

- Topic state must not depend on Topic or vocabulary array order.
- `due` and `weak` are independent flags, not exclusive mastery states.
- One `now` value is captured per request and passed to the pure policy.
- Topic list keeps batched loading; do not introduce per-Topic database queries.
- Existing locale and CEFR filters remain compatible.

---

### Task 1: Define the Shared Topic Progress Contract

**Files:**

- Modify: `packages/shared/src/types/vocabulary.ts`
- Test: `packages/shared/test/shared-root-interface.test.ts`

**Interfaces:**

- Consumes: existing `VocabularyTopic`, `VocabularyTopicDetails`, and `VocabularyItem`.
- Produces: `VocabularyLearnerState`, `VocabularyTopicProgressStats`, and `VocabularyTopicItem`.

- [ ] **Step 1: Write the failing contract test**

Assert that the root Shared interface exports values assignable to:

```ts
const state: VocabularyLearnerState = {
  learned: true,
  learning: true,
  unlearned: false,
  mastered: false,
  weak: true,
  due: true,
  masteryLevel: "learning",
};

const stats: VocabularyTopicProgressStats = {
  total: 1,
  learned: 1,
  learning: 1,
  unlearned: 0,
  mastered: 0,
  weak: 1,
  due: 1,
};
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/shared test
```

Expected: TypeScript/test failure because the types are not exported.

- [ ] **Step 3: Add the contract**

Add:

```ts
export type VocabularyLearnerState = {
  learned: boolean;
  learning: boolean;
  unlearned: boolean;
  mastered: boolean;
  weak: boolean;
  due: boolean;
  masteryLevel: string | null;
};

export type VocabularyTopicProgressStats = {
  total: number;
  learned: number;
  learning: number;
  unlearned: number;
  mastered: number;
  weak: number;
  due: number;
};

export type VocabularyTopicItem = VocabularyItem & {
  learnerState: VocabularyLearnerState;
};
```

Change `VocabularyTopic` to include all fields from
`VocabularyTopicProgressStats`. Change Topic detail `stats` and
`filteredStats` to that type and `items` to `VocabularyTopicItem[]`.

- [ ] **Step 4: Confirm GREEN and commit**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/shared check-types
```

Commit:

```powershell
git add packages/shared/src/types/vocabulary.ts packages/shared/test/shared-root-interface.test.ts
git commit -m "feat(shared): define Topic learner progress"
```

### Task 2: Implement the Pure Vocabulary Learner-State Policy

**Files:**

- Create: `apps/api/src/module/vocabulary/use-cases/vocabulary-learner-state.policy.ts`
- Create: `apps/api/src/module/vocabulary/tests/vocabulary-learner-state.policy.spec.ts`
- Modify: `apps/api/src/module/vocabulary/index.ts`

**Interfaces:**

- Consumes: mapped API `VocabularyItem` and request `Date`.
- Produces: `getVocabularyLearnerState(item, now)` and `summarizeVocabularyLearnerStates(items, now)` through the Vocabulary root interface.

- [ ] **Step 1: Write failing policy tests**

Cover:

```ts
test("unreviewed vocabulary is unlearned only");
test("reviewed non-mastered vocabulary is learning");
test("mastered vocabulary remains mastered when due");
test("wrong reviewed vocabulary is weak");
test("null or expired next review is due after a review");
test("reordering items preserves every aggregate count");
```

Use a fixed `new Date("2026-07-24T00:00:00.000Z")`.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/vocabulary/tests/vocabulary-learner-state.policy.spec.ts
```

- [ ] **Step 3: Implement the policy**

Use these exact rules:

```ts
const progress = item.userVocabularyProgress[0] ?? null;
const learned = (progress?.reviewCount ?? 0) > 0;
const mastered = learned && progress?.masteryLevel === "mastered";
const weak = learned && (progress?.wrongCount ?? 0) > 0;
const due =
  learned &&
  (!progress?.nextReviewAt || progress.nextReviewAt.getTime() <= now.getTime());

return {
  learned,
  learning: learned && !mastered,
  unlearned: !learned,
  mastered,
  weak,
  due,
  masteryLevel: progress?.masteryLevel ?? null,
};
```

Aggregate each boolean independently and always set `total: items.length`.

- [ ] **Step 4: Confirm GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/vocabulary/tests/vocabulary-learner-state.policy.spec.ts
```

Commit:

```powershell
git add apps/api/src/module/vocabulary/use-cases/vocabulary-learner-state.policy.ts apps/api/src/module/vocabulary/tests/vocabulary-learner-state.policy.spec.ts apps/api/src/module/vocabulary/index.ts
git commit -m "feat(api): define vocabulary learner state"
```

### Task 3: Project Topic List and Detail Through the Policy

**Files:**

- Modify: `apps/api/src/module/topics/use-cases/topic-source.ts`
- Modify: `apps/api/src/module/topics/use-cases/list-vocabulary-topics.use-case.ts`
- Modify: `apps/api/src/module/topics/use-cases/get-vocabulary-topic.use-case.ts`
- Modify: `apps/api/src/module/topics/topics.use-cases.test.ts`

**Interfaces:**

- Consumes: Vocabulary root policy from Task 2.
- Produces: Topic list/detail responses matching Task 1 contracts.

- [ ] **Step 1: Extend use-case tests**

Use mocked Prisma rows to assert:

```ts
assert.deepEqual(topic, {
  id: 1,
  slug: "travel",
  title: "Travel",
  description: "Travel vocabulary",
  group: "Daily life",
  order: 1,
  total: 4,
  learned: 3,
  learning: 2,
  unlearned: 1,
  mastered: 1,
  weak: 1,
  due: 2,
});
```

For detail, assert every item has `learnerState` and filtered stats are
calculated from level-filtered items while `stats` uses all Topic items.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/topics/topics.use-cases.test.ts
```

- [ ] **Step 3: Update Topic source**

Replace `getTopicStats(items)` with:

```ts
protected getTopicStats(items: VocabularyItem[], now: Date) {
  return summarizeVocabularyLearnerStates(items, now);
}

protected withLearnerState(item: VocabularyItem, now: Date) {
  return {
    ...item,
    learnerState: getVocabularyLearnerState(item, now),
  };
}
```

Each execute method captures `const now = new Date()` once. List returns
localized Topic fields plus aggregate stats. Detail maps selected items through
`withLearnerState`.

- [ ] **Step 4: Confirm GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/topics/topics.use-cases.test.ts src/module/vocabulary/tests/vocabulary-learner-state.policy.spec.ts
pnpm --filter @repo/api check-types
```

Commit:

```powershell
git add apps/api/src/module/topics/use-cases apps/api/src/module/topics/topics.use-cases.test.ts
git commit -m "feat(api): expose truthful Topic progress"
```

### Task 4: Remove Topic Status Inference From Web

**Files:**

- Modify: `apps/web/app/views/topics/TopicsView.tsx`
- Modify: `apps/web/app/views/topics/TopicDetailView.tsx`
- Test: `apps/web/test/topic-progress-presentation.test.ts`

**Interfaces:**

- Consumes: Shared Topic progress response.
- Produces: filters, counts, cards, and row badges backed only by API fields.

- [ ] **Step 1: Write the failing structural regression test**

Assert:

```ts
assert.doesNotMatch(topicsView, /idx\s*%|index\s*===|CERT_APPEARS_PATTERN/);
assert.doesNotMatch(
  topicDetail,
  /index\s*[<=>]|globalIdx|mock split|Math\.min\(8/
);
assert.match(topicDetail, /item\.learnerState/);
assert.match(topicsView, /topic\.weak/);
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/topic-progress-presentation.test.ts
```

- [ ] **Step 3: Update Topics list**

Use API counts directly:

```ts
const counts = {
  all: topics.length,
  learning: topics.filter((topic) => topic.learning > 0).length,
  mastered: topics.filter(
    (topic) => topic.total > 0 && topic.mastered === topic.total
  ).length,
  weak: topics.filter((topic) => topic.weak > 0).length,
};
```

Filter with the same fields. Remove fallback values, index-based Hot/Weak
logic, and certificate-appearance numbers.

- [ ] **Step 4: Update Topic detail**

Filter and render with:

```ts
const state = wordItem.learnerState;
if (activeFilter === "weak") return state.weak;
if (activeFilter === "learned") return state.learned;
if (activeFilter === "unlearned") return state.unlearned;
```

Use `topic.filteredStats.weak`, `learning`, and `unlearned` for cards and tab
counts. Badges use `state.weak`, `state.learning`, and `state.mastered`; do not
display fixed scores.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/topic-progress-presentation.test.ts app/features/topics/tests/topic.api.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Commit:

```powershell
git add apps/web/app/views/topics/TopicsView.tsx apps/web/app/views/topics/TopicDetailView.tsx apps/web/test/topic-progress-presentation.test.ts
git commit -m "fix(web): render truthful Topic progress"
```

### Task 5: Full Slice Verification

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

Expected: all commands exit zero and status is clean.
