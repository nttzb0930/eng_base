# TOEIC Reading Single-Question Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render one TOEIC Reading question at a time with Previous, Next, direct question selection, stimulus context, and final submission.

**Architecture:** Keep the complete test payload client-side. Add pure active-question transitions to the existing session-state owner, make question navigation callback-based, and let the session view derive and render only the active question and its stimulus.

**Tech Stack:** Next.js 16, React 19, TypeScript, next-intl, Tailwind CSS, Node test runner.

## Global Constraints

- Apply to Full Test and Part 5, Part 6, and Part 7.
- Next does not require an answer.
- Submission still requires all questions to be answered.
- Do not change API contracts, database schema, grading, or attempt history.
- Keep all copy synchronized in English and Vietnamese.
- Do not commit or push automatically from the shared `develop` workspace.

---

### Task 1: Active-question state transitions

**Files:**

- Modify: `apps/web/app/features/toeic-reading/toeic-reading-session-state.ts`
- Modify: `apps/web/app/features/toeic-reading/tests/toeic-reading-session-state.test.ts`

**Interfaces:**

- Produces: `selectToeicQuestion(state, questionIds, questionId)`
- Produces: `moveToeicQuestion(state, questionIds, offset)`
- Produces: `getToeicActiveQuestionId(state, questionIds)`
- Extends: `ToeicReadingSessionState.activeQuestionId: number | null`

- [ ] **Step 1: Write failing state tests**

Add tests proving the first question is the default, direct selection accepts
only known IDs, and Previous/Next clamp at list bounds.

- [ ] **Step 2: Verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading-session-state.test.ts
```

Expected: FAIL because the active-question functions do not exist.

- [ ] **Step 3: Implement pure transitions**

Use immutable state updates. `getToeicActiveQuestionId` returns the stored ID
when it exists in `questionIds`, otherwise the first ID or `null`.
`selectToeicQuestion` ignores unknown IDs. `moveToeicQuestion` derives the
current index and clamps it between zero and `questionIds.length - 1`.

- [ ] **Step 4: Verify GREEN**

Run the focused test command and expect all session-state tests to pass.

### Task 2: Callback-based question navigation

**Files:**

- Modify: `apps/web/app/features/toeic-reading/components/ToeicPartNavigation.tsx`
- Modify: `apps/web/test/toeic-reading-architecture.test.ts`

**Interfaces:**

- Consumes: `activeQuestionId: number | null`
- Consumes: `onSelectQuestion: (questionId: number) => void`

- [ ] **Step 1: Write a failing architecture test**

Require question controls to be `<button>`, invoke `onSelectQuestion`, and
expose `aria-current={activeQuestionId === question.id ? "step" : undefined}`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-reading-architecture.test.ts
```

Expected: FAIL because navigation still uses fragment links.

- [ ] **Step 3: Replace fragment links with buttons**

Add the two props, preserve answered/review icons, add an active ring treatment,
and call the selection callback without scrolling the long page.

- [ ] **Step 4: Verify GREEN**

Run the focused architecture test and expect it to pass.

### Task 3: Single-question session composition

**Files:**

- Modify: `apps/web/app/views/toeic-reading/ToeicReadingSessionView.tsx`
- Modify: `apps/web/app/features/toeic-reading/components/ToeicQuestion.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/app/features/toeic-reading/tests/toeic-reading-messages.test.ts`
- Modify: `apps/web/test/toeic-reading-architecture.test.ts`

**Interfaces:**

- Consumes: active-question state helpers from Task 1.
- Consumes: callback navigation from Task 2.

- [ ] **Step 1: Write failing composition and message tests**

Require localized `previousQuestion`, `nextQuestion`, `questionPosition`, and
`answeredPosition` messages. Require the session view to render exactly one
`ToeicQuestion` from an `activeQuestion` value rather than mapping all
questions.

- [ ] **Step 2: Verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-reading-architecture.test.ts app/features/toeic-reading/tests/toeic-reading-messages.test.ts
```

Expected: FAIL for missing copy and single-question composition.

- [ ] **Step 3: Implement active-question rendering**

Flatten questions in source-number order, derive the active part, question, and
stimulus, render the stimulus only when referenced, then render one
`ToeicQuestion`. Add Previous and Next controls; replace Next with Submit on the
final question. Pass active state and selection callback to
`ToeicPartNavigation`.

- [ ] **Step 4: Add focus behavior**

Make the question fieldset programmatically focusable with `tabIndex={-1}`.
After active-question changes, focus the fieldset by its stable ID.

- [ ] **Step 5: Verify focused behavior**

Run the focused tests from Step 2 and the session-state tests from Task 1.

- [ ] **Step 6: Run full Web verification**

Run:

```powershell
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
pnpm --filter @repo/web exec prettier --check app/features/toeic-reading app/views/toeic-reading app/messages/en.json app/messages/vi.json test/toeic-reading-architecture.test.ts
git diff --check
```

Expected: every command exits zero.
