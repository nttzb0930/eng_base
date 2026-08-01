# TOEIC Reading Practice Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated, server-graded TOEIC Reading Part practice with immediate feedback while preserving the deferred-grading Full Test flow.

**Architecture:** A dedicated practice-session aggregate persists one immutable graded answer per question. Nest use cases own start/resume, grading, navigation, and completion; the learner-safe Shared contracts feed a React Query adapter and a Part-specific practice workspace. The existing attempt/draft flow remains the sole implementation for `scope=full`.

**Tech Stack:** PostgreSQL, Prisma 7, NestJS, class-validator, TypeScript, Next.js 16, React 19, TanStack Query, next-intl, Tailwind CSS, Node test runner.

## Global Constraints

- All practice routes require `UserJwtGuard` authentication and user ownership checks.
- Never include correct option data for an unanswered practice question.
- A question is graded once per session; changing its answer after successful grading returns a conflict.
- Full Test retains the existing draft, final submission, and result behavior.
- Missing explanation or translation data is omitted rather than generated.
- No fixed minimum width may increase `document.scrollWidth` beyond the viewport.
- Target responsive widths are 360, 390, 768, 1024, and 1440 pixels.
- Use only root `@repo/shared` imports for cross-runtime contracts.

---

### Task 1: Practice persistence and Shared Interface

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260802090000_add_toeic_reading_practice_sessions/migration.sql`
- Modify: `packages/shared/src/types/toeic-reading.ts`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-practice-migration.spec.ts`
- Modify: `docs/architecture/api.md`

**Interfaces:**

- Produces: `ToeicReadingPracticeSession`, `ToeicReadingPracticeAnswerResult`, `ToeicReadingPracticeStartPayload`, `ToeicReadingPracticeAnswerPayload`, `ToeicReadingPracticeUpdatePayload`, and `ToeicReadingPracticeSummary` from `@repo/shared`.
- Produces Prisma models `toeic_reading_practice_sessions` and `toeic_reading_practice_answers`.

- [x] **Step 1: Write the failing migration and contract characterization tests**

```ts
test("TOEIC Reading practice persistence owns sessions and immutable answers", () => {
  assert.match(schema, /model toeic_reading_practice_sessions/);
  assert.match(schema, /model toeic_reading_practice_answers/);
  assert.match(migration, /UNIQUE \("session_id", "question_id_snapshot"\)/);
  assert.match(migration, /UNIQUE \("session_id", "request_key"\)/);
  assert.match(migration, /"active_key" TEXT/);
});
```

- [x] **Step 2: Run the migration test and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-practice-migration.spec.ts`  
Expected: FAIL because the migration and Prisma models do not exist.

- [x] **Step 3: Add the Prisma models and SQL migration**

```prisma
model toeic_reading_practice_sessions {
  id                  Int      @id @default(autoincrement())
  user_id             String
  test_id             Int
  part                Int
  source_version      String   @db.VarChar(64)
  status              String   @db.VarChar(12)
  active_key          String?  @unique(map: "toeic_reading_practice_sessions_active_key_key")
  active_question_id  Int
  review_question_ids Int[]
  correct_count       Int      @default(0)
  incorrect_count     Int      @default(0)
  created_at          DateTime @default(now()) @db.Timestamp(6)
  updated_at          DateTime @default(now()) @updatedAt @db.Timestamp(6)
  completed_at        DateTime? @db.Timestamp(6)
  users               users    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  toeic_tests         toeic_tests @relation(fields: [test_id], references: [id], onDelete: Restrict)
  toeic_reading_practice_answers toeic_reading_practice_answers[]

  @@index([user_id, updated_at])
  @@index([test_id, part])
}

model toeic_reading_practice_answers {
  id                              Int      @id @default(autoincrement())
  session_id                      Int
  request_key                     String   @db.Uuid
  question_id_snapshot            Int
  question_number_snapshot        Int
  selected_option_id_snapshot     Int
  selected_option_label_snapshot  String   @db.VarChar(1)
  selected_option_text_snapshot   String
  correct_option_id_snapshot      Int
  correct_option_label_snapshot   String   @db.VarChar(1)
  correct_option_text_snapshot    String
  explanation_snapshot            String?
  question_translation_snapshot   String?
  correct                         Boolean
  answered_at                     DateTime @default(now()) @db.Timestamp(6)
  toeic_reading_practice_sessions toeic_reading_practice_sessions @relation(fields: [session_id], references: [id], onDelete: Cascade)

  @@unique([session_id, question_id_snapshot])
  @@unique([session_id, request_key])
  @@index([session_id, answered_at])
}
```

Also add both relation arrays to `users` and `toeic_tests`. Use explicit migration constraint/index names consistent with existing TOEIC tables.

- [x] **Step 4: Add Shared wire types**

```ts
export type ToeicReadingPracticeStartPayload = {
  testId: number;
  part: ToeicReadingPart;
  sourceVersion: string;
};

export type ToeicReadingPracticeAnswerPayload = {
  questionId: number;
  optionId: number;
  requestKey: string;
};

export type ToeicReadingPracticeUpdatePayload = {
  activeQuestionId: number;
  reviewQuestionIds: number[];
};

export type ToeicReadingPracticeProgress = {
  correct: number;
  incorrect: number;
  answered: number;
  total: number;
};

export type ToeicReadingPracticeAnswerResult = {
  questionId: number;
  selectedOptionId: number;
  correct: boolean;
  correctOption: ToeicReadingLearnerOption;
  explanation: string | null;
  questionTranslation: string | null;
  progress: ToeicReadingPracticeProgress;
  nextQuestionId: number | null;
};

export type ToeicReadingPracticeSession = {
  id: number;
  testId: number;
  part: ToeicReadingPart;
  sourceVersion: string;
  status: "ACTIVE" | "COMPLETED";
  activeQuestionId: number;
  reviewQuestionIds: number[];
  content: ToeicReadingTestDetail;
  answers: ToeicReadingPracticeAnswerResult[];
  progress: ToeicReadingPracticeProgress;
  updatedAt: string;
  completedAt: string | null;
};

export type ToeicReadingPracticeSummary = {
  sessionId: number;
  progress: ToeicReadingPracticeProgress;
  incorrectQuestionIds: number[];
  completedAt: string;
};
```

`correctOption` is required only inside `ToeicReadingPracticeAnswerResult`, never on `ToeicReadingLearnerQuestion`.

- [x] **Step 5: Verify Task 1**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-practice-migration.spec.ts
pnpm --filter @repo/shared check-types
pnpm --filter @repo/api prisma:generate
pnpm --filter @repo/api check-types
```

Expected: all commands exit 0.

- [x] **Step 6: Commit**

```powershell
git add apps/api/prisma packages/shared/src/types/toeic-reading.ts apps/api/src/module/toeic-reading/tests/toeic-reading-practice-migration.spec.ts docs/architecture/api.md
git commit -m "feat(api): add TOEIC Reading practice persistence"
```

---

### Task 2: Server-owned practice lifecycle and grading

**Files:**

- Modify: `apps/api/src/module/toeic-reading/dto/toeic-reading.dto.ts`
- Create: `apps/api/src/module/toeic-reading/toeic-reading-practice.mapper.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/start-toeic-reading-practice.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/get-toeic-reading-practice.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/grade-toeic-reading-practice-answer.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/update-toeic-reading-practice.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/use-cases/complete-toeic-reading-practice.use-case.ts`
- Create: `apps/api/src/module/toeic-reading/tests/toeic-reading-practice.use-cases.spec.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.controller.ts`
- Modify: `apps/api/src/module/toeic-reading/toeic-reading.module.ts`

**Interfaces:**

- Consumes: Shared Task 1 payload/result types and Prisma practice models.
- Produces: authenticated routes under `/toeic/reading/practice-sessions`.

- [ ] **Step 1: Write failing use-case tests**

Cover these named cases with mocked `PrismaService` methods:

```ts
test(
  "start resumes the active session for the same user test Part and version"
);
test("start rejects Full Test and unpublished or replaced source versions");
test("get exposes correct answers only for questions already graded");
test("grade rejects a question outside the session Part");
test("grade returns the original result for a repeated request key");
test("grade rejects changing an already graded question");
test("grade atomically increments the correct or incorrect count");
test("update validates the active and marked questions belong to the session");
test("complete clears active_key and returns retryable incorrect question ids");
test("foreign user session ids are not readable or mutable");
```

- [ ] **Step 2: Run the use-case tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-practice.use-cases.spec.ts`  
Expected: FAIL because the use cases do not exist.

- [ ] **Step 3: Add validated request DTOs**

```ts
export class ToeicReadingPracticeStartDto implements ToeicReadingPracticeStartPayload {
  @IsInt() testId!: number;
  @IsInt() @IsIn([5, 6, 7]) part!: ToeicReadingPart;
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  sourceVersion!: string;
}

export class ToeicReadingPracticeAnswerDto implements ToeicReadingPracticeAnswerPayload {
  @IsInt() questionId!: number;
  @IsInt() optionId!: number;
  @IsUUID() requestKey!: string;
}

export class ToeicReadingPracticeUpdateDto implements ToeicReadingPracticeUpdatePayload {
  @IsInt() activeQuestionId!: number;
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  reviewQuestionIds!: number[];
}
```

- [ ] **Step 4: Implement the learner-safe mapper and start/get use cases**

`mapToeicReadingPracticeSession` must build questions through the same safe mapping rules as `GetToeicReadingTestUseCase` and merge answer feedback only for stored answer rows. Generate `active_key` as a SHA-256 digest of `userId:testId:part:sourceVersion`, and clear it on completion.

- [ ] **Step 5: Implement idempotent grading in a Prisma transaction**

The use case order is exact:

1. Read the owned active session.
2. Return the stored answer if `request_key` already exists.
3. Reject when the session/question unique answer already exists with another key.
4. Load the question and options constrained by session test and Part.
5. Validate the selected option belongs to the question and find exactly one correct option.
6. Create the immutable answer snapshot and increment one session counter in the same transaction.
7. Return feedback and progress.

- [ ] **Step 6: Expose controller routes**

```ts
@Post("practice-sessions")
startPractice(@CurrentUserId() userId: string, @Body() body: ToeicReadingPracticeStartDto) {}

@Get("practice-sessions/:sessionId")
practice(@CurrentUserId() userId: string, @Param("sessionId", ParseIntPipe) sessionId: number) {}

@Post("practice-sessions/:sessionId/answers")
gradePracticeAnswer(@CurrentUserId() userId: string, @Param("sessionId", ParseIntPipe) sessionId: number, @Body() body: ToeicReadingPracticeAnswerDto) {}

@Patch("practice-sessions/:sessionId")
updatePractice(@CurrentUserId() userId: string, @Param("sessionId", ParseIntPipe) sessionId: number, @Body() body: ToeicReadingPracticeUpdateDto) {}

@Post("practice-sessions/:sessionId/complete")
completePractice(@CurrentUserId() userId: string, @Param("sessionId", ParseIntPipe) sessionId: number) {}
```

Add `Patch` to Nest imports and register all use cases in `ToeicReadingModule`.

- [ ] **Step 7: Verify Task 2**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-reading/tests/toeic-reading-practice.use-cases.spec.ts src/module/toeic-reading/tests/toeic-reading.controller.spec.ts src/module/toeic-reading/tests/toeic-reading.dto.spec.ts
pnpm --filter @repo/api check-types
```

Expected: all tests and type-check pass.

- [ ] **Step 8: Commit**

```powershell
git add apps/api/src/module/toeic-reading
git commit -m "feat(api): grade TOEIC Reading practice answers"
```

---

### Task 3: Web practice resource adapter and client state

**Files:**

- Modify: `apps/web/app/features/toeic-reading/api/toeic-reading.api.ts`
- Modify: `apps/web/app/features/toeic-reading/hooks/use-toeic-reading.ts`
- Create: `apps/web/app/features/toeic-reading/toeic-reading-practice-state.ts`
- Modify: `apps/web/app/features/toeic-reading/tests/toeic-reading.api.test.ts`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-reading-practice-state.test.ts`

**Interfaces:**

- Consumes: practice contracts and authenticated HTTP routes from Tasks 1–2.
- Produces: `useStartToeicReadingPractice`, `useToeicReadingPractice`, `useGradeToeicReadingPracticeAnswer`, `useUpdateToeicReadingPractice`, and `useCompleteToeicReadingPractice`.

- [ ] **Step 1: Write failing adapter and state tests**

```ts
test("practice API uses the authenticated practice-session endpoints");
test("practice query keys isolate each session");
test("pending selection survives a grade failure");
test("graded feedback replaces the pending selection after success");
test("moving between questions preserves restored graded state");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading.api.test.ts app/features/toeic-reading/tests/toeic-reading-practice-state.test.ts`  
Expected: FAIL because practice methods and state helpers do not exist.

- [ ] **Step 3: Add API methods and query keys**

```ts
practiceRoot: () => [...toeicReadingKeys.all, "practice"] as const,
practice: (sessionId: number) =>
  [...toeicReadingKeys.practiceRoot(), sessionId] as const,

startPractice: (body: ToeicReadingPracticeStartPayload) =>
  http.post<ToeicReadingPracticeSession>("/toeic/reading/practice-sessions", body),
gradePracticeAnswer: (sessionId: number, body: ToeicReadingPracticeAnswerPayload) =>
  http.post<ToeicReadingPracticeAnswerResult>(`/toeic/reading/practice-sessions/${sessionId}/answers`, body),
```

Add corresponding `get`, `patch`, and `complete` methods; extend `ToeicReadingHttp` with `patch`.

- [ ] **Step 4: Add hooks with authoritative cache updates**

On grading success, update the session cache by replacing/adding only the returned graded answer and returned progress. On failure, do not clear pending UI state. On completion, set the returned completed session summary and invalidate test-list progress.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading.api.test.ts app/features/toeic-reading/tests/toeic-reading-practice-state.test.ts
pnpm --filter @repo/web check-types
```

Expected: PASS.

```powershell
git add apps/web/app/features/toeic-reading
git commit -m "feat(web): add TOEIC Reading practice client"
```

---

### Task 4: Part 5 guided-practice workspace

**Files:**

- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingPracticeShell.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingWorkspace.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingQuestionPane.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingFeedback.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingQuestionDrawer.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingPracticeSummary.tsx`
- Create: `apps/web/app/views/toeic-reading/ToeicReadingPracticeView.tsx`
- Modify: `apps/web/app/[locale]/(session)/toeic/reading/tests/[testId]/page.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-reading-practice-presentation.test.ts`

**Interfaces:**

- Consumes: practice hooks and session types from Tasks 1–3.
- Produces: a Part Practice view selected whenever `scope` is 5, 6, or 7; Full Test still selects `ToeicReadingSessionView`.

- [ ] **Step 1: Write failing route and presentation tests**

Assert that the route selects practice for Part scopes and exam for Full Test, feedback renders only for a graded answer, the sticky footer contains Previous/drawer/Next, and the practice root has `min-w-0` with no mobile fixed widths.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading-practice-presentation.test.ts`  
Expected: FAIL because practice components do not exist.

- [ ] **Step 3: Implement Part 5 shell and question feedback**

Use `lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]`. Selecting an option calls the grade mutation immediately. While pending, options are disabled; on failure the pending option stays selected with Retry; on success all options become read-only and the correct/incorrect border, icon, answer, explanation, and available translation appear.

- [ ] **Step 4: Implement navigation and completion**

Persist active question and review markers through the PATCH hook. Bottom navigation is `sticky bottom-0`, includes content-safe padding, and opens an accessible drawer with correct/incorrect/unanswered/active/marked states. Complete becomes available when all Part questions are graded.

- [ ] **Step 5: Add synchronized English and Vietnamese copy**

Add the same keys to both message files for loading, grading, retry, correct, incorrect, explanation, translation, Previous, Next, Complete, retry incorrect, restart Part, and return to tests.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-reading-practice-presentation.test.ts app/features/toeic-reading/tests/toeic-reading-messages.test.ts
pnpm --filter @repo/web check-types
```

Expected: PASS.

```powershell
git add apps/web/app/features/toeic-reading apps/web/app/views/toeic-reading apps/web/app/[locale] apps/web/app/messages
git commit -m "feat(web): add TOEIC Reading Part practice"
```

---

### Task 5: Safe Part 6/7 stimulus rendering and responsive reuse

**Files:**

- Create: `apps/web/app/features/toeic-reading/toeic-stimulus-content.ts`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingPassagePane.tsx`
- Modify: `apps/web/app/features/toeic-reading/components/ToeicStimulus.tsx`
- Modify: `apps/web/app/features/toeic-reading/components/ToeicReadingWorkspace.tsx`
- Create: `apps/web/app/features/toeic-reading/tests/toeic-stimulus-content.test.ts`
- Modify: `apps/web/app/features/toeic-reading/tests/toeic-reading-practice-presentation.test.ts`

**Interfaces:**

- Produces: `parseToeicStimulusContent(source: string): ToeicStimulusBlock[]` with a strict, React-rendered allowlist and no `dangerouslySetInnerHTML`.

- [ ] **Step 1: Write failing safe-content tests**

Fixtures must cover literal `<div>`/`<p>` source, line breaks, emphasis, simple tables, safe images, scripts, inline handlers, `javascript:` URLs, and plain text. Assert scripts/handlers/unsafe URLs never appear in parsed blocks.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-stimulus-content.test.ts`  
Expected: FAIL because the parser does not exist.

- [ ] **Step 3: Implement strict structured parsing**

Tokenize only the imported source subset and map `p`, `br`, `strong`, `em`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, and safe `img` attributes into typed blocks. Unknown tags contribute text content only. Never evaluate inline styles or event attributes.

- [ ] **Step 4: Add Part 6/7 passage pane**

Use `lg:grid-cols-2`; make both desktop panes independently scrollable and keep the passage pane sticky within its column. Below `lg`, render one flow with an accessible expand/collapse button and no horizontal overflow. Reuse the question, feedback, drawer, and summary components from Part 5.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/toeic-stimulus-content.test.ts app/features/toeic-reading/tests/toeic-reading-practice-presentation.test.ts
pnpm --filter @repo/web check-types
```

Expected: PASS.

```powershell
git add apps/web/app/features/toeic-reading
git commit -m "feat(web): add TOEIC Reading passage practice"
```

---

### Task 6: Full Test regression, documentation, and release verification

**Files:**

- Modify: `apps/web/test/toeic-reading-presentation.test.ts`
- Modify: `apps/api/src/module/toeic-reading/tests/submit-toeic-reading-attempt.use-case.spec.ts`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/architecture/api.md`
- Modify: `docs/superpowers/plans/2026-08-02-toeic-reading-practice-mode.md`

**Interfaces:**

- Confirms Full Test remains deferred-grading and documents the released Part Practice behavior.

- [ ] **Step 1: Add explicit Full Test regression assertions**

Assert that `scope=full` still renders `ToeicReadingSessionView`, fetches/saves drafts, requires all answers before submission, and never calls practice-session grading.

- [ ] **Step 2: Run focused API and Web suites**

```powershell
pnpm --filter @repo/api test -- toeic-reading
pnpm --filter @repo/web exec tsx --test app/features/toeic-reading/tests/*.test.ts test/toeic-reading-presentation.test.ts
```

Expected: all TOEIC Reading tests pass.

- [ ] **Step 3: Update canonical architecture documents**

Document the route split, server-owned immediate grading, practice persistence, safe stimulus rendering, and the continued separation from Full Test drafts/attempts. Do not duplicate the detailed design spec.

- [ ] **Step 4: Run full verification gates sequentially**

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
git diff --check
```

Expected: every command exits 0. Existing lint warnings may be reported only if they remain warnings and are unrelated to this change.

- [ ] **Step 5: Mark this plan complete and commit**

Update every completed checkbox in this plan, then run:

```powershell
git add docs apps packages
git commit -m "docs: record TOEIC Reading practice delivery"
```
