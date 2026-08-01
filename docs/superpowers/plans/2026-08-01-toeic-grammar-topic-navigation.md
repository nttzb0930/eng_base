# TOEIC Grammar Topic Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the expanded Grammar catalog with topic cards that open an ordered subtopic workspace with responsive sibling navigation and lesson-aware tabs.

**Architecture:** Reuse the authenticated Grammar catalog and subtopic-detail queries. Keep route files thin, derive navigation state in focused Web feature utilities/components, and retain the existing focused practice session for answering questions.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, next-intl, TanStack Query, Tailwind CSS, Node test runner.

## Global Constraints

- Work directly on `develop` and preserve unrelated dirty files.
- Do not add an API endpoint, Prisma migration, dependency, or database write.
- The Topics catalog renders the 14 aggregate topic cards only.
- Topic selection opens the first ordered subtopic.
- Subtopic selection stays URL-backed and locale-preserving.
- Hide Lesson and resolve to Practice when `lessons.length === 0`.
- Practice continues through `/toeic/grammar/practice?mode=subtopic&target=<target>`.
- English and Vietnamese messages keep key parity.

---

### Task 1: Navigation state utilities

**Files:**

- Modify: `apps/web/app/features/toeic-grammar/toeic-grammar-route.ts`
- Modify: `apps/web/app/features/toeic-grammar/tests/toeic-grammar-route.test.ts`

**Interfaces:**

- Consumes: `ToeicGrammarTopicSummary` from `@repo/shared`.
- Produces: `firstToeicGrammarSubtopicTarget(topic): string | null` and `resolveToeicGrammarDetailTab(requested, hasLesson): "lesson" | "practice"`.

- [ ] **Step 1: Write failing tests**

```ts
test("topic navigation selects its first ordered subtopic", () => {
  const topic = {
    subtopics: [{ target: "subtopic-1" }],
  } as Pick<ToeicGrammarTopicSummary, "subtopics">;
  assert.equal(firstToeicGrammarSubtopicTarget(topic), "subtopic-1");
  assert.equal(
    firstToeicGrammarSubtopicTarget({ ...topic, subtopics: [] }),
    null
  );
});

test("lessonless subtopics resolve to practice", () => {
  assert.equal(resolveToeicGrammarDetailTab("lesson", false), "practice");
  assert.equal(resolveToeicGrammarDetailTab("lesson", true), "lesson");
  assert.equal(resolveToeicGrammarDetailTab("practice", true), "practice");
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-grammar/tests/toeic-grammar-route.test.ts`

Expected: FAIL because both exports are missing.

- [ ] **Step 3: Implement the utilities**

```ts
export function firstToeicGrammarSubtopicTarget(
  topic: Pick<ToeicGrammarTopicSummary, "subtopics">
) {
  return topic.subtopics[0]?.target ?? null;
}

export function resolveToeicGrammarDetailTab(
  requested: "lesson" | "practice",
  hasLesson: boolean
) {
  return requested === "lesson" && hasLesson ? "lesson" : "practice";
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run the command from Step 2. Expected: PASS.

```bash
git add apps/web/app/features/toeic-grammar/toeic-grammar-route.ts apps/web/app/features/toeic-grammar/tests/toeic-grammar-route.test.ts
git commit -m "feat(web): define Grammar topic navigation state"
```

### Task 2: Topic-only catalog cards

**Files:**

- Modify: `apps/web/app/views/toeic-grammar/ToeicGrammarCatalogView.tsx`
- Modify: `apps/web/app/features/toeic-grammar/components/ToeicGrammarProgressCard.tsx`
- Modify: `apps/web/test/toeic-grammar-catalog-architecture.test.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Consumes: `firstToeicGrammarSubtopicTarget` and catalog progress.
- Produces: one card per aggregate topic whose action opens its first subtopic.

- [ ] **Step 1: Write the failing catalog characterization**

```ts
test("Grammar Topics renders aggregate cards and opens the first subtopic", () => {
  const view = read("app/views/toeic-grammar/ToeicGrammarCatalogView.tsx");
  assert.match(view, /firstToeicGrammarSubtopicTarget/);
  assert.match(view, /catalog\.topics\.map/);
  assert.doesNotMatch(view, /topic\.subtopics\.map/);
  assert.doesNotMatch(view, /<details/);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @repo/web exec tsx --test test/toeic-grammar-catalog-architecture.test.ts`

Expected: FAIL because the expanded hierarchy remains.

- [ ] **Step 3: Render topic cards only**

For each topic, compute its first subtopic and render only this card:

```tsx
const firstSubtopic = firstToeicGrammarSubtopicTarget(topic);
<ToeicGrammarProgressCard
  {...topic}
  mode="topic"
  title={topic.titleVi}
  description={topic.descriptionVi}
  detailHref={
    firstSubtopic
      ? `/learn/cert/toeic/reading/grammar/${encodeURIComponent(firstSubtopic)}`
      : undefined
  }
/>;
```

Change detail-action copy to `Open topic` / `Mở chủ điểm`. Preserve topic-practice fallback when no subtopic exists.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm --filter @repo/web exec tsx --test test/toeic-grammar-catalog-architecture.test.ts app/features/toeic-grammar/tests/toeic-grammar-messages.test.ts
git add apps/web/app/views/toeic-grammar/ToeicGrammarCatalogView.tsx apps/web/app/features/toeic-grammar/components/ToeicGrammarProgressCard.tsx apps/web/test/toeic-grammar-catalog-architecture.test.ts apps/web/app/messages/en.json apps/web/app/messages/vi.json
git commit -m "feat(web): browse Grammar by topic"
```

Expected: selected tests PASS.

### Task 3: Responsive sibling-subtopic navigation

**Files:**

- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarSubtopicNavigation.tsx`
- Modify: `apps/web/app/views/toeic-grammar/ToeicGrammarLessonView.tsx`
- Modify: `apps/web/app/features/toeic-grammar/components/ToeicGrammarLessonSkeleton.tsx`
- Modify: `apps/web/test/toeic-grammar-practice-architecture.test.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Consumes: sibling `ToeicGrammarSubtopicSummary[]`, selected target, and localized labels.
- Produces: `ToeicGrammarSubtopicNavigation` with desktop ordered rail and mobile horizontal selector.

- [ ] **Step 1: Write failing structural tests**

```ts
test("Grammar detail exposes sibling subtopics and hides unavailable lessons", () => {
  const view = read("app/views/toeic-grammar/ToeicGrammarLessonView.tsx");
  const navigation = read(
    "app/features/toeic-grammar/components/ToeicGrammarSubtopicNavigation.tsx"
  );
  assert.match(view, /useToeicGrammarCatalog/);
  assert.match(view, /resolveToeicGrammarDetailTab/);
  assert.match(view, /detail\.lessons\.length > 0/);
  assert.match(view, /ToeicGrammarSubtopicNavigation/);
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /subtopic\.questionCount/);
  assert.match(navigation, /lg:hidden/);
  assert.match(navigation, /hidden lg:block/);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @repo/web exec tsx --test test/toeic-grammar-practice-architecture.test.ts`

Expected: FAIL because sibling navigation does not exist.

- [ ] **Step 3: Implement navigation and lesson fallback**

Load catalog and detail concurrently, find the parent topic through `detail.topicTarget`, and pass its ordered `subtopics` to the new component. Resolve the panel with:

```ts
const hasLesson = detail.lessons.length > 0;
const effectiveTab = resolveToeicGrammarDetailTab(tab, hasLesson);
```

Render Lesson only when `hasLesson`. Mobile uses horizontally scrollable links; desktop uses an ordered vertical list. Each link shows a two-digit order, localized title, question count, and `aria-current`.

- [ ] **Step 4: Update skeleton, verify, and commit**

Update `ToeicGrammarLessonSkeleton` with the same rail/main-panel proportions, then run:

```bash
pnpm --filter @repo/web exec tsx --test test/toeic-grammar-practice-architecture.test.ts app/features/toeic-grammar/tests/toeic-grammar-messages.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
git add apps/web/app/features/toeic-grammar/components/ToeicGrammarSubtopicNavigation.tsx apps/web/app/features/toeic-grammar/components/ToeicGrammarLessonSkeleton.tsx apps/web/app/views/toeic-grammar/ToeicGrammarLessonView.tsx apps/web/test/toeic-grammar-practice-architecture.test.ts apps/web/app/messages/en.json apps/web/app/messages/vi.json
git commit -m "feat(web): navigate Grammar subtopics"
```

Expected: selected tests, type-check, and lint PASS.

### Task 4: Regression verification

**Files:** Verify only; no planned production changes.

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces: regression evidence for the completed UI refinement.

- [ ] **Step 1: Run Web regression tests**

Run: `pnpm --filter @repo/web test`

Expected: all Web tests PASS.

- [ ] **Step 2: Run workspace gates**

```bash
pnpm architecture:check
pnpm check-types
pnpm lint
```

Expected: all tasks PASS. Run one production build only if no other build process is active and production code changed after the previous build evidence.

- [ ] **Step 3: Inspect the final diff**

```bash
git diff --check
git status --short
git log -5 --oneline
```

Expected: no whitespace errors; only unrelated pre-existing files remain dirty after the planned commits.
