# Backend-Owned Topic Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Topic vocabulary selection, mode filtering, distractor composition, and shuffle behavior from Web into the Practice API.

**Architecture:** Practice owns a goal-named use case that queries Topic membership and learner progress through Prisma, delegates distractor policy to Vocabulary, and returns the existing `WeakWordsPracticeChallenge` wire shape. A small query DTO validates mode; Web uses one React Query adapter.

**Tech Stack:** NestJS, Prisma, class-validator, Vocabulary challenge builder, React Query, Next.js.

## Global Constraints

- Requires the Topic progress truth plan to be merged first.
- Modes are exactly `weak`, `new`, and `all`.
- Unknown Topic slug returns 404; unknown mode returns 400.
- Production randomness is injectable; tests use a deterministic random source.
- Web must contain no `Math.random()` or option composition.

---

### Task 1: Define Mode and API Contract

**Files:**

- Modify: `packages/shared/src/types/practice.ts`
- Create: `apps/api/src/module/practice/dto/topic-practice-query.dto.ts`
- Create: `apps/api/src/module/practice/tests/topic-practice-query.dto.spec.ts`

**Interfaces:**

- Produces: `TOPIC_PRACTICE_MODES`, `TopicPracticeMode`, and validated `TopicPracticeQueryDto`.

- [ ] **Step 1: Write failing DTO tests**

Validate with `class-validator`:

```ts
for (const mode of ["weak", "new", "all"]) {
  const dto = Object.assign(new TopicPracticeQueryDto(), { mode });
  assert.equal((await validate(dto)).length, 0);
}

const invalid = Object.assign(new TopicPracticeQueryDto(), { mode: "random" });
assert.equal((await validate(invalid))[0]?.property, "mode");
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/practice/tests/topic-practice-query.dto.spec.ts
```

- [ ] **Step 3: Add Shared constants and DTO**

Add:

```ts
export const TOPIC_PRACTICE_MODES = ["weak", "new", "all"] as const;
export type TopicPracticeMode = (typeof TOPIC_PRACTICE_MODES)[number];
```

DTO:

```ts
export class TopicPracticeQueryDto {
  @IsIn(TOPIC_PRACTICE_MODES)
  mode: TopicPracticeMode = "all";
}
```

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/shared check-types
pnpm --filter @repo/api exec tsx --test src/module/practice/tests/topic-practice-query.dto.spec.ts
```

Commit:

```powershell
git add packages/shared/src/types/practice.ts apps/api/src/module/practice/dto/topic-practice-query.dto.ts apps/api/src/module/practice/tests/topic-practice-query.dto.spec.ts
git commit -m "feat(shared): define Topic Practice modes"
```

### Task 2: Replace Random Sort With a Deterministic Shuffle Seam

**Files:**

- Modify: `apps/api/src/module/practice/use-cases/practice-source.ts`
- Create: `apps/api/src/module/practice/tests/practice-shuffle.policy.spec.ts`

**Interfaces:**

- Produces: constructor-injected `RandomSource` and Fisher-Yates `shuffle`.

- [ ] **Step 1: Write the failing shuffle test**

Instantiate a test subclass with `() => 0` and assert:

```ts
assert.deepEqual(source.shuffleForTest([1, 2, 3, 4]), [2, 3, 4, 1]);
assert.deepEqual(source.shuffleForTest([1, 2, 3, 4]), [2, 3, 4, 1]);
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/practice/tests/practice-shuffle.policy.spec.ts
```

- [ ] **Step 3: Implement Fisher-Yates**

Use:

```ts
export type RandomSource = () => number;

constructor(
  protected readonly prisma: PrismaService,
  private readonly random: RandomSource = Math.random,
) {}

protected shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(this.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}
```

- [ ] **Step 4: Verify existing Practice tests and commit**

Run:

```powershell
pnpm --filter @repo/api test
```

Commit:

```powershell
git add apps/api/src/module/practice/use-cases/practice-source.ts apps/api/src/module/practice/tests/practice-shuffle.policy.spec.ts
git commit -m "refactor(api): make Practice shuffle deterministic"
```

### Task 3: Build Topic Challenges in Practice

**Files:**

- Create: `apps/api/src/module/practice/use-cases/get-topic-practice-challenges.use-case.ts`
- Create: `apps/api/src/module/practice/tests/get-topic-practice-challenges.use-case.spec.ts`
- Modify: `apps/api/src/module/practice/practice.module.ts`

**Interfaces:**

- Consumes: `TopicPracticeMode`, Prisma Topic relations, the Vocabulary learner-state policy, `getDistractors`, and `toReviewSourceItem` through the Vocabulary root interface.
- Produces: `execute(userId, slug, mode): Promise<WeakWordsPracticeChallenge[]>`.

- [ ] **Step 1: Write failing use-case tests**

Mock Prisma and cover:

```ts
test("weak mode selects only reviewed items with wrong answers");
test("new mode selects only items without reviewed progress");
test("all mode selects every eligible Topic item up to 20");
test("unknown Topic throws NotFoundException");
test("each challenge has one correct option and no duplicate text");
test("same random source produces the same challenge order");
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/practice/tests/get-topic-practice-challenges.use-case.spec.ts
```

- [ ] **Step 3: Query Topic items in one Prisma call**

Use:

```ts
const topic = await this.prisma.vocabulary_topics.findUnique({
  where: { slug: cleanSlug },
  include: {
    vocabulary_item_topics: {
      include: {
        vocabulary_items: {
          include: {
            user_saved_words: { where: { user_id: userId } },
            user_vocabulary_progress: { where: { user_id: userId } },
            vocabulary_examples: {
              orderBy: [{ order: "asc" }, { id: "asc" }],
            },
          },
        },
      },
    },
  },
});
```

Normalize `slug` with `trim().toLowerCase()` and throw `NotFoundException` when
the result is null.

- [ ] **Step 4: Select targets**

Map items with the Vocabulary mapper and Vocabulary learner-state policy. Apply:

```ts
const selected =
  mode === "weak"
    ? items.filter((item) => item.learnerState.weak)
    : mode === "new"
      ? items.filter((item) => item.learnerState.unlearned)
      : items;
```

Shuffle once and take `20`.

- [ ] **Step 5: Build server-owned challenges**

For each target, use `getDistractors(target, pool, 3, random)`. Alternate
directions by target index:

```ts
const direction = index % 2 === 0 ? "EN_TO_VI" : "VI_TO_EN";
const type = direction === "EN_TO_VI" ? "SELECT" : "ASSIST";
```

Build option IDs deterministically from challenge index. Question copy stays
English domain text in the transport, matching existing weak-word challenges.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/practice/tests/get-topic-practice-challenges.use-case.spec.ts
pnpm --filter @repo/api check-types
```

Commit:

```powershell
git add apps/api/src/module/practice/use-cases/get-topic-practice-challenges.use-case.ts apps/api/src/module/practice/tests/get-topic-practice-challenges.use-case.spec.ts apps/api/src/module/practice/practice.module.ts
git commit -m "feat(api): compose Topic Practice challenges"
```

### Task 4: Expose the Practice Route

**Files:**

- Modify: `apps/api/src/module/practice/practice.controller.ts`
- Create: `apps/api/src/module/practice/tests/practice-controller.spec.ts`
- Modify: `apps/api/test/learning-goals-architecture.test.ts`

**Interfaces:**

- Produces: authenticated `GET /practice/topics/:slug/challenges?mode=weak|new|all`.

- [ ] **Step 1: Write failing controller delegation test**

Assert:

```ts
await controller.getTopicChallenges("user-1", "travel", { mode: "weak" });
assert.deepEqual(execute.mock.calls[0], ["user-1", "travel", "weak"]);
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/practice/tests/practice-controller.spec.ts
```

- [ ] **Step 3: Add the route**

Add:

```ts
@Get("topics/:slug/challenges")
getTopicChallenges(
  @CurrentUserId() userId: string,
  @Param("slug") slug: string,
  @Query() query: TopicPracticeQueryDto,
) {
  return this.topicChallenges.execute(userId, slug, query.mode);
}
```

Import `Param` and inject `GetTopicPracticeChallengesUseCase`.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/practice/tests/practice-controller.spec.ts test/learning-goals-architecture.test.ts
```

Commit:

```powershell
git add apps/api/src/module/practice/practice.controller.ts apps/api/src/module/practice/tests/practice-controller.spec.ts apps/api/test/learning-goals-architecture.test.ts
git commit -m "feat(api): expose Topic Practice challenges"
```

### Task 5: Consume Topic Challenges in Web

**Files:**

- Modify: `apps/web/app/features/practice/api/practice.api.ts`
- Modify: `apps/web/app/features/practice/hooks/use-practice.ts`
- Modify: `apps/web/app/features/practice/tests/practice.api.test.ts`
- Modify: `apps/web/app/views/topics/TopicPracticeView.tsx`
- Test: `apps/web/test/topic-practice-server-owned.test.ts`

**Interfaces:**

- Consumes: Topic Practice endpoint.
- Produces: `useTopicPracticeChallenges(slug, mode)` and server-driven view.

- [ ] **Step 1: Write failing API and structural tests**

Assert the API calls:

```text
/practice/topics/travel/challenges?mode=weak
```

Assert the view contains none of:

```ts
assert.doesNotMatch(source, /Math\.random|shuffledOthers|distractors|slice\(0/);
assert.match(source, /useTopicPracticeChallenges/);
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/practice/tests/practice.api.test.ts test/topic-practice-server-owned.test.ts
```

- [ ] **Step 3: Add API adapter and hook**

API:

```ts
async listTopicChallenges(slug: string, mode: TopicPracticeMode) {
  const query = new URLSearchParams({ mode });
  return (
    await http.get<WeakWordsPracticeChallenge[]>(
      `/practice/topics/${encodeURIComponent(slug)}/challenges?${query.toString()}`,
    )
  ).data;
}
```

Add a query key containing both slug and mode and enable only for a non-empty
slug.

- [ ] **Step 4: Simplify the view**

Remove `useTopic`, `useUserProgress`, `useMemo`, and all challenge construction.
Render loading, error, empty, and quiz states from the new query.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/practice/tests/practice.api.test.ts test/topic-practice-server-owned.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Commit:

```powershell
git add apps/web/app/features/practice apps/web/app/views/topics/TopicPracticeView.tsx apps/web/test/topic-practice-server-owned.test.ts
git commit -m "feat(web): consume Topic Practice challenges"
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
