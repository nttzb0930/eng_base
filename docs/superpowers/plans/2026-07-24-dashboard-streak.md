# Dashboard Learning Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic server-owned current streak, longest streak, and last learning timestamp to Dashboard and Learn.

**Architecture:** A pure Dashboard streak policy consumes sorted UTC activity dates. The Dashboard use case queries distinct qualifying Practice session dates, calculates streak once, and returns it through `@repo/shared`; Web only formats the response.

**Tech Stack:** NestJS, Prisma/PostgreSQL, TypeScript, `@repo/shared`, Next.js, next-intl.

## Global Constraints

- First release uses UTC calendar dates.
- A qualifying learning session has `correct_count + wrong_count > 0`.
- Saving a word, opening a page, placement onboarding, and zero-attempt sessions do not extend streak.
- Current streak remains active when the most recent learning day is today or yesterday UTC.
- Reads never mutate progress.

---

### Task 1: Define and Test the Pure Streak Policy

**Files:**

- Create: `apps/api/src/module/dashboard/use-cases/dashboard-streak.policy.ts`
- Create: `apps/api/src/module/dashboard/tests/dashboard-streak.policy.spec.ts`

**Interfaces:**

- Produces: `calculateDashboardStreak(activityDates, now)`.

- [ ] **Step 1: Write failing tests**

With fixed `now = new Date("2026-07-24T12:00:00.000Z")`, cover:

```ts
test("empty activity returns zero streaks and null last learning");
test("duplicate dates count once");
test("today and previous consecutive days form current streak");
test("yesterday keeps current streak active");
test("a gap before yesterday resets current streak to zero");
test("longest streak can be older than current streak");
test("input order does not affect the result");
```

Expected shape:

```ts
{
  currentStreak: 3,
  longestStreak: 5,
  lastLearningAt: new Date("2026-07-24T10:00:00.000Z"),
  timeZone: "UTC",
}
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/dashboard/tests/dashboard-streak.policy.spec.ts
```

- [ ] **Step 3: Implement date normalization**

Input type:

```ts
export type DashboardLearningDay = {
  date: string;
  lastLearningAt: Date;
};
```

Deduplicate by `date`, keeping the latest timestamp. Sort ascending. Calculate
every consecutive run using UTC date keys converted to epoch-day integers.
Current streak is the last run only when its last epoch day equals today or
yesterday.

- [ ] **Step 4: Confirm GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/dashboard/tests/dashboard-streak.policy.spec.ts
```

Commit:

```powershell
git add apps/api/src/module/dashboard/use-cases/dashboard-streak.policy.ts apps/api/src/module/dashboard/tests/dashboard-streak.policy.spec.ts
git commit -m "feat(api): define learning streak policy"
```

### Task 2: Extend the Shared Dashboard Contract

**Files:**

- Modify: `packages/shared/src/types/dashboard.ts`
- Test: `packages/shared/test/shared-root-interface.test.ts`

**Interfaces:**

- Produces: `DashboardStreak` and `DashboardStats.streak`.

- [ ] **Step 1: Write the failing contract**

Compile:

```ts
const streak: DashboardStreak = {
  currentStreak: 3,
  longestStreak: 5,
  lastLearningAt: new Date("2026-07-24T10:00:00.000Z"),
  timeZone: "UTC",
};
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/shared test
```

- [ ] **Step 3: Add the type and field**

Add the type above and:

```ts
export type DashboardStats = {
  overview: DashboardOverview;
  streak: DashboardStreak;
  levelProgress: DashboardLevelProgress[];
  topWeakWords: DashboardWeakWord[];
  recentSessions: DashboardRecentSession[];
  activity: DashboardActivityDay[];
  modeAccuracy: DashboardModeAccuracy[];
};
```

Keep existing inline member shapes if extracting aliases would create unrelated
churn; the required change is the typed `streak` field.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/shared check-types
git add packages/shared/src/types/dashboard.ts packages/shared/test/shared-root-interface.test.ts
git commit -m "feat(shared): expose Dashboard streak"
```

### Task 3: Query Learning Days and Compose Dashboard

**Files:**

- Modify: `apps/api/src/module/dashboard/use-cases/get-dashboard-stats.use-case.ts`
- Create: `apps/api/src/module/dashboard/tests/get-dashboard-stats.use-case.spec.ts`

**Interfaces:**

- Consumes: qualifying Practice session rows.
- Produces: `DashboardStats.streak`.

- [ ] **Step 1: Write failing use-case tests**

Mock Prisma and assert:

```ts
assert.deepEqual(result.streak, {
  currentStreak: 2,
  longestStreak: 4,
  lastLearningAt: new Date("2026-07-24T10:00:00.000Z"),
  timeZone: "UTC",
});
```

Assert missing user returns zero/null streak.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/dashboard/tests/get-dashboard-stats.use-case.spec.ts
```

- [ ] **Step 3: Add the bounded UTC activity query**

Add one `$queryRaw` to the existing `Promise.all`:

```ts
type RawLearningDay = {
  date: string;
  last_learning_at: Date;
};

const learningDays = await this.prisma.$queryRaw<RawLearningDay[]>`
  SELECT
    TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
    MAX(created_at) AS last_learning_at
  FROM practice_sessions
  WHERE user_id = ${userId}
    AND correct_count + wrong_count > 0
  GROUP BY (created_at AT TIME ZONE 'UTC')::date
  ORDER BY (created_at AT TIME ZONE 'UTC')::date ASC
`;
```

Pass mapped rows and one captured `now` to `calculateDashboardStreak`.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/dashboard/tests/get-dashboard-stats.use-case.spec.ts src/module/dashboard/tests/dashboard-streak.policy.spec.ts
pnpm --filter @repo/api check-types
```

Commit:

```powershell
git add apps/api/src/module/dashboard/use-cases/get-dashboard-stats.use-case.ts apps/api/src/module/dashboard/tests
git commit -m "feat(api): compose Dashboard learning streak"
```

### Task 4: Render the Same Streak in Dashboard and Learn

**Files:**

- Modify: `apps/web/app/views/dashboard/DashboardView.tsx`
- Modify: `apps/web/app/views/learn/LearnView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/app/features/dashboard/tests/dashboard.api.test.ts`
- Test: `apps/web/test/dashboard-streak-presentation.test.ts`

**Interfaces:**

- Consumes: `dashboard.streak`.
- Produces: consistent localized streak presentation.

- [ ] **Step 1: Write failing tests**

Assert:

```ts
assert.match(dashboardView, /dashboard\.streak\.currentStreak/);
assert.match(learnView, /dashboard\.streak\.currentStreak/);
assert.doesNotMatch(learnView, /streakDays",\s*\{\s*count:\s*7/);
```

API fixture includes the complete `streak` object.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/dashboard/tests/dashboard.api.test.ts test/dashboard-streak-presentation.test.ts
```

- [ ] **Step 3: Add localized copy**

Add matching Dashboard keys:

```json
"currentStreak": "{count}-day streak",
"longestStreak": "Longest: {count} days",
"streakTimeZone": "Calculated by UTC learning days"
```

Use natural Vietnamese equivalents with the same placeholders.

- [ ] **Step 4: Render response fields**

Both views use `dashboard.streak.currentStreak`; Dashboard additionally renders
longest streak and the UTC policy tooltip. Do not derive streak from the
seven-day activity array.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/dashboard/tests/dashboard.api.test.ts test/dashboard-streak-presentation.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Commit:

```powershell
git add apps/web/app/views/dashboard/DashboardView.tsx apps/web/app/views/learn/LearnView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/app/features/dashboard/tests/dashboard.api.test.ts apps/web/test/dashboard-streak-presentation.test.ts
git commit -m "feat(web): render Dashboard learning streak"
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
