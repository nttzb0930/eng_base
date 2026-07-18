# Frontend EC-Depth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Web verification/Auth defects, align active docs, and deepen the repeated learner-session, Admin Course Management, and Admin shell modules while preserving behavior.

**Architecture:** Keep the accepted EC-derived `app/features` + `app/views` profile. Work from the verification seam inward: make tests complete, isolate one-shot Auth bootstrap, introduce one small learning-session state module used by real Practice/Review/Lesson adapters, then move Admin implementation behind feature/shell interfaces. Every behavioral checkpoint follows red-green-refactor and is committed independently.

**Tech Stack:** TypeScript 6, Next.js 16 App Router, React 19, Node test runner through `tsx`, TanStack Query, pnpm/Turborepo.

## Global Constraints

- Preserve routes, HTTP methods, wire shapes, query keys, i18n behavior, visible copy, and storage keys.
- Do not restore frontend `src`, `platform`, authenticated Server Component HTTP, or Shared capability subpaths.
- Keep browser transport under each runtime's `app/features/auth/api` owner.
- Do not touch API, Prisma, migrations, vocabulary datasets, or the dirty main checkout.
- Run tasks sequentially in `refactor/frontend-ec-depth`.

---

### Task 1: Make the Web test command complete

**Files:**
- Modify: `apps/web/test/ec-feature-architecture.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: package script `test`.
- Produces: one `@repo/web test` command covering `test/**/*.test.ts` and `app/**/*.test.ts`.

- [ ] **Step 1: Add the failing architecture test**

Append a test that parses `package.json`, collects `.test.ts` files below `test` and `app`, and asserts the script equals:

```ts
'tsx --test "test/**/*.test.ts" "app/**/*.test.ts"'
```

Also assert both discovered groups are non-empty so the guard cannot pass vacuously.

- [ ] **Step 2: Verify RED**

Run:

```text
pnpm --filter @repo/web exec tsx --test test/ec-feature-architecture.test.ts
```

Expected: FAIL because the current script only contains `test/**/*.test.ts`.

- [ ] **Step 3: Expand the Web test script**

Set:

```json
"test": "tsx --test \"test/**/*.test.ts\" \"app/**/*.test.ts\""
```

- [ ] **Step 4: Verify GREEN**

Run the narrow architecture test, then `pnpm --filter @repo/web test`. Expected: the command includes the existing 16 root cases and 13 feature cases with zero failures.

- [ ] **Step 5: Commit**

```text
git add apps/web/package.json apps/web/test/ec-feature-architecture.test.ts
git commit -m "test(web): include feature tests in default gate"
```

---

### Task 2: Make learner Auth bootstrap one-shot

**Files:**
- Create: `apps/web/app/features/auth/session/auth-session-bootstrap.ts`
- Create: `apps/web/app/features/auth/tests/auth-session-bootstrap.test.ts`
- Modify: `apps/web/app/providers.tsx`
- Modify: `apps/web/test/ec-feature-architecture.test.ts`

**Interfaces:**
- Produces:

```ts
export type AuthSessionBootstrapDependencies = {
  hasRefreshSession(): boolean;
  refresh(): Promise<{ access_token: string; user: AuthUser }>;
  setAuthenticated(result: { access_token: string; user: AuthUser }): void;
  clearSession(): void;
  setUnauthenticated(): void;
};

export function createAuthSessionBootstrap(
  dependencies: AuthSessionBootstrapDependencies,
): { run(): Promise<void> };
```

`run()` caches its first promise. Later calls return the same completed/in-flight promise and never call refresh twice.

- [ ] **Step 1: Write failing bootstrap tests**

Test real controller behavior:

```ts
test("learner Auth bootstrap refreshes at most once", async () => {
  let refreshCalls = 0;
  const bootstrap = createAuthSessionBootstrap({
    hasRefreshSession: () => true,
    refresh: async () => {
      refreshCalls += 1;
      return { access_token: "access", user: learner };
    },
    setAuthenticated: () => undefined,
    clearSession: () => undefined,
    setUnauthenticated: () => undefined,
  });

  await Promise.all([bootstrap.run(), bootstrap.run()]);
  await bootstrap.run();
  assert.equal(refreshCalls, 1);
});
```

Add cases for no refresh cookie and refresh rejection clearing the session and marking unauthenticated.

- [ ] **Step 2: Verify RED**

Run the new test. Expected: module-not-found because the controller does not exist.

- [ ] **Step 3: Implement the controller**

Implement one cached `runPromise`. The first execution checks the refresh flag, refreshes when present, and owns all success/failure state transitions. It must not log session data.

- [ ] **Step 4: Integrate Providers**

Create the controller once with `useState`. Use one effect depending only on the stable controller to call `run()`. Keep a separate effect for `setOnUnauthenticated` so pathname changes only update redirect behavior. Do not create `AuthSessionProvider.tsx`.

- [ ] **Step 5: Strengthen the architecture guard**

Require `app/features/auth/session/auth-session-bootstrap.ts` and reject `app/features/auth/components/AuthSessionProvider.tsx`.

- [ ] **Step 6: Verify GREEN and commit**

Run Web Auth tests, all Web tests, typecheck, and lint. Commit:

```text
git commit -m "fix(web): initialize learner session once"
```

---

### Task 3: Synchronize active architecture documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `CONTEXT.md`
- Modify: `docs/architecture/codebase-structure.md`
- Modify: `docs/frontend-api-calls.md`
- Modify: `docs/overview.md`
- Modify: `apps/web/test/ec-feature-architecture.test.ts`

**Interfaces:**
- Produces: active documentation describing Auth-owned transport, root `@repo/shared`, and `packages/ui`.

- [ ] **Step 1: Add a failing documentation guard**

Scan the five active files and reject these stale strings:

```text
src/lib/web-http-client.ts
src/services/http/admin-http-client.ts
@repo/shared/courses
do not provide `packages/hooks` or `packages/ui`
```

Do not scan historical ADRs/specs/plans because they record superseded decisions.

- [ ] **Step 2: Verify RED**

Run the narrow Web architecture test. Expected: failure listing the active stale references.

- [ ] **Step 3: Update active docs**

Document the current flow exactly:

```text
route -> app/views -> app/features hook -> resource .api.ts
      -> app/features/auth/api/<runtime>-http-client.ts -> @repo/shared
```

Change Course Shared imports to root `@repo/shared`, describe `packages/shared` as the stable TypeScript-only aggregator, add `packages/ui`, and define **Learning session** in `CONTEXT.md` for the next task.

- [ ] **Step 4: Verify GREEN and commit**

Run architecture checks and commit:

```text
git commit -m "docs: align frontend architecture with current EC profile"
```

---

### Task 4: Introduce the deep learning-session state module

**Files:**
- Create: `apps/web/app/features/learning-session/learning-session-state.ts`
- Create: `apps/web/app/features/learning-session/use-learning-session.ts`
- Create: `apps/web/app/features/learning-session/tests/learning-session-state.test.ts`
- Modify: `apps/web/test/ec-feature-architecture.test.ts`

**Interfaces:**
- Produces:

```ts
export type LearningSessionStatus = "none" | "wrong" | "correct";

export type LearningSessionState<TItem> = {
  status: LearningSessionStatus;
  correctCount: number;
  wrongCount: number;
  reviewedItems: TItem[];
};

export function createLearningSessionState<TItem>(): LearningSessionState<TItem>;
export function learningSessionReducer<TItem>(
  state: LearningSessionState<TItem>,
  action:
    | { type: "record-answer"; correct: boolean; item: TItem }
    | { type: "clear-feedback" }
    | { type: "reset" },
): LearningSessionState<TItem>;

export function createLearningSessionCompletionGate<TItem>(): {
  record(items: TItem[], onComplete: (items: TItem[]) => void | Promise<void>): void;
  reset(): void;
};

export function useLearningSession<TItem>(options: {
  complete: boolean;
  onComplete(items: TItem[]): void | Promise<void>;
}): {
  state: LearningSessionState<TItem>;
  recordAnswer(correct: boolean, item: TItem): void;
  clearFeedback(): void;
  reset(): void;
};
```

The hook records completion once per session and resets that gate on `reset()`.

- [ ] **Step 1: Write reducer tests first**

Cover correct/wrong counts, append order, feedback clearing without losing counts/items, full reset, completion recorded once, and completion enabled again after reset.

- [ ] **Step 2: Verify RED**

Run only the new state test. Expected: module-not-found.

- [ ] **Step 3: Implement reducer and hook**

Keep answer evaluation, active index/queue, endpoint selection, audio, vocabulary toggles, and rendering outside this module. This module owns only the repeated lifecycle state and completion-once invariant.

- [ ] **Step 4: Add architecture ownership guard**

Require the learning-session files and forbid direct imports from this feature's private test path.

- [ ] **Step 5: Verify GREEN and commit**

Run its tests plus Web typecheck/lint. Commit:

```text
git commit -m "refactor(web): add deep learning session state"
```

---

### Task 5: Migrate Practice and Review adapters

**Files:**
- Modify: `apps/web/app/features/practice/fill-blank/PracticeQuiz.tsx`
- Modify: `apps/web/app/features/practice/listening/PracticeQuiz.tsx`
- Modify: `apps/web/app/features/practice/dictation/PracticeQuiz.tsx`
- Modify: `apps/web/app/features/practice/weak-words/PracticeQuiz.tsx`
- Modify: `apps/web/app/features/review/components/DailyReviewQuiz.tsx`
- Modify: `apps/web/app/features/review/components/SavedWordsReviewQuiz.tsx`
- Modify: `apps/web/test/ec-feature-architecture.test.ts`

**Interfaces:**
- Consumes: `useLearningSession<PracticeResultItem>` from Task 4.
- Preserves: mode-specific `onContinue`, answer evaluation, retries, audio, vocabulary progress, and `practiceApi.recordSession` payloads.

- [ ] **Step 1: Add a failing duplication guard**

For the six adapters, reject local declarations of all four lifecycle fields:

```text
useState<"none" | "wrong" | "correct">
useState(0) assigned to correctCount
useState(0) assigned to wrongCount
useState<PracticeResultItem[]>([])
```

The guard must fail before migration and allow mode-specific answer/index state.

- [ ] **Step 2: Verify RED**

Run the architecture test and confirm it fails on the six current implementations.

- [ ] **Step 3: Migrate one adapter at a time**

For every adapter:

- derive `status`, `correctCount`, `wrongCount`, and `reviewedItems` from the hook;
- replace count/status/item mutations with `recordAnswer` and `clearFeedback`;
- supply the existing mode-specific record payload through `onComplete`;
- call `reset` from its existing practice/review-again handler;
- run Web tests and typecheck before moving to the next adapter.

- [ ] **Step 4: Verify GREEN and commit**

Run all Web tests, typecheck, lint, and build. Commit:

```text
git commit -m "refactor(web): consolidate practice and review sessions"
```

---

### Task 6: Migrate the Lesson adapter

**Files:**
- Modify: `apps/web/app/features/lessons/hooks/use-lesson-quiz.ts`
- Modify: `apps/web/test/ec-feature-architecture.test.ts`

**Interfaces:**
- Consumes: `useLearningSession<PracticeResultItem>`.
- Preserves: heart loss, XP, challenge requeue on wrong answer, completion percentage, progress endpoint calls, and lesson result payload.

- [ ] **Step 1: Add a failing Lesson ownership assertion**

Require `use-lesson-quiz.ts` to import the learning-session hook and reject its local lifecycle state declarations.

- [ ] **Step 2: Verify RED**

Run the architecture test. Expected: Lesson still owns duplicate status/count/item state.

- [ ] **Step 3: Replace only shared lifecycle state**

Keep `challengeQueue`, `hearts`, `earnedXp`, `percentage`, `durationSeconds`, and selected option local. Route correct/wrong reviewed items through `recordAnswer`; use `clearFeedback` when the queue advances/requeues; use the completion callback for the current `saveCompletedSession` behavior.

- [ ] **Step 4: Verify GREEN and commit**

Run Web tests, typecheck, lint, and build. Commit:

```text
git commit -m "refactor(web): use learning session in lessons"
```

---

### Task 7: Move Course Management screens behind the Courses owner

**Files:**
- Create: `apps/admin/app/features/courses/components/CoursesManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/UnitsManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/LessonsManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/ChallengesManagementScreen.tsx`
- Create: `apps/admin/app/features/courses/components/ChallengeOptionsManagementScreen.tsx`
- Modify: the five matching files under `apps/admin/app/views`
- Modify: `apps/admin/test/course-feature-architecture.test.ts`

**Interfaces:**
- Produces: five feature-owned screen modules with the existing View props (currently none).
- Views become thin composition modules that render their matching feature screen.

- [ ] **Step 1: Add failing architecture assertions**

Require the five feature screen files. For each View, assert it imports the feature screen and contains no `useState`, `useMutation`, or direct Course hook import.

- [ ] **Step 2: Verify RED**

Run Admin architecture tests. Expected: feature screen files are missing.

- [ ] **Step 3: Move implementation resource by resource**

Move each existing View implementation unchanged to the matching feature screen module, rename only the exported symbol, and replace the View with explicit composition:

```tsx
import { CoursesManagementScreen } from "@/app/features/courses/components/CoursesManagementScreen";

export function CoursesView() {
  return <CoursesManagementScreen />;
}
```

Repeat independently for Units, Lessons, Challenges, and Challenge Options.

- [ ] **Step 4: Verify GREEN and commit**

Run Admin tests, typecheck, lint, and build. Commit:

```text
git commit -m "refactor(admin): localize course management screens"
```

---

### Task 8: Deepen the Admin dashboard shell

**Files:**
- Create: `apps/admin/app/components/layout/admin-navigation.ts`
- Create: `apps/admin/app/components/layout/AdminSidebar.tsx`
- Create: `apps/admin/app/components/layout/AdminNavbar.tsx`
- Create: `apps/admin/app/components/layout/AdminShell.tsx`
- Create: `apps/admin/app/store/sidebar.store.ts`
- Modify: `apps/admin/app/(dashboard)/layout.tsx`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`

**Interfaces:**
- `adminNavigation`: existing href/label/icon entries.
- `getAdminPageTitle(pathname: string): string`: existing title mapping.
- `useSidebarState`: owns collapsed/mobile state and actions locally in `AdminShell`.
- `AdminShell({ children })`: composes AuthGuard, sidebar, navbar, and content.

- [ ] **Step 1: Add failing architecture assertions**

Require all five shell files. Assert the route layout imports `AdminShell`, is below 30 lines, and contains no `localStorage`, nav item definitions, or pathname title mapping.

- [ ] **Step 2: Verify RED**

Run Admin architecture tests. Expected: files are missing and layout is too broad.

- [ ] **Step 3: Extract without behavioral changes**

Move the existing navigation labels, icons, path matching, collapse/mobile behavior, username display, storage keys, toast copy, and `/login` redirect into the new modules. Implement `useSidebarState` with React `useState` in `sidebar.store.ts`; `AdminShell` owns the state and passes values/actions to Sidebar and Navbar. Do not add a state dependency.

- [ ] **Step 4: Verify GREEN and commit**

Run Admin tests, typecheck, lint, and build. Commit:

```text
git commit -m "refactor(admin): deepen dashboard shell"
```

---

### Task 9: Final verification and handoff

**Files:**
- Verify all files changed by Tasks 1–8.

**Interfaces:**
- Produces: a clean, merge-ready `refactor/frontend-ec-depth` branch.

- [ ] **Step 1: Run complete gates**

```text
pnpm architecture:check
pnpm --filter @repo/web test
pnpm --filter @repo/admin test
pnpm --filter @repo/ui test
pnpm --filter @repo/web check-types
pnpm --filter @repo/admin check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/admin lint
pnpm --filter @repo/web build
pnpm --filter @repo/admin build
```

- [ ] **Step 2: Inspect branch state**

Run `git diff main...HEAD --check`, review `git status --short`, and confirm no API/data file is part of the branch.

- [ ] **Step 3: Use finishing-a-development-branch**

Present merge/keep/discard options. Do not merge until the user chooses.
