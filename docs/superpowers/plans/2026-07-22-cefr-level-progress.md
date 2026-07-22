# CEFR Level Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Course Unit CEFR ownership and replace fabricated Learn/Learn Level metrics with a backend-owned A1–B2 progress summary.

**Architecture:** Add an additive nullable `units.cefr_level` migration with a guarded backfill for the immutable `english-vocabulary` Course. A focused Courses goal composes vocabulary, lesson, placement, and mastery data behind `GET /progress/cefr-levels`; Shared owns the wire contract, while Admin edits Unit CEFR and Web renders the response without deriving unlock state.

**Tech Stack:** PostgreSQL, Prisma 7, NestJS 11, TypeScript 6, React 19, Next.js 16, React Query 5, next-intl, Node test runner through `tsx`.

## Global Constraints

- Supported levels are exactly `A1`, `A2`, `B1`, and `B2` from `@repo/shared`.
- Unlock A1 always; unlock confirmed placement level and lower levels; unlock the next level at `masteredWords / totalWords >= 0.8` for the preceding non-empty level.
- Do not infer CEFR from Unit title or order at runtime.
- Do not add C1/C2 content or display C1/C2 on Learn/Learn Level.
- Do not run migrations, `db:push`, reset, seed, vocabulary mutation scripts, or provider calls.
- `prisma generate` is permitted because it updates generated client code without touching PostgreSQL.
- Preserve the existing feature/view frontend architecture and capability-owned backend goals.

---

### Task 1: Persist Unit CEFR ownership

**Files:**

- Create: `apps/api/prisma/migrations/20260722180000_add_unit_cefr_level/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/module/courses/tests/course-code.test.ts`

**Interfaces:**

- Consumes: immutable Course code `english-vocabulary` and existing Unit order 1–4.
- Produces: nullable Prisma field `units.cefr_level: string | null`, constrained to A1–B2.

- [ ] **Step 1: Add a failing migration contract test**

Append a test that reads the new migration and checks operation ordering:

```ts
test("Unit CEFR migration backfills English levels before constraining data", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260722180000_add_unit_cefr_level/migration.sql"
    ),
    "utf8"
  );

  const addPosition = migration.indexOf('ADD COLUMN "cefr_level" VARCHAR(2)');
  const backfillPosition = migration.indexOf("WHEN 1 THEN 'A1'");
  const guardPosition = migration.indexOf("RAISE EXCEPTION");
  const constraintPosition = migration.indexOf("units_cefr_level_check");
  const indexPosition = migration.indexOf("units_course_id_cefr_level_idx");

  assert.ok(addPosition >= 0);
  assert.ok(backfillPosition > addPosition);
  assert.ok(guardPosition > backfillPosition);
  assert.ok(constraintPosition > guardPosition);
  assert.ok(indexPosition > constraintPosition);
  assert.match(migration, /english-vocabulary/u);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm.cmd --filter @repo/api exec tsx --test src/module/courses/tests/course-code.test.ts
```

Expected: FAIL with `ENOENT` for the missing migration.

- [ ] **Step 3: Add the migration and Prisma field**

Create migration SQL with this exact flow:

```sql
ALTER TABLE "units" ADD COLUMN "cefr_level" VARCHAR(2);

UPDATE "units" AS "unit"
SET "cefr_level" = CASE "unit"."order"
  WHEN 1 THEN 'A1'
  WHEN 2 THEN 'A2'
  WHEN 3 THEN 'B1'
  WHEN 4 THEN 'B2'
END
FROM "courses" AS "course"
WHERE "unit"."course_id" = "course"."id"
  AND "course"."code" = 'english-vocabulary';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "units" AS "unit"
    INNER JOIN "courses" AS "course" ON "course"."id" = "unit"."course_id"
    WHERE "course"."code" = 'english-vocabulary'
      AND "unit"."cefr_level" IS NULL
  ) THEN
    RAISE EXCEPTION 'Unable to map every English vocabulary Unit to CEFR A1-B2';
  END IF;
END $$;

ALTER TABLE "units"
ADD CONSTRAINT "units_cefr_level_check"
CHECK ("cefr_level" IS NULL OR "cefr_level" IN ('A1', 'A2', 'B1', 'B2'));

CREATE INDEX "units_course_id_cefr_level_idx"
ON "units"("course_id", "cefr_level");
```

Add to the Prisma model:

```prisma
cefr_level String? @db.VarChar(2)
```

- [ ] **Step 4: Generate Prisma Client without applying the migration**

Run:

```powershell
pnpm.cmd db:generate
```

Expected: Prisma generation exits 0. Do not run any migrate command.

- [ ] **Step 5: Verify GREEN**

Run the focused test again. Expected: all course-code tests pass.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260722180000_add_unit_cefr_level/migration.sql apps/api/src/module/courses/tests/course-code.test.ts
git commit -m "feat(api): persist Unit CEFR level"
```

### Task 2: Extend Shared and Course Unit management contracts

**Files:**

- Modify: `packages/shared/src/types/course.ts`
- Modify: `packages/shared/src/types/progress.ts`
- Modify: `apps/api/src/module/courses/dto/course-content-management.dto.ts`
- Modify: `apps/api/src/module/courses/mappers/course-content.mapper.ts`
- Modify: `apps/api/src/module/courses/use-cases/course-learning.mapper.ts`
- Modify: `apps/api/src/module/courses/tests/course-content.mapper.spec.ts`
- Modify: `apps/api/src/module/courses/tests/course-content-management.dto.spec.ts`

**Interfaces:**

- Consumes: Shared `CefrLevel` and Prisma `units.cefr_level`.
- Produces: `CourseUnit.cefrLevel`, nullable Unit payloads, `CefrLevelProgress`, and `CefrProgressSummary`.

- [ ] **Step 1: Write failing mapper and DTO tests**

Update Unit fixtures to include `cefr_level: "A1"` and expect `cefrLevel: "A1"`. Protect explicit clearing:

```ts
assert.deepEqual(toUnitData({ cefrLevel: null }), { cefr_level: null });
```

Add DTO validation cases:

```ts
const valid = Object.assign(new UnitUpdateDto(), { cefrLevel: "B2" });
assert.deepEqual(await validate(valid), []);

const cleared = Object.assign(new UnitUpdateDto(), { cefrLevel: null });
assert.deepEqual(await validate(cleared), []);

const invalid = Object.assign(new UnitUpdateDto(), { cefrLevel: "C1" });
assert.equal(
  (await validate(invalid)).some((error) => error.property === "cefrLevel"),
  true
);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
pnpm.cmd --filter @repo/api exec tsx --test src/module/courses/tests/course-content.mapper.spec.ts src/module/courses/tests/course-content-management.dto.spec.ts
```

Expected: compile/assertion failures because `cefrLevel` is absent.

- [ ] **Step 3: Add Shared contracts**

Import `CefrLevel` into `course.ts` and add:

```ts
export type CourseUnit = {
  id: number;
  title: string;
  description: string;
  courseId: number;
  order: number;
  cefrLevel: CefrLevel | null;
};
```

Keep create/update payloads derived from `CourseUnit`, making create require an explicit nullable value. In `progress.ts` add:

```ts
import type { CefrLevel } from "../constants/cefr.js";

export type CefrLevelProgress = {
  level: CefrLevel;
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  completedLessons: number;
  totalLessons: number;
  unlocked: boolean;
};

export type CefrProgressSummary = {
  totalWords: number;
  levels: CefrLevelProgress[];
};
```

- [ ] **Step 4: Implement DTO and mapper support**

Use `@IsIn(CEFR_LEVELS)`, `@IsOptional()`, and `@IsString()` for non-null values. Use `@ValidateIf((_object, value) => value !== null)` so explicit `null` passes update validation. Map all read/create/update seams:

```ts
cefrLevel: unit.cefr_level,
cefr_level: body.cefrLevel,
...(body.cefrLevel !== undefined ? { cefr_level: body.cefrLevel } : {}),
```

Apply the same read field in `CourseLearningMapper.mapUnitRecord`.

- [ ] **Step 5: Verify GREEN and Shared compilation**

Run focused API tests, then:

```powershell
pnpm.cmd --filter @repo/shared build
pnpm.cmd --filter @repo/api check-types
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add packages/shared/src/types/course.ts packages/shared/src/types/progress.ts apps/api/src/module/courses/dto/course-content-management.dto.ts apps/api/src/module/courses/mappers/course-content.mapper.ts apps/api/src/module/courses/use-cases/course-learning.mapper.ts apps/api/src/module/courses/tests/course-content.mapper.spec.ts apps/api/src/module/courses/tests/course-content-management.dto.spec.ts
git commit -m "feat(shared): define CEFR progress contracts"
```

### Task 3: Implement the CEFR summary policy and use case

**Files:**

- Create: `apps/api/src/module/courses/use-cases/cefr-level-progress.policy.ts`
- Create: `apps/api/src/module/courses/use-cases/get-cefr-level-progress.use-case.ts`
- Create: `apps/api/src/module/courses/tests/get-cefr-level-progress.use-case.spec.ts`

**Interfaces:**

- Consumes: authenticated user id, A1–B2 grouped totals, user vocabulary progress, Unit lesson/challenge progress, confirmed placement level.
- Produces: `GetCefrLevelProgressUseCase.execute(userId): Promise<CefrProgressSummary>`.

- [ ] **Step 1: Write failing policy/use-case tests**

Use a mocked Prisma seam and cover these exact outcomes:

```ts
assert.equal(result.levels[0].unlocked, true); // A1
assert.equal(result.levels[1].unlocked, false); // 79/100 A1 mastered
assert.equal(result.levels[2].unlocked, true); // confirmed B1 override
assert.equal(result.levels[3].unlocked, false); // B2 remains locked
```

Add separate cases for 80/100 unlocking A2, zero A1 vocabulary not unlocking A2, and lesson completion requiring at least one challenge with every challenge completed.

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
pnpm.cmd --filter @repo/api exec tsx --test src/module/courses/tests/get-cefr-level-progress.use-case.spec.ts
```

Expected: module-not-found for the new use case.

- [ ] **Step 3: Implement the pure policy**

Export a function that always maps `CEFR_LEVELS` in order:

```ts
export function applyCefrUnlockPolicy(
  levels: Omit<CefrLevelProgress, "unlocked">[],
  confirmedLevel: CefrLevel | null
): CefrLevelProgress[] {
  const confirmedIndex = confirmedLevel
    ? CEFR_LEVELS.indexOf(confirmedLevel)
    : -1;
  return levels.map((level, index) => {
    const previous = levels[index - 1];
    const masteryUnlocked =
      index > 0 &&
      previous.totalWords > 0 &&
      previous.masteredWords / previous.totalWords >= 0.8;
    return {
      ...level,
      unlocked: index === 0 || index <= confirmedIndex || masteryUnlocked,
    };
  });
}
```

- [ ] **Step 4: Implement focused Prisma composition**

The use case must:

1. read active Course id and confirmed placement;
2. call `vocabulary_items.groupBy` for A1–B2 totals;
3. read only the authenticated user's vocabulary progress with selected `mastery_level` and related `cefr_level`;
4. read Units only for the active Course and non-null persisted CEFR, including lesson challenges and user-filtered progress;
5. compose zero-valued levels and apply the pure unlock policy.

Return zero lesson counts when there is no active Course, while still returning vocabulary totals and progress.

- [ ] **Step 5: Verify GREEN**

Run the focused test. Expected: every aggregation and policy case passes.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/module/courses/use-cases/cefr-level-progress.policy.ts apps/api/src/module/courses/use-cases/get-cefr-level-progress.use-case.ts apps/api/src/module/courses/tests/get-cefr-level-progress.use-case.spec.ts
git commit -m "feat(api): compose CEFR level progress"
```

### Task 4: Expose the authenticated CEFR progress endpoint

**Files:**

- Modify: `apps/api/src/module/courses/index.ts`
- Modify: `apps/api/src/module/courses/courses.module.ts`
- Modify: `apps/api/src/module/progress/progress.controller.ts`
- Create: `apps/api/src/module/progress/tests/progress-controller.test.ts`

**Interfaces:**

- Consumes: `GetCefrLevelProgressUseCase`.
- Produces: authenticated `GET /progress/cefr-levels`.

- [ ] **Step 1: Write a failing controller contract test**

Use Nest route metadata to assert `GET /progress/cefr-levels`, construct the controller with a fake goal, invoke `getCefrLevels("user-1")`, and assert the fake received `user-1` exactly once.

- [ ] **Step 2: Run the controller test and verify RED**

Expected: missing handler/provider compile failure.

- [ ] **Step 3: Wire delivery and module ownership**

Export the goal through `courses/index.ts`, register and export it from `CoursesModule`, inject it into `ProgressController`, and add:

```ts
@Get("cefr-levels")
getCefrLevels(@CurrentUserId() userId: string) {
  return this.getCefrLevelProgressGoal.execute(userId);
}
```

- [ ] **Step 4: Verify GREEN and API architecture**

Run the controller test, use-case test, `pnpm.cmd --filter @repo/api architecture:check`, and API typecheck.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/module/courses/index.ts apps/api/src/module/courses/courses.module.ts apps/api/src/module/progress/progress.controller.ts apps/api/src/module/progress/tests/progress-controller.test.ts
git commit -m "feat(api): expose CEFR level progress"
```

### Task 5: Add Web CEFR progress resource and query hook

**Files:**

- Modify: `apps/web/app/features/progress/api/progress.api.ts`
- Modify: `apps/web/app/features/progress/hooks/use-user-progress.ts`
- Modify: `apps/web/app/features/progress/tests/progress.api.test.ts`

**Interfaces:**

- Consumes: `GET /progress/cefr-levels` and `CefrProgressSummary`.
- Produces: `progressApi.getCefrLevels()`, query key `progressKeys.cefrLevels`, and `useCefrLevelProgress()`.

- [ ] **Step 1: Extend the failing resource test**

Call `api.getCefrLevels()` and expect:

```ts
{ method: "GET", path: "/progress/cefr-levels" }
```

- [ ] **Step 2: Verify RED**

Run the progress API test. Expected: `getCefrLevels is not a function`.

- [ ] **Step 3: Implement the resource and hook**

Add a typed GET returning `CefrProgressSummary`, then:

```ts
cefrLevels: ["progress", "cefr-levels"] as const,

export function useCefrLevelProgress(enabled = true) {
  return useQuery({
    queryKey: progressKeys.cefrLevels,
    queryFn: progressApi.getCefrLevels,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 4: Verify GREEN**

Run the progress API test and Web typecheck.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/app/features/progress/api/progress.api.ts apps/web/app/features/progress/hooks/use-user-progress.ts apps/web/app/features/progress/tests/progress.api.test.ts
git commit -m "feat(web): query CEFR level progress"
```

### Task 6: Add CEFR assignment to Admin Unit management

**Files:**

- Modify: `apps/admin/app/features/courses/components/UnitsManagementScreen.tsx`
- Modify: `apps/admin/app/features/courses/tests/course.api.test.ts`
- Create: `apps/admin/test/unit-cefr-management.test.ts`

**Interfaces:**

- Consumes: `CourseUnit.cefrLevel`, `CreateCourseUnitPayload`, `UpdateCourseUnitPayload`, and Shared `CEFR_LEVELS`.
- Produces: optional Admin Unit CEFR selector and explicit `null` create/update payload.

- [ ] **Step 1: Write a failing source/contract test**

Assert the Unit screen imports `CEFR_LEVELS`, initializes `cefrLevel` to `"none"`, restores `u.cefrLevel ?? "none"`, and submits:

```ts
cefrLevel: cefrLevel === "none" ? null : cefrLevel;
```

Update Unit API fixtures and expected request bodies to include `cefrLevel: "A1"`.

- [ ] **Step 2: Verify RED**

Run Admin tests. Expected: missing CEFR field assertions fail.

- [ ] **Step 3: Implement the selector**

Import `CEFR_LEVELS` and `CefrLevel`, add state `"none" | CefrLevel`, add a CEFR table column, and render a Select with `None` plus A1–B2. Create/edit payloads always contain `cefrLevel`, translating `none` to `null`.

- [ ] **Step 4: Verify GREEN**

Run Admin tests, typecheck, and lint.

- [ ] **Step 5: Commit**

```powershell
git add apps/admin/app/features/courses/components/UnitsManagementScreen.tsx apps/admin/app/features/courses/tests/course.api.test.ts apps/admin/test/unit-cefr-management.test.ts
git commit -m "feat(admin): manage Unit CEFR level"
```

### Task 7: Replace fabricated Learn metrics and localize touched copy

**Files:**

- Modify: `apps/web/app/views/learn/LearnView.tsx`
- Modify: `apps/web/app/views/learn/LearnLevelView.tsx`
- Modify: `apps/web/app/features/courses/hooks/use-learn.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Create: `apps/web/test/cefr-level-progress.test.ts`

**Interfaces:**

- Consumes: `useCefrLevelProgress()`, `useDashboard()`, persisted `unit.cefrLevel`, and existing Course/lesson queries.
- Produces: truthful A1–B2 Learn screens with no client-owned unlock policy or fabricated values.

- [ ] **Step 1: Write a failing Learn architecture test**

Read both views and assert they use `useCefrLevelProgress`; Learn also uses `useDashboard`. Assert Learn Level does not contain C1/C2 or the known fabricated values:

```ts
for (const forbidden of [
  "C1",
  "C2",
  "2847",
  "867",
  "920",
  "1100",
  "1250",
  "completedCount * 15",
]) {
  assert.equal(learnLevelSource.includes(forbidden), false, forbidden);
}
```

Assert `use-learn.ts` reads `unitItem.cefrLevel` and no longer exports a title parser. Parse both message catalogs and assert matching new keys.

- [ ] **Step 2: Run the new test and verify RED**

Expected: assertions fail on current hard-coded values and missing hooks.

- [ ] **Step 3: Remove client CEFR inference while preserving safe Unit selection**

Delete `getCefrLevel(title)`. Change `useLearn` to accept the unlocked CEFR levels returned by `useCefrLevelProgress`, match Units through `unit.cefrLevel`, and derive selectable Unit ids only from that server-owned result. Keep active Unit selection/navigation coordination in the hook, but remove its title/order inference and mastery/placement unlock policy.

- [ ] **Step 4: Render Learn Level from the response**

Map `cefrSummary.levels`. For each row, locate Units by persisted `cefrLevel`; display API word/lesson counts, calculate display percentage only as `masteredWords / totalWords`, and use `level.unlocked` for navigation and lock presentation. Render only A1–B2. While loading, render the page-specific Learn Level skeleton; on query failure or a genuinely empty summary, render localized page-level feedback with no fabricated fallback rows.

- [ ] **Step 5: Replace Learn overview sample metrics**

Add `useDashboard()` and `useCefrLevelProgress()`. Replace literals 428, 7, 87, 23, 5, and 3 with Dashboard mastered/accuracy/due data and CEFR learned, remaining lesson, unlocked-level, and total-level counts. Remove streak/active-mode wording where there is no real source. Preserve the page-specific Learn loading skeleton and show localized error/empty feedback when either required query cannot supply the section, rather than substituting sample values.

- [ ] **Step 6: Add matching English and Vietnamese copy**

Update level description from A1–C2 to A1–B2 and add keys for total vocabulary, mastered progress, placement/mastery lock explanation, unlocked levels, remaining lessons, learned words, and query failure/empty text. Keep identical key shapes in both catalogs.

- [ ] **Step 7: Verify GREEN**

Run:

```powershell
pnpm.cmd --filter @repo/web exec tsx --test test/cefr-level-progress.test.ts app/features/progress/tests/progress.api.test.ts
pnpm.cmd --filter @repo/web test
pnpm.cmd --filter @repo/web check-types
pnpm.cmd --filter @repo/web lint
```

Expected: tests/typecheck exit 0; lint may retain only already-known unrelated warnings.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/app/views/learn/LearnView.tsx apps/web/app/views/learn/LearnLevelView.tsx apps/web/app/features/courses/hooks/use-learn.ts apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test/cefr-level-progress.test.ts
git commit -m "feat(web): render truthful CEFR progress"
```

### Task 8: Update active documentation and run the full gate

**Files:**

- Modify: `docs/features-overview.md`
- Verify: repository-wide.

**Interfaces:**

- Consumes: completed CEFR vertical slice.
- Produces: current feature status and fresh verification evidence.

- [ ] **Step 1: Update the feature report**

Record that Unit CEFR is persisted, A1–B2 summaries and 80% mastery unlock are backend-owned, and Learn/Learn Level no longer show fabricated CEFR metrics. Keep Topic/Flashcard hard-code and Topic Practice listed as remaining Phase 1 work.

- [ ] **Step 2: Run package and API gates**

```powershell
pnpm.cmd --filter @repo/shared test
pnpm.cmd --filter @repo/shared check-types
pnpm.cmd --filter @repo/shared build
pnpm.cmd db:generate
pnpm.cmd --filter @repo/api architecture:check
pnpm.cmd --filter @repo/api test
pnpm.cmd --filter @repo/api check-types
pnpm.cmd --filter @repo/api lint
pnpm.cmd --filter @repo/api build
```

Expected: every command exits 0. No migration or seed command is run.

- [ ] **Step 3: Run Web and Admin gates**

```powershell
pnpm.cmd --filter @repo/ui build
pnpm.cmd --filter @repo/web test
pnpm.cmd --filter @repo/web check-types
pnpm.cmd --filter @repo/web lint
pnpm.cmd --filter @repo/web build
pnpm.cmd --filter @repo/admin test
pnpm.cmd --filter @repo/admin check-types
pnpm.cmd --filter @repo/admin lint
pnpm.cmd --filter @repo/admin build
```

Expected: every command exits 0.

- [ ] **Step 4: Run repository checks**

```powershell
pnpm.cmd architecture:check
pnpm.cmd exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
git -c safe.directory=C:/Users/nttzb/Downloads/eng_base diff --check
git -c safe.directory=C:/Users/nttzb/Downloads/eng_base status --short
```

Expected: checks exit 0 and status contains only this plan's intended changes.

- [ ] **Step 5: Commit documentation**

```powershell
git add docs/features-overview.md
git commit -m "docs: record CEFR progress implementation"
```
