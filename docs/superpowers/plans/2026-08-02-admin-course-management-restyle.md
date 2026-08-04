# Admin Course Management Restyle Implementation Plan

> **For Codex:** Execute task by task with focused RED/GREEN checks and commit each resource slice independently.

**Goal:** Rebuild Courses, Units, Lessons, Challenges, and Challenge Options on the approved Shadcn Admin foundation while preserving every route, HTTP request, cache key, pagination parameter, and payload.

**Architecture:** Each route-level View remains thin. Query/mutation orchestration stays in the existing capability-owned management screen. Table columns, editor schema/form, and destructive confirmation become focused components below `app/features/courses/components/<resource>/`. Shared presentation is consumed from `app/components`; no aggregate Course Management API is introduced.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Shadcn/Radix, TanStack Query/Table, React Hook Form, Zod, Sonner.

---

## Invariants

- Keep `/courses`, `/units`, `/lessons`, `/challenges`, and `/challenge-options` unchanged.
- Keep the five resource `.api.ts` modules and query-key roots unchanged.
- Keep server pagination/search/filter parameters and response envelopes unchanged.
- Keep immutable course codes read-only while editing.
- Preserve the camelCase API path `/admin/challengeOptions`.
- Do not add API, Prisma, migration, seed, or data-workflow changes.
- Remove native selects, `confirm()`, literal Zinc/white surfaces, and broad bold text from rebuilt production screens.

### Task 1: Guard the target presentation architecture

**Files:**

- Modify: `apps/admin/test/course-feature-architecture.test.ts`

1. Add failing assertions for feature-local columns, schema/editor form, and delete-dialog composition for all five resources.
2. Assert each management screen consumes `PageHeader`, `DataTable`, semantic feedback, and no browser `confirm()` or native `<select>`.
3. Assert course View adapters remain thin and API modules remain split by resource.
4. Run `pnpm --filter @repo/admin exec tsx --test test/course-feature-architecture.test.ts` and confirm RED.
5. Commit the characterization guard.

### Task 2: Add the shared destructive-action pattern

**Files:**

- Create: `apps/admin/app/components/forms/DestructiveActionDialog.tsx`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`

1. Add a failing placement/import assertion.
2. Implement a controlled Alert Dialog with named-resource copy, cancel/confirm labels, pending state, and destructive button semantics.
3. Keep mutation/error ownership with callers; the component owns presentation only.
4. Run Admin architecture, type, and lint checks.
5. Commit the shared pattern.

### Task 3: Restyle Courses

**Files:**

- Modify: `apps/admin/app/features/courses/components/CoursesManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/courses/course-columns.tsx`
- Create: `apps/admin/app/features/courses/components/courses/CourseEditorForm.tsx`
- Create: `apps/admin/app/features/courses/components/courses/course-editor.schema.ts`

1. Extend architecture characterization and run RED.
2. Extract stable-ID columns with semantic badges and accessible action names.
3. Build the editor with React Hook Form/Zod, FormField/FormActions, Shadcn Dialog, and the existing create/update payload.
4. Keep immutable code disabled during edit and retain server errors/input.
5. Replace deletion with DestructiveActionDialog and use shared loading/error/empty states.
6. Run focused architecture, API characterization, type, lint, and build checks.
7. Commit the Courses slice.

### Task 4: Restyle Units

**Files:**

- Modify: `apps/admin/app/features/courses/components/UnitsManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/units/unit-columns.tsx`
- Create: `apps/admin/app/features/courses/components/units/UnitEditorForm.tsx`
- Create: `apps/admin/app/features/courses/components/units/unit-editor.schema.ts`

Repeat the RED/GREEN extraction used for Courses. Preserve course lookup/filter behavior, CEFR Shared contract values, ordering, payloads, and pagination. Use Shadcn Select for Course and CEFR. Verify and commit independently.

### Task 5: Restyle Lessons

**Files:**

- Modify: `apps/admin/app/features/courses/components/LessonsManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/lessons/lesson-columns.tsx`
- Create: `apps/admin/app/features/courses/components/lessons/LessonEditorForm.tsx`
- Create: `apps/admin/app/features/courses/components/lessons/lesson-editor.schema.ts`

Repeat the RED/GREEN extraction. Preserve Unit lookup/filter behavior, ordering, payloads, and pagination. Verify and commit independently.

### Task 6: Restyle Challenges

**Files:**

- Modify: `apps/admin/app/features/courses/components/ChallengesManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/challenges/challenge-columns.tsx`
- Create: `apps/admin/app/features/courses/components/challenges/ChallengeEditorForm.tsx`
- Create: `apps/admin/app/features/courses/components/challenges/challenge-editor.schema.ts`

Repeat the RED/GREEN extraction. Preserve Lesson lookup, challenge type, question/order payload, pagination, and cache behavior. Replace type/status color-only rendering with Badge text plus semantic variants. Verify and commit independently.

### Task 7: Restyle Challenge Options

**Files:**

- Modify: `apps/admin/app/features/courses/components/ChallengeOptionsManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/challenge-options/challenge-option-columns.tsx`
- Create: `apps/admin/app/features/courses/components/challenge-options/ChallengeOptionEditorForm.tsx`
- Create: `apps/admin/app/features/courses/components/challenge-options/challenge-option-editor.schema.ts`

Repeat the RED/GREEN extraction. Preserve Challenge lookup, correctness, text/audio/image/order payload, camelCase API path, pagination, and cache behavior. Use Switch/Select rather than native controls and retain explicit correctness text. Verify and commit independently.

### Task 8: Course Management consistency gate

1. Search the five production screens for forbidden native controls, `confirm()`, literal Zinc/white surfaces, and broad bold text; resolve remaining matches deliberately.
2. Run `pnpm --filter @repo/admin architecture:check`.
3. Run `pnpm --filter @repo/admin test`.
4. Run `pnpm --filter @repo/admin check-types`.
5. Run `pnpm --filter @repo/admin lint`.
6. Run `pnpm --filter @repo/admin build`.
7. Update canonical frontend documentation only if the implemented ownership differs from its current description.
