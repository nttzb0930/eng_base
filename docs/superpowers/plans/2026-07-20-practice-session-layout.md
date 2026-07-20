# Practice Session Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move active Practice quizzes out of the global Learner navigation layout and into a focused, full-viewport session layout without changing their localized public URLs.

**Architecture:** Keep the Practice landing page under `[locale]/(main)` and place only active quiz pages under `[locale]/(session)`. Generalize `LearnerShell` from a Lesson-specific mode to a shared session mode, then let `PracticeSessionShell` consume the full height supplied by that route layout.

**Tech Stack:** Next.js App Router route groups, React 19, TypeScript, Tailwind CSS, Node test runner through `tsx`.

## Global Constraints

- Public localized URLs such as `/vi/practice/fill-blank` must not change.
- The Practice landing page keeps global navigation; active Practice quizzes do not render global navigation.
- Active Practice quizzes retain their exit action, progress bar, question count, answer footer, API behavior, scoring, query keys, and localization.
- Authentication and placement confirmation remain owned by `LearnerShell`.
- Lesson and Practice share the generic `session` layout mode; no `practice`-specific pathname checks belong in `LearnerShell`.
- Do not add dependencies or create a second Practice implementation.

---

## File Map

| File | Responsibility |
| --- | --- |
| `apps/web/app/components/layout/LearnerShell.tsx` | Selects the authenticated main or focused session frame. |
| `apps/web/app/[locale]/lesson/layout.tsx` | Adapts Lesson routes to the generic session frame. |
| `apps/web/app/[locale]/(session)/layout.tsx` | Adapts focused Practice routes to the generic session frame. |
| `apps/web/app/[locale]/(main)/practice/page.tsx` | Keeps the Practice mode-selection screen in the main frame. |
| `apps/web/app/[locale]/(session)/practice/*/{page,loading}.tsx` | Owns the four active Practice route adapters and their focused loading states. |
| `apps/web/app/features/practice/components/PracticeSessionShell.tsx` | Lays out Practice session header, scrolling question body, and footer. |
| `apps/web/test/route-architecture.test.ts` | Protects route-group ownership and unchanged route boundaries. |
| `apps/web/test/frontend-feature-architecture.test.ts` | Protects the shared session-mode contract and viewport ownership. |
| `docs/architecture/frontend.md` | Documents main versus focused Learner route ownership. |

---

### Task 1: Generalize the authenticated session frame

**Files:**

- Create: `apps/web/app/[locale]/(session)/layout.tsx`
- Modify: `apps/web/app/components/layout/LearnerShell.tsx`
- Modify: `apps/web/app/[locale]/lesson/layout.tsx`
- Modify: `apps/web/test/frontend-feature-architecture.test.ts`

**Interfaces:**

- Consumes: existing `LearnerShell({ children, mode })`, Auth state, progress query, and placement guard.
- Produces: `mode?: "main" | "session"`; both Lesson and `(session)` layouts call `<LearnerShell mode="session">`.

- [ ] **Step 1: Write the failing architecture test**

Append this test to `apps/web/test/frontend-feature-architecture.test.ts`:

```ts
test("focused learning routes use the generic Learner session frame", () => {
  const learnerShellPath = "app/components/layout/LearnerShell.tsx";
  const lessonLayoutPath = "app/[locale]/lesson/layout.tsx";
  const sessionLayoutPath = "app/[locale]/(session)/layout.tsx";

  assert.equal(existsSync(join(root, sessionLayoutPath)), true);

  const learnerShellSource = readFileSync(join(root, learnerShellPath), "utf8");
  const lessonLayoutSource = readFileSync(join(root, lessonLayoutPath), "utf8");
  const sessionLayoutSource = readFileSync(join(root, sessionLayoutPath), "utf8");

  assert.equal(learnerShellSource.includes('mode?: "main" | "session"'), true);
  assert.equal(learnerShellSource.includes('mode === "lesson"'), false);
  assert.equal(lessonLayoutSource.includes('mode="session"'), true);
  assert.equal(sessionLayoutSource.includes('mode="session"'), true);
});
```

- [ ] **Step 2: Run the test and verify the red state**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/frontend-feature-architecture.test.ts
```

Expected: FAIL because `app/[locale]/(session)/layout.tsx` does not exist and `LearnerShell` still exposes `lesson` mode.

- [ ] **Step 3: Implement the generic session mode**

In `LearnerShell.tsx`, change the public mode and both mode branches:

```tsx
type LearnerShellProps = {
  children: React.ReactNode;
  mode?: "main" | "session";
};

export function LearnerShell({ children, mode = "main" }: LearnerShellProps) {
  const { status } = useAuth();
  const progressQuery = useUserProgress(status === "authenticated");
  const fallback = mode === "session" ? <SessionPageSkeleton embedded /> : <ListPageSkeleton />;

  if (status !== "authenticated" || progressQuery.isLoading) return fallback;

  const userProgress = progressQuery.data;
  if (userProgress && !userProgress.isPlacementTestConfirmed) {
    return (
      <PlacementConfirmationGuard isConfirmed={false} fallback={fallback}>
        {children}
      </PlacementConfirmationGuard>
    );
  }

  if (mode === "session") {
    return <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden">{children}</div>;
  }

  return (
    <>
      <MobileHeader />
      <Header className="hidden lg:flex" />
      <main id="main-content" className="min-h-dvh pt-16 lg:pt-[68px]">
        <div className="app-container py-6 sm:py-8 lg:py-10">{children}</div>
      </main>
      <ScrollToTopButton />
    </>
  );
}
```

Update `apps/web/app/[locale]/lesson/layout.tsx`:

```tsx
import type { PropsWithChildren } from "react";

import { LearnerShell } from "@/app/components/layout/LearnerShell";

export default function LessonLayout({ children }: PropsWithChildren) {
  return <LearnerShell mode="session">{children}</LearnerShell>;
}
```

Create `apps/web/app/[locale]/(session)/layout.tsx`:

```tsx
import type { PropsWithChildren } from "react";

import { LearnerShell } from "@/app/components/layout/LearnerShell";

export default function SessionLayout({ children }: PropsWithChildren) {
  return <LearnerShell mode="session">{children}</LearnerShell>;
}
```

- [ ] **Step 4: Run the focused test and type-check**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/frontend-feature-architecture.test.ts
pnpm --filter @repo/web check-types
```

Expected: architecture tests pass and TypeScript exits with code `0`.

- [ ] **Step 5: Commit the session-frame contract**

```powershell
git add -- "apps/web/app/components/layout/LearnerShell.tsx" "apps/web/app/[locale]/lesson/layout.tsx" "apps/web/app/[locale]/(session)/layout.tsx" "apps/web/test/frontend-feature-architecture.test.ts"
git commit -m "refactor: generalize learner session layout"
```

---

### Task 2: Move active Practice routes into the focused route group

**Files:**

- Move: `apps/web/app/[locale]/(main)/practice/fill-blank/page.tsx` -> `apps/web/app/[locale]/(session)/practice/fill-blank/page.tsx`
- Move: `apps/web/app/[locale]/(main)/practice/fill-blank/loading.tsx` -> `apps/web/app/[locale]/(session)/practice/fill-blank/loading.tsx`
- Move: `apps/web/app/[locale]/(main)/practice/listening/page.tsx` -> `apps/web/app/[locale]/(session)/practice/listening/page.tsx`
- Move: `apps/web/app/[locale]/(main)/practice/listening/loading.tsx` -> `apps/web/app/[locale]/(session)/practice/listening/loading.tsx`
- Move: `apps/web/app/[locale]/(main)/practice/dictation/page.tsx` -> `apps/web/app/[locale]/(session)/practice/dictation/page.tsx`
- Move: `apps/web/app/[locale]/(main)/practice/dictation/loading.tsx` -> `apps/web/app/[locale]/(session)/practice/dictation/loading.tsx`
- Move: `apps/web/app/[locale]/(main)/practice/weak-words/page.tsx` -> `apps/web/app/[locale]/(session)/practice/weak-words/page.tsx`
- Move: `apps/web/app/[locale]/(main)/practice/weak-words/loading.tsx` -> `apps/web/app/[locale]/(session)/practice/weak-words/loading.tsx`
- Modify: `apps/web/test/route-architecture.test.ts`

**Interfaces:**

- Consumes: the `(session)` layout from Task 1 and the existing four Practice Views.
- Produces: unchanged URLs for four Practice modes, now rendered without global Learner navigation.

- [ ] **Step 1: Write the failing route-ownership test**

Append this test to `apps/web/test/route-architecture.test.ts`:

```ts
test("Practice browsing stays in main while active quizzes use the session route group", () => {
  const localizedDirectory = join(appDirectory, "[locale]");
  const practiceModes = ["fill-blank", "listening", "dictation", "weak-words"];

  assert.equal(
    existsSync(join(localizedDirectory, "(main)", "practice", "page.tsx")),
    true,
  );

  for (const mode of practiceModes) {
    for (const filename of ["page.tsx", "loading.tsx"]) {
      assert.equal(
        existsSync(join(localizedDirectory, "(session)", "practice", mode, filename)),
        true,
        `${mode}/${filename} must use the focused session route group`,
      );
      assert.equal(
        existsSync(join(localizedDirectory, "(main)", "practice", mode, filename)),
        false,
        `${mode}/${filename} must not inherit the main navigation layout`,
      );
    }
  }
});
```

- [ ] **Step 2: Run the test and verify the red state**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/route-architecture.test.ts
```

Expected: FAIL because the four quiz routes still exist under `(main)`.

- [ ] **Step 3: Move the existing route adapters without changing their contents**

Run from the repository root:

```powershell
$modes = @("fill-blank", "listening", "dictation", "weak-words")
foreach ($mode in $modes) {
  $target = "apps/web/app/[locale]/(session)/practice/$mode"
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  git mv -- "apps/web/app/[locale]/(main)/practice/$mode/page.tsx" "$target/page.tsx"
  git mv -- "apps/web/app/[locale]/(main)/practice/$mode/loading.tsx" "$target/loading.tsx"
}
```

Do not move `apps/web/app/[locale]/(main)/practice/page.tsx` or its sibling `loading.tsx`; they belong to the navigation-enabled Practice landing page.

- [ ] **Step 4: Run route tests and type-check**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/route-architecture.test.ts test/frontend-feature-architecture.test.ts
pnpm --filter @repo/web check-types
```

Expected: both test files pass and TypeScript exits with code `0`.

- [ ] **Step 5: Commit the route migration**

```powershell
git add -- "apps/web/app/[locale]/(main)/practice" "apps/web/app/[locale]/(session)/practice" "apps/web/test/route-architecture.test.ts"
git commit -m "refactor: isolate active practice routes"
```

---

### Task 3: Let Practice own the complete session viewport

**Files:**

- Modify: `apps/web/app/features/practice/components/PracticeSessionShell.tsx`
- Modify: `apps/web/test/frontend-feature-architecture.test.ts`
- Modify: `docs/architecture/frontend.md`

**Interfaces:**

- Consumes: the `h-dvh` flex container supplied by `LearnerShell mode="session"`.
- Produces: a full-height Practice flex layout whose question body is the only scrolling region.

- [ ] **Step 1: Write the failing viewport-ownership test**

Append this test to `apps/web/test/frontend-feature-architecture.test.ts`:

```ts
test("Practice session shell consumes the focused frame without header offsets", () => {
  const path = "app/features/practice/components/PracticeSessionShell.tsx";
  const source = readFileSync(join(root, path), "utf8");

  assert.equal(source.includes('className="flex h-full min-h-0 flex-col overflow-hidden"'), true);
  assert.equal(source.includes("calc(100dvh"), false);
});
```

- [ ] **Step 2: Run the test and verify the red state**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/frontend-feature-architecture.test.ts
```

Expected: FAIL because `PracticeSessionShell` still subtracts approximate main-layout heights with `calc(100dvh - ...)`.

- [ ] **Step 3: Replace the approximate height calculation**

Replace the current root element:

```tsx
<div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden lg:h-[calc(100dvh-5rem)]">
```

with:

```tsx
<div className="flex h-full min-h-0 flex-col overflow-hidden">
```

Update the `Learner Web layout` section of `docs/architecture/frontend.md` with this route ownership block:

```text
apps/web/app/[locale]/
  (main)/                 navigation-enabled Learner browsing routes
    practice/page.tsx     Practice mode selection
  (session)/              focused full-viewport learning routes
    practice/*            active Practice quizzes
  lesson/                 focused Lesson routes using the same session frame
```

Document that route groups do not change localized public URLs and that session content supplies its own exit/progress controls.

- [ ] **Step 4: Run all Web verification gates**

Run:

```powershell
pnpm --filter @repo/web test
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Expected: every command exits with code `0`; Node test output contains no failed tests; Next.js completes the production build without conflicting-route errors.

- [ ] **Step 5: Perform responsive manual verification**

Run:

```powershell
pnpm --filter @repo/web dev
```

Verify at desktop and mobile viewport widths:

1. `/vi/practice` shows the global navigation.
2. `/vi/practice/fill-blank`, `/vi/practice/listening`, `/vi/practice/dictation`, and `/vi/practice/weak-words` do not show global navigation.
3. Each active session shows exit, progress, question count, question content, and answer footer without overlap.
4. Tall content scrolls only inside the question region.
5. Exit returns to the expected localized Practice destination.
6. `/vi/lesson/<id>` remains full-screen and behaves as before.

- [ ] **Step 6: Commit the viewport and documentation changes**

```powershell
git add -- "apps/web/app/features/practice/components/PracticeSessionShell.tsx" "apps/web/test/frontend-feature-architecture.test.ts" "docs/architecture/frontend.md"
git commit -m "fix: use focused viewport for practice sessions"
```
