# TOEIC Reading Learner UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete localized Learner journey from By Certificate to TOEIC Reading discovery, focused Parts 5-7 practice, submission, and immutable result review.

**Architecture:** Localized routes remain thin and render views from `app/views/toeic-reading`. The `app/features/toeic-reading` owner contains its authenticated resource API, React Query hooks, pure session state, and capability components. Browsing uses the main shell, while test and result routes use the existing focused session shell.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query 5, next-intl 4, Tailwind CSS 3, Lucide React, Node test runner.

## Global Constraints

- Preserve the active locale through every link and redirect.
- Import cross-runtime declarations only from the root `@repo/shared` Interface.
- Test detail is treated as answer-key-free; no frontend correctness inference exists before submission.
- The UI uses only real API counts and attempts and never invents progress.
- TOEIC Reading uses emerald as the single accent and the existing rounded-2xl card / rounded-xl control system.
- Motion is limited to hover, active, and state feedback; no new animation dependency or scroll listener.
- Each route owns a layout-matching skeleton.
- English and Vietnamese message trees remain structurally identical.
- Keyboard controls, visible focus, semantic radio controls, explicit submit confirmation, and non-color-only results are required.

---

### Task 1: TOEIC Reading Browser Data Boundary

**Files:**

- Create: `apps/web/app/features/toeic-reading/api/toeic-reading.api.ts`
- Create: `apps/web/app/features/toeic-reading/hooks/use-toeic-reading.ts`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-reading.api.test.ts`

**Interfaces:**

- Produces: `toeicReadingKeys`, `toeicReadingApi`, overview/list/detail/history/result query hooks, and submit mutation.
- Consumes: all `ToeicReading*` declarations from root `@repo/shared`.

- [ ] **Step 1: Write the failing resource API test**

Exercise all six endpoints and assert exact method, path, body, and stable query keys:

```ts
await api.overview();
await api.tests();
await api.test(11);
await api.submit(submission);
await api.attempts();
await api.attempt(7);
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading.api.test.ts
```

Expected: FAIL because the resource API does not exist.

- [ ] **Step 3: Implement the API and hooks**

Delegate all requests to `webHttpClient`. Invalidate overview, test lists, attempt histories, and the created result after submit. Enable numeric detail/result queries only for positive integers.

- [ ] **Step 4: Run focused test and Web typecheck**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading.api.test.ts
pnpm --filter @repo/web check-types
```

Expected: both pass.

### Task 2: Certificate and TOEIC Reading Browsing

**Files:**

- Create: `apps/web/app/views/toeic-reading/ToeicOverviewView.tsx`
- Create: `apps/web/app/views/toeic-reading/ToeicReadingListView.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicOverviewSkeleton.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingListSkeleton.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/page.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/loading.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/reading/page.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/reading/loading.tsx`
- Modify: `apps/web/app/views/courses/CoursesView.tsx`
- Create: `apps/web/test/toeic-reading-architecture.test.ts`

**Interfaces:**

- Produces: localized main-shell routes `/learn/cert/toeic` and `/learn/cert/toeic/reading`.
- Consumes: overview/test hooks from Task 1.

- [ ] **Step 1: Write the failing route architecture test**

Assert thin page imports, unique loading skeleton imports, localized route paths, feature/view placement, and a TOEIC certificate card link to `/learn/cert/toeic`.

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-reading-architecture.test.ts
```

Expected: FAIL because routes and views do not exist.

- [ ] **Step 3: Implement the overview**

Render API-backed Reading availability and totals, Listening as coming later, and recent attempts with result links. Provide loading, retryable error, and truthful no-content states.

- [ ] **Step 4: Implement the Reading test browser**

Render published tests with exact Part 5/6/7 counts, latest attempt result, and one primary action to start or retry the full test. Use a responsive two-column grid and semantic headings.

- [ ] **Step 5: Wire the certificate card and thin routes**

TOEIC routes directly to its overview. Existing non-TOEIC certificate Courses keep their current selection behavior.

- [ ] **Step 6: Run architecture, focused tests, and typecheck**

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-reading-architecture.test.ts app/features/toeic-reading/tests/toeic-reading.api.test.ts
pnpm --filter @repo/web check-types
```

Expected: all pass.

### Task 3: Focused Parts 5-7 Session

**Files:**

- Create: `apps/web/app/features/toeic-reading/toeic-reading-session-state.ts`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-reading-session-state.test.ts`
- Create: `apps/web/app/features/toeic-reading/components/ToeicStimulus.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicQuestion.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicPartNavigation.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingSessionSkeleton.tsx`
- Create: `apps/web/app/views/toeic-reading/ToeicReadingSessionView.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/reading/tests/[testId]/page.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/reading/tests/[testId]/loading.tsx`

**Interfaces:**

- Produces: focused route `/toeic/reading/tests/:testId`.
- Produces pure helpers `createToeicReadingSessionState`, `selectToeicAnswer`, `toggleToeicReview`, and `buildToeicSubmissionAnswers`.

- [ ] **Step 1: Write failing pure session-state tests**

Cover answer replacement, review markers, answered counts, deterministic question order across Parts, complete submission construction, and incomplete submission rejection.

- [ ] **Step 2: Run state tests and verify RED**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading-session-state.test.ts
```

Expected: FAIL because session state does not exist.

- [ ] **Step 3: Implement pure session state**

Store answers by question ID and review markers as question IDs. Build submission answers in API question order and return `null` until every question is answered.

- [ ] **Step 4: Implement Part-aware presentation**

Part 5 renders standalone questions. Parts 6 and 7 render each stimulus once followed by its associated questions; stimulus-less questions remain visible. Radio controls use one name per question, labels wrap the full answer row, and selection is keyboard accessible.

- [ ] **Step 5: Implement focused session orchestration**

Show sticky Part/question navigation, answered and review state, explicit submit confirmation, stable `crypto.randomUUID()` idempotency key, retryable mutation errors, and version-conflict copy instructing reload. On success navigate to the localized result route.

- [ ] **Step 6: Add the thin route and unique skeleton**

Parse `testId` in the page adapter and render `ToeicReadingSessionView`; loading mirrors session header, passage column, question panel, and navigation rail.

- [ ] **Step 7: Run focused state, architecture, type, and lint gates**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading-session-state.test.ts test/toeic-reading-architecture.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
```

Expected: all pass.

### Task 4: Result Review, Localization, and Final Route States

**Files:**

- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingResultSkeleton.tsx`
- Create: `apps/web/app/views/toeic-reading/ToeicReadingResultView.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/reading/results/[attemptId]/page.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/reading/results/[attemptId]/loading.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-reading-messages.test.ts`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/features-overview.md`

**Interfaces:**

- Produces: focused route `/toeic/reading/results/:attemptId`.
- Consumes: immutable result hook from Task 1.

- [ ] **Step 1: Write failing message parity and presentation tests**

Assert identical `toeicReading` key trees for English/Vietnamese, all four loading routes use distinct skeleton components, and result presentation includes overall score, all Part summaries, semantic correct/incorrect labels, selected answer, correct answer, and explanation.

- [ ] **Step 2: Run tests and verify RED**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading-messages.test.ts test/toeic-reading-architecture.test.ts
```

Expected: FAIL because result route/messages do not exist.

- [ ] **Step 3: Implement the result view and route**

Render overall accuracy, Part 5/6/7 summaries, and question review from attempt snapshots only. Correctness is communicated by icon, label, and border treatment, not color alone. Add retryable error and not-found ownership-safe copy.

- [ ] **Step 4: Add synchronized English and Vietnamese copy**

Use the `toeicReading` namespace for overview, list, session, confirmation, conflict, error, empty, and result strings. Avoid hard-coded visible learner copy in components.

- [ ] **Step 5: Update canonical frontend documentation**

Record the localized main/session route tree, feature data flow, route-specific skeleton ownership, and immutable result behavior.

- [ ] **Step 6: Run complete Web verification**

```powershell
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
git diff --check
```

Expected: all pass.
