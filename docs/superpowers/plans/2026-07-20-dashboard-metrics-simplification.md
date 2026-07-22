# Dashboard Metrics Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Learner Dashboard display truthful review-queue, lifetime-overview, and seven-day activity values using the data already available today.

**Architecture:** Keep the existing Dashboard wire interface unchanged. Put reusable seven-day presentation calculations in one capability-owned pure module, then let the route-level View compose translated presentation from those results.

**Tech Stack:** TypeScript, React 19, Next.js 16, next-intl, Node test runner through `tsx --test`.

## Global Constraints

- Do not change Prisma, migrations, or Dashboard API behavior.
- Do not render `dailyReview.total` on the Dashboard.
- Do not estimate learning duration.
- Do not describe seven-day activity as a streak.
- Preserve every unrelated uncommitted change and stage only task-owned files.

---

### Task 1: Seven-day presentation calculations

**Files:**

- Create: `apps/web/app/features/dashboard/dashboard-presentation.ts`
- Create: `apps/web/app/features/dashboard/tests/dashboard-presentation.test.ts`

**Interfaces:**

- Consumes: `DashboardStats["activity"]` from the root `@repo/shared` interface.
- Produces: `summarizeWeeklyActivity(activity): { activeDays: number; reviewedWords: number }`.
- Produces: `formatActivityWeekday(dateKey: string, locale: string): string`.

- [ ] **Step 1: Write failing tests for weekly aggregation and locale-safe date formatting**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  formatActivityWeekday,
  summarizeWeeklyActivity,
} from "../dashboard-presentation";

test("summarizes active days and reviewed words", () => {
  const summary = summarizeWeeklyActivity([
    { date: "2026-07-19", sessionCount: 2, wordCount: 12, accuracy: 80 },
    { date: "2026-07-20", sessionCount: 0, wordCount: 0, accuracy: 0 },
  ]);

  assert.deepEqual(summary, { activeDays: 1, reviewedWords: 12 });
});

test("formats a date-only activity key without local timezone drift", () => {
  assert.equal(formatActivityWeekday("2026-07-20", "en"), "M");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @repo/web exec tsx --test app/features/dashboard/tests/dashboard-presentation.test.ts
```

Expected: FAIL because `dashboard-presentation.ts` does not exist.

- [ ] **Step 3: Implement the pure presentation module**

```ts
import type { DashboardStats } from "@repo/shared";

type DashboardActivity = DashboardStats["activity"];

export function summarizeWeeklyActivity(activity: DashboardActivity) {
  return activity.reduce(
    (summary, day) => ({
      activeDays: summary.activeDays + (day.sessionCount > 0 ? 1 : 0),
      reviewedWords: summary.reviewedWords + day.wordCount,
    }),
    { activeDays: 0, reviewedWords: 0 }
  );
}

export function formatActivityWeekday(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "narrow",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the command from Step 2. Expected: 2 tests pass.

- [ ] **Step 5: Commit only the pure module and its test**

```bash
git add apps/web/app/features/dashboard/dashboard-presentation.ts apps/web/app/features/dashboard/tests/dashboard-presentation.test.ts
git commit -m "test: define dashboard weekly presentation"
```

### Task 2: Render truthful Dashboard metrics

**Files:**

- Modify: `apps/web/app/views/dashboard/DashboardView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Consumes: `summarizeWeeklyActivity` and `formatActivityWeekday` from Task 1.
- Consumes: `dailyReview.due`, `dailyReview.saved`, and `dailyReview.weak`.
- Consumes: lifetime `dashboard.overview.totalReviews`, `dashboard.overview.accuracy`, and `userProgress.points`.

- [ ] **Step 1: Update the View to use truthful queue values**

Replace all Dashboard rendering of `dailyReview.total` with the owning queue value. The recommended hero and Due queue use `dailyReview.due`; Saved and Weak continue using `dailyReview.saved` and `dailyReview.weak`.

- [ ] **Step 2: Replace streak presentation with weekly activity**

Import the Task 1 module, compute:

```ts
const weeklyActivity = summarizeWeeklyActivity(dashboard.activity);
```

Remove `formatTimeSpent`, `getWeekdayLetter`, the View-owned streak calculation, and the hard-coded 14-day milestone. Render `weeklyActivity.activeDays`, `weeklyActivity.reviewedWords`, and `formatActivityWeekday(day.date, locale)`.

- [ ] **Step 3: Replace rolling-period claims with lifetime overview**

Change the panel title to `learningOverviewTitle`. Keep lifetime reviewed cards and XP, replace estimated time with:

```tsx
{dashboard.overview.accuracy}%
```

Use a `Target` icon and localized accuracy label/subtitle.

- [ ] **Step 4: Update English and Vietnamese messages**

Add or replace these message keys:

```json
{
  "weeklyActivityTitle": "7-day activity",
  "weeklyActiveDays": "{count}/7 active days",
  "weeklyReviewedWords": "{count} words reviewed",
  "learningOverviewTitle": "LEARNING OVERVIEW",
  "accuracyLabel": "Accuracy",
  "accuracySub": "across all reviews"
}
```

Vietnamese values:

```json
{
  "weeklyActivityTitle": "Hoạt động 7 ngày",
  "weeklyActiveDays": "{count}/7 ngày có hoạt động",
  "weeklyReviewedWords": "Đã luyện {count} từ",
  "learningOverviewTitle": "TỔNG QUAN HỌC TẬP",
  "accuracyLabel": "Độ chính xác",
  "accuracySub": "trên toàn bộ lượt ôn"
}
```

Delete obsolete streak, milestone, last-30-days, time-spent, and review-total Dashboard message keys once no caller remains.

- [ ] **Step 5: Run focused and static verification**

```bash
pnpm --filter @repo/web exec tsx --test app/features/dashboard/tests/dashboard-presentation.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm exec prettier --check apps/web/app/features/dashboard/dashboard-presentation.ts apps/web/app/features/dashboard/tests/dashboard-presentation.test.ts apps/web/app/views/dashboard/DashboardView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json
```

Expected: all commands exit 0.

- [ ] **Step 6: Inspect scope and commit task-owned files**

```bash
git diff --check
git diff -- apps/web/app/features/dashboard apps/web/app/views/dashboard/DashboardView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json
git add apps/web/app/views/dashboard/DashboardView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json
git commit -m "fix: make dashboard metrics truthful"
```
