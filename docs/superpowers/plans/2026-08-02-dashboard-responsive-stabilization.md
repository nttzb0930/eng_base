# Dashboard Responsive Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Learner Dashboard and shared main shell stable from 360px through 1440px without header overlap or prematurely compressed cards.

**Architecture:** Treat Dashboard as the first responsive tracer page. Correct the shared header/content-flow contract first, then adjust Dashboard-owned breakpoints and finally make its route skeleton mirror the resolved layout. Preserve existing routes, data hooks, visual language, and API behavior.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 3, next-intl, Node test runner with `tsx`.

## Global Constraints

- Scope is `apps/web` only; do not change API, database, Admin, routes, or data contracts.
- Audit widths are exactly 360px, 390px, 768px, 1024px, and 1440px.
- Do not add a global `overflow-x-hidden` workaround; fix overflow at the owning component.
- Keep existing Tailwind/Radix presentation and bilingual content unchanged.
- Dashboard is the Phase 1 tracer; later responsive phases remain separate plans.
- Use test-first changes and commit each independently reviewable task.

---

### Task 1: Unify Main Header and Content Flow

**Files:**

- Create: `apps/web/test/dashboard-responsive-presentation.test.ts`
- Modify: `apps/web/app/components/navigation/MobileHeader.tsx`
- Modify: `apps/web/app/components/layout/LearnerShell.tsx`

**Interfaces:**

- Consumes: `MobileHeader` and `Header` composed by `LearnerShell`.
- Produces: one in-flow sticky-header contract where `main` needs no breakpoint-specific manual header offset.

- [ ] **Step 1: Write the failing shared-shell regression test**

Create `apps/web/test/dashboard-responsive-presentation.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("main learner headers occupy document flow without manual content offsets", () => {
  const shell = read("app/components/layout/LearnerShell.tsx");
  const mobileHeader = read("app/components/navigation/MobileHeader.tsx");

  assert.match(mobileHeader, /sticky top-0/);
  assert.doesNotMatch(mobileHeader, /fixed top-0/);
  assert.match(shell, /className="min-h-dvh min-w-0"/);
  assert.doesNotMatch(shell, /pt-16/);
  assert.doesNotMatch(shell, /lg:pt-\[68px\]/);
});
```

- [ ] **Step 2: Run test to verify RED**

Run `pnpm --filter @repo/web exec tsx --test test/dashboard-responsive-presentation.test.ts`.

Expected: FAIL because `MobileHeader` is fixed and both main-shell branches contain manual top padding.

- [ ] **Step 3: Implement the minimal shared-shell fix**

In `MobileHeader.tsx`, use:

```tsx
<nav className="bg-card/95 sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur lg:hidden">
```

In both main-shell branches of `LearnerShell.tsx`, use:

```tsx
<main id="main-content" className="min-h-dvh min-w-0">
```

Do not change the focused session shell.

- [ ] **Step 4: Run test to verify GREEN**

Run the command from Step 2. Expected: 1 test passes.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/test/dashboard-responsive-presentation.test.ts apps/web/app/components/navigation/MobileHeader.tsx apps/web/app/components/layout/LearnerShell.tsx
git commit -m "fix(web): stabilize responsive main shell"
```

---

### Task 2: Make Dashboard Cards Mobile-First

**Files:**

- Modify: `apps/web/test/dashboard-responsive-presentation.test.ts`
- Modify: `apps/web/app/views/dashboard/DashboardView.tsx`

**Interfaces:**

- Consumes: the in-flow main shell from Task 1 and existing Dashboard ViewModels.
- Produces: a full-width Dashboard root and queue grid that remains single-column until `md`.

- [ ] **Step 1: Add the failing Dashboard regression test**

Append:

```ts
test("Dashboard keeps variable content contained and delays dense grids", () => {
  const dashboard = read("app/views/dashboard/DashboardView.tsx");

  assert.match(dashboard, /className="min-w-0 w-full"/);
  assert.match(dashboard, /grid min-w-0 gap-4 md:grid-cols-3/);
  assert.doesNotMatch(dashboard, /sm:grid-cols-3/);
  assert.match(dashboard, /overflow-hidden rounded-lg bg-gradient-to-br p-5/);
});
```

- [ ] **Step 2: Run test to verify RED**

Run `pnpm --filter @repo/web exec tsx --test test/dashboard-responsive-presentation.test.ts`.

Expected: Task 1 passes and the Dashboard test fails on the old root, queue breakpoint, and phone padding.

- [ ] **Step 3: Implement the minimal Dashboard fix**

Replace the redundant two-level `w-full` wrappers with:

```tsx
<div className="min-w-0 w-full">
  <FeedWrapper>
    <div className="flex w-full flex-col pb-12">
</div>
```

Use `p-5 sm:p-8` for the recommendation panel. Change the queue grid to `grid min-w-0 gap-4 md:grid-cols-3`. Add `min-w-0` to each of the three queue-card root class lists. Do not alter data or actions.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/dashboard-responsive-presentation.test.ts app/features/dashboard/tests/dashboard-presentation.test.ts test/dashboard-loading-shell.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/test/dashboard-responsive-presentation.test.ts apps/web/app/views/dashboard/DashboardView.tsx
git commit -m "fix(web): make Dashboard mobile-first"
```

---

### Task 3: Align the Dashboard Skeleton and Verify Viewports

**Files:**

- Modify: `apps/web/test/dashboard-responsive-presentation.test.ts`
- Modify: `apps/web/app/components/feedback/RouteSkeletons.tsx`

**Interfaces:**

- Consumes: `DashboardPageSkeleton` from Dashboard loading branches.
- Produces: a skeleton with the same queue and CEFR breakpoint families as `DashboardView`.

- [ ] **Step 1: Add the failing skeleton-parity test**

Append:

```ts
test("Dashboard skeleton mirrors queue and CEFR responsive grids", () => {
  const skeletons = read("app/components/feedback/RouteSkeletons.tsx");
  const dashboardSkeleton = skeletons.slice(
    skeletons.indexOf("export function DashboardPageSkeleton"),
    skeletons.indexOf("export function ListPageSkeleton")
  );

  assert.match(dashboardSkeleton, /grid gap-4 md:grid-cols-3/);
  assert.match(dashboardSkeleton, /grid gap-4 sm:grid-cols-2 xl:grid-cols-4/);
  assert.doesNotMatch(
    dashboardSkeleton,
    /Array\.from\(\{ length: 4 \}\).*compact/s
  );
});
```

- [ ] **Step 2: Run test to verify RED**

Run `pnpm --filter @repo/web exec tsx --test test/dashboard-responsive-presentation.test.ts`.

Expected: FAIL because the current skeleton combines four cards into one unrelated grid.

- [ ] **Step 3: Implement matching skeleton grids**

After `HeroSkeleton`, render exactly:

```tsx
<div className="mt-5 grid gap-4 md:grid-cols-3">
  {Array.from({ length: 3 }).map((_, index) => (
    <CardSkeleton key={index} compact />
  ))}
</div>
<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {Array.from({ length: 4 }).map((_, index) => (
    <CardSkeleton key={index} />
  ))}
</div>
<div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
  <Skeleton className="h-72 rounded-2xl border" />
  <Skeleton className="h-72 rounded-2xl border" />
</div>
```

- [ ] **Step 4: Run automated verification**

```powershell
pnpm --filter @repo/web exec tsx --test test/dashboard-responsive-presentation.test.ts app/features/dashboard/tests/dashboard-presentation.test.ts test/dashboard-loading-shell.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
git diff --check
```

Expected: tests, type-check, build, and diff check pass; lint has no errors. Report existing unrelated warnings separately.

- [ ] **Step 5: Inspect all target widths**

With the authenticated local session, inspect `/vi/dashboard` at 360x800, 390x844, 768x1024, 1024x768, and 1440x900. Confirm the title starts below the header, there is no document-level horizontal scrollbar, cards fill the available width, the queue is one column on phones and three columns at 768+, and skeleton/resolved grids transition equivalently.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/test/dashboard-responsive-presentation.test.ts apps/web/app/components/feedback/RouteSkeletons.tsx
git commit -m "fix(web): align Dashboard responsive skeleton"
```
