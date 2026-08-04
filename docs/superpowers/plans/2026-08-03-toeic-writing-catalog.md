# TOEIC Writing Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the TOEIC Writing catalog so Part 1 presents protected picture exercises with required-word filters while Part 2 presents localized email titles, without changing the existing learner session and submission flows.

**Architecture:** Keep the catalog endpoint as the single authenticated list resource, but make its shared wire type a Part-discriminated union. The API parses only preview-safe JSON payload fields; the Web renders dedicated Part 1 and Part 2 cards, and Part 1 media remains behind the existing authenticated image endpoint with viewport-gated Blob loading. The source adapter preserves `title_vi` in JSON for future approved re-imports, while existing rows remain compatible with `titleVi: null`.

**Tech Stack:** TypeScript 6, NestJS 11, Prisma 7, Next.js 16, React 19, TanStack Query 5, next-intl 4, Tailwind CSS 3, Node test runner.

## Global Constraints

- Keep the existing localized route and `part=1|2` query parameter.
- Do not expose Part 1 filenames, UUIDs, generated titles, reference answers, or source media URLs in the catalog response.
- Do not change existing Writing task, draft, submission, result, or immutable snapshot behavior.
- Use the existing bearer-protected `/api/toeic/writing/tasks/:taskId/image` endpoint for Part 1 images.
- Part 1 filters are client-side over the loaded catalog and include `All` plus non-empty patterns with stable counts.
- Part 2 Vietnamese titles are nullable and only rendered for the Vietnamese locale.
- Do not create a Prisma migration and do not execute inventory, download, validation, or import commands.
- Preserve the emerald theme, shared `ToeicBrowseContainer`, `rounded-md` convention, keyboard access, and responsive one/two/four-column layout.
- Preserve unrelated user changes and do not stage `artifacts/` or `tools/`.

---

### Task 1: Part-specific shared and API catalog contract

**Files:**

- Modify: `packages/shared/src/types/toeic-writing.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.mapper.ts`
- Modify: `apps/api/src/module/toeic-writing/use-cases/list-toeic-writing-tasks.use-case.ts`
- Test: `apps/api/src/module/toeic-writing/tests/toeic-writing-read.use-cases.spec.ts`

**Interfaces:**

- Consumes: Prisma task rows with `payload: JsonValue`, learner draft IDs, and learner submission IDs.
- Produces: `ToeicWritingTaskSummary` as `ToeicWritingPartOneTaskSummary | ToeicWritingPartTwoTaskSummary`; `mapToeicWritingTaskSummary(task)` parses preview-safe payload data; existing `ToeicWritingTaskDetail` retains its `title` field and exercise contract.

- [ ] **Step 1: Write failing API tests for both summary variants**

Add assertions equivalent to:

```ts
test("Part 1 catalog exposes words and pattern without a display title", async () => {
  const result = await listPartOneTasks();
  assert.deepEqual(result[0], {
    id: 11,
    part: 1,
    order: 1,
    difficulty: "EASY",
    contentVersion: version,
    submitted: true,
    hasDraft: true,
    requiredWords: [
      { en: "woman", vi: "người phụ nữ" },
      { en: "phone", vi: "điện thoại" },
    ],
    pattern: "N + N",
  });
  assert.equal("title" in result[0], false);
});

test("Part 2 catalog exposes English and nullable Vietnamese titles", async () => {
  const result = await listPartTwoTasks({
    title: "Printer paper jam complaint",
    payload: { ...partTwoPayload, titleVi: "Khiếu nại máy in bị kẹt giấy" },
  });
  assert.equal(result[0]?.part, 2);
  if (result[0]?.part !== 2) assert.fail("expected Part 2 summary");
  assert.equal(result[0].title, "Printer paper jam complaint");
  assert.equal(result[0].titleVi, "Khiếu nại máy in bị kẹt giấy");
});
```

Also assert that the Prisma list query selects `payload: true` and does not select image storage metadata or answer/reference fields.

- [ ] **Step 2: Run the focused API test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-read.use-cases.spec.ts
```

Expected: FAIL because the current summary still returns `title`, omits `requiredWords`, `pattern`, and `titleVi`, and the list query omits `payload`.

- [ ] **Step 3: Add discriminated summary types without changing task detail**

Define the shared types as:

```ts
type ToeicWritingTaskSummaryBase = {
  id: number;
  order: number;
  difficulty: ToeicWritingDifficulty;
  contentVersion: string;
  submitted: boolean;
  hasDraft: boolean;
};

export type ToeicWritingPartOneTaskSummary = ToeicWritingTaskSummaryBase & {
  part: 1;
  requiredWords: Array<{ en: string; vi: string | null }>;
  pattern: string | null;
};

export type ToeicWritingPartTwoTaskSummary = ToeicWritingTaskSummaryBase & {
  part: 2;
  title: string;
  titleVi: string | null;
};

export type ToeicWritingTaskSummary =
  ToeicWritingPartOneTaskSummary | ToeicWritingPartTwoTaskSummary;

type ToeicWritingTaskDetailBase = ToeicWritingTaskSummaryBase & {
  title: string;
};
```

Make `ToeicWritingTaskDetail` extend `ToeicWritingTaskDetailBase`, not the summary union, so session and result consumers keep `title` unchanged.

- [ ] **Step 4: Parse preview fields in the mapper and select payload in the list use case**

Extend `PartOnePayload` with `pattern: string | null` and `PartTwoPayload` with `titleVi: string | null`. Validate both with the existing fail-closed parser helpers. Map Part 1 without `title`; map Part 2 using the persisted task title plus `payload.titleVi`. In `ListToeicWritingTasksUseCase`, add `payload: true` to the Prisma select. Build task detail from a dedicated detail-base mapper so it still includes `title`.

- [ ] **Step 5: Run focused tests, shared/API type checks, and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-read.use-cases.spec.ts
pnpm --filter @repo/shared check-types
pnpm --filter @repo/api check-types
```

Expected: all commands exit 0.

Commit only Task 1 files:

```powershell
git add packages/shared/src/types/toeic-writing.ts apps/api/src/module/toeic-writing/toeic-writing.mapper.ts apps/api/src/module/toeic-writing/use-cases/list-toeic-writing-tasks.use-case.ts apps/api/src/module/toeic-writing/tests/toeic-writing-read.use-cases.spec.ts
git commit -m "feat(api): expose TOEIC Writing catalog previews"
```

### Task 2: Preserve Vietnamese Part 2 source titles

**Files:**

- Modify: `apps/api/scripts/toeic-writing/toeic-writing.types.ts`
- Modify: `apps/api/scripts/toeic-writing/dautoeic-toeic-writing-source.ts`
- Modify: `apps/api/scripts/toeic-writing/toeic-writing.source.test.ts`
- Modify: `docs/data/toeic-writing-pipeline.md`

**Interfaces:**

- Consumes: licensed source field `writing_part2_questions.title_vi`.
- Produces: `ToeicWritingPartTwoCanonicalPayload.titleVi: string | null`, persisted in the existing JSON payload on a future explicitly approved import.

- [ ] **Step 1: Add a failing adapter test**

Create a source response with one valid Part 2 row whose `title_vi` is `"Khiếu nại máy in bị kẹt giấy"`, call `listPartTwoTasks()`, and assert:

```ts
assert.equal(result[0]?.payload.titleVi, "Khiếu nại máy in bị kẹt giấy");
```

Add a second assertion proving blank or null `title_vi` becomes `null`.

- [ ] **Step 2: Run the source test and verify RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-writing/toeic-writing.source.test.ts
```

Expected: TypeScript/test failure because `titleVi` is not part of the canonical payload.

- [ ] **Step 3: Preserve `titleVi` in the canonical payload**

Add:

```ts
export type ToeicWritingPartTwoCanonicalPayload = {
  titleVi: string | null;
  // existing fields remain unchanged
};
```

In the adapter Part 2 payload, set:

```ts
titleVi: row.title_vi?.trim() || null,
```

Do not change the Part 1 canonical title field because it remains internal import compatibility data and is no longer exposed by the learner catalog.

- [ ] **Step 4: Document the data lifecycle and compatibility behavior**

Update `docs/data/toeic-writing-pipeline.md` to state:

```markdown
- Part 1 catalog labels come from `payload.requiredWords` and `payload.pattern`; `image_name` is never learner-facing.
- Part 2 `title_vi` is stored as `payload.titleVi`.
- Existing imported rows may return `titleVi: null` until operators explicitly approve and run a new snapshot download/validation/import.
- This UI change does not run source acquisition or mutate the database automatically.
```

- [ ] **Step 5: Run script tests and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-writing/toeic-writing.source.test.ts scripts/toeic-writing/toeic-writing.validation.test.ts scripts/toeic-writing/toeic-writing.download.test.ts
pnpm --filter @repo/api check-types
```

Expected: all commands exit 0.

Commit:

```powershell
git add apps/api/scripts/toeic-writing/toeic-writing.types.ts apps/api/scripts/toeic-writing/dautoeic-toeic-writing-source.ts apps/api/scripts/toeic-writing/toeic-writing.source.test.ts docs/data/toeic-writing-pipeline.md
git commit -m "feat(data): preserve TOEIC Writing email translations"
```

### Task 3: Catalog derivation and viewport-gated protected images

**Files:**

- Create: `apps/web/app/features/toeic-writing/toeic-writing-catalog.utils.ts`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-catalog.utils.test.ts`
- Create: `apps/web/app/features/toeic-writing/hooks/use-near-viewport.ts`
- Modify: `apps/web/app/features/toeic-writing/hooks/use-toeic-writing-image-url.ts`
- Modify: `apps/web/test/toeic-writing-architecture.test.ts`

**Interfaces:**

- Consumes: `ToeicWritingPartOneTaskSummary[]`, a card DOM element, and `taskId`.
- Produces: `buildToeicWritingPatternFilters(tasks)`, `filterToeicWritingPartOneTasks(tasks, pattern)`, `useNearViewport(options)`, and `useToeicWritingImageUrl(taskId, enabled)`.

- [ ] **Step 1: Write failing tests for stable filters and lazy media ownership**

Test the pure utilities with patterns `N + N`, `V + N`, blank, and null. Expected filter order is first appearance, `All` count equals every Part 1 task, and blank patterns do not create buttons. Extend the architecture test with source assertions that the Part 1 card uses `IntersectionObserver`, passes an `enabled` flag to the image hook, and the hook revokes created object URLs.

- [ ] **Step 2: Run focused Web tests and verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing-catalog.utils.test.ts test/toeic-writing-architecture.test.ts
```

Expected: FAIL because the utility and visibility hook files do not exist and the image hook fetches immediately.

- [ ] **Step 3: Implement pure filter utilities**

Export:

```ts
export type ToeicWritingPatternFilter = {
  value: string | null;
  count: number;
};

export function buildToeicWritingPatternFilters(
  tasks: ToeicWritingPartOneTaskSummary[]
): ToeicWritingPatternFilter[];

export function filterToeicWritingPartOneTasks(
  tasks: ToeicWritingPartOneTaskSummary[],
  pattern: string | null
): ToeicWritingPartOneTaskSummary[];
```

Normalize patterns with `trim()`, preserve first-appearance order, and use `null` for the All filter.

- [ ] **Step 4: Implement viewport gating and Blob cleanup**

`useNearViewport` returns `{ ref, isNearViewport }`, observes once with `rootMargin: "240px"`, disconnects after intersection, and treats missing `IntersectionObserver` as visible. Change the image hook signature to:

```ts
export function useToeicWritingImageUrl(taskId: number, enabled = true);
```

When disabled, do not call the API and return `loading: false`; when enabled, fetch once for that task, create the Blob URL, and revoke it on cleanup. Keep the default `true` so the existing prompt pane remains compatible.

- [ ] **Step 5: Run focused tests/type check and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing-catalog.utils.test.ts test/toeic-writing-architecture.test.ts
pnpm --filter @repo/web check-types
```

Expected: all commands exit 0.

Commit:

```powershell
git add apps/web/app/features/toeic-writing/toeic-writing-catalog.utils.ts apps/web/app/features/toeic-writing/tests/toeic-writing-catalog.utils.test.ts apps/web/app/features/toeic-writing/hooks/use-near-viewport.ts apps/web/app/features/toeic-writing/hooks/use-toeic-writing-image-url.ts apps/web/test/toeic-writing-architecture.test.ts
git commit -m "feat(web): prepare lazy TOEIC Writing catalog media"
```

### Task 4: Part-specific responsive catalog UI and localization

**Files:**

- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingPartOneCard.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingPartTwoCard.tsx`
- Modify: `apps/web/app/views/toeic-writing/ToeicWritingCatalogView.tsx`
- Modify: `apps/web/app/features/toeic-writing/components/ToeicWritingCatalogSkeleton.tsx`
- Delete: `apps/web/app/features/toeic-writing/components/ToeicWritingTaskCard.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/test/toeic-writing-architecture.test.ts`

**Interfaces:**

- Consumes: Part-discriminated summaries, filter utilities, protected-image hooks, active locale, and existing localized session routes.
- Produces: compact Part tabs, Part 1 image/word catalog, Part 2 email-title catalog, per-card fallback states, and matching loading skeleton.

- [ ] **Step 1: Add failing source-level presentation tests**

Assert that the catalog imports both dedicated cards, renders a compact two-tab `role="tablist"`, uses a four-column wide grid, and renders pattern filters only for Part 1. Assert the Part 1 card does not reference `task.title`, `task.order`, or `difficulty`; assert the Part 2 card reads `task.titleVi` only when locale is `vi`.

- [ ] **Step 2: Run the Web architecture test and verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-writing-architecture.test.ts
```

Expected: FAIL because the dedicated cards and new grid/filter structure do not exist.

- [ ] **Step 3: Implement the Part 1 card**

Use `useNearViewport` at the article boundary and `useToeicWritingImageUrl(task.id, isNearViewport)`. Render a fixed `aspect-[4/3]` media area with skeleton and localized failure placeholder, `object-cover` image, required-word chips in a compact footer, and the existing Start/Continue/Submitted-aware action to `/toeic/writing/part-1/${task.id}`. Do not render filename, task number, title, or difficulty.

- [ ] **Step 4: Implement the Part 2 card**

Render the English title as the heading, conditionally render `titleVi` below only for locale `vi`, and keep a compact footer action to `/toeic/writing/part-2/${task.id}`. Use the same status semantics without adding favorites or delete controls.

- [ ] **Step 5: Rebuild the catalog view and skeleton**

Replace overview statistic cards and large Part buttons with a compact centered segmented control. Keep the route-backed Part state. For Part 1, render horizontal filter pills and a `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` image grid. For Part 2, render the same responsive column count with email cards. Preserve error retry and empty states. Update the skeleton so its aspect ratios and columns match each catalog instead of the removed generic two-column cards.

- [ ] **Step 6: Add complete English and Vietnamese copy**

Add localized keys for All, image unavailable, pattern filter labels, required words, Part 1/Part 2 descriptions, Start, Continue, Submitted, and empty/error states. Remove only keys proven unused by `rg`; do not alter unrelated translations.

- [ ] **Step 7: Run focused tests, types, lint, and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-writing-architecture.test.ts app/features/toeic-writing/tests/toeic-writing-catalog.utils.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
```

Expected: all commands exit 0 with no ESLint warnings introduced by these files.

Commit:

```powershell
git add apps/web/app/views/toeic-writing/ToeicWritingCatalogView.tsx apps/web/app/features/toeic-writing/components/ToeicWritingPartOneCard.tsx apps/web/app/features/toeic-writing/components/ToeicWritingPartTwoCard.tsx apps/web/app/features/toeic-writing/components/ToeicWritingCatalogSkeleton.tsx apps/web/app/features/toeic-writing/components/ToeicWritingTaskCard.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test/toeic-writing-architecture.test.ts
git commit -m "feat(web): redesign TOEIC Writing catalog"
```

### Task 5: Cross-layer regression verification

**Files:**

- Modify only files required to fix failures directly caused by Tasks 1–4.

**Interfaces:**

- Consumes: completed shared, API, adapter, and Web changes.
- Produces: evidence that catalog, task session, submission, media protection, localization, and repository architecture remain valid.

- [ ] **Step 1: Run all TOEIC Writing API and data tests**

```powershell
pnpm --filter @repo/api exec tsx --test "src/module/toeic-writing/tests/*.spec.ts" "scripts/toeic-writing/*.test.ts" "test/toeic-writing-architecture.test.ts"
```

Expected: all TOEIC Writing tests pass.

- [ ] **Step 2: Run all TOEIC Writing Web and architecture tests**

```powershell
pnpm --filter @repo/web exec tsx --test "app/features/toeic-writing/tests/*.test.ts" test/toeic-writing-architecture.test.ts
```

Expected: all TOEIC Writing Web tests pass.

- [ ] **Step 3: Run type and lint gates**

```powershell
pnpm --filter @repo/shared check-types
pnpm --filter @repo/api check-types
pnpm --filter @repo/web check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/web lint
```

Expected: all commands exit 0. If an unrelated baseline failure exists, record the exact command and diagnostics without modifying unrelated modules.

- [ ] **Step 4: Review the final diff and commit any verification-only fix**

```powershell
git status --short
git diff --check
git diff --stat
```

Confirm `artifacts/` and `tools/` remain untracked and unstaged. If a regression fix was necessary, stage only its explicit paths and commit with `fix: preserve TOEIC Writing compatibility`. If no fix was necessary, do not create an empty commit.
