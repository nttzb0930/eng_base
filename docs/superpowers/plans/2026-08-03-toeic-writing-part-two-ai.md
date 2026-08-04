# TOEIC Writing Part Two AI Grading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver quota-controlled Gemini grading for TOEIC Writing Part 2 email responses, with official 0–4 scoring, requirement evidence, actionable feedback, and an improved-email result UI.

**Architecture:** Reuse the Gemini provider, grade persistence, atomic quota reservation, cache identity, and assistance snapshot introduced by the Part 1 plan. Add Part 2-specific validation, provider schemas, orchestration, and UI components; keep provider output behind Zod validation and verify every quoted evidence range against the learner response before persistence.

**Tech Stack:** NestJS 11, Prisma/PostgreSQL, Zod 4, `@google/genai` 2.11, Next.js 16, React Query, next-intl, shadcn UI, Node test runner.

## Global Constraints

- Use the independently configured Gemini grading model; default to `gemini-3.5-flash-lite`.
- Require an authenticated account; login already guarantees verified email for learner accounts.
- Permit five successful unique AI grades per user per UTC day.
- Permit two grade requests per minute per user, ten per minute per IP, and one in-flight grade per user.
- Part 2 responses contain 50–300 words and at most 2,200 characters.
- Deterministic failures and provider failures consume no quota.
- Score Part 2 on the official 0–4 scale; provider-generated display labels follow the request locale while enum/status values remain locale-neutral.
- Frontend never supplies prompt, source email, requirements, rubric, score, or assistance state.
- Evidence ranges must resolve exactly to the submitted response; invalid ranges make the provider response invalid.
- Do not log learner text, raw prompts, provider responses, or provider credentials.
- Reuse the reviewed Writing AI and community migrations; this plan adds no new database migration.
- Use TDD and commit after every task.

---

### Task 1: Shared Part 2 contracts and deterministic validation

**Files:**

- Modify: `packages/shared/src/types/toeic-writing.ts`
- Modify: `packages/shared/test/toeic-writing-interface.test.ts`
- Modify: `apps/api/src/module/toeic-writing/validation/toeic-writing-text.utils.ts`
- Create: `apps/api/src/module/toeic-writing/validation/part-two-response.validator.ts`
- Test: `apps/api/src/module/toeic-writing/tests/part-two-response.validator.spec.ts`

**Interfaces:**

- Consumes: `countToeicWritingWords(text): number` from the Part 1 plan.
- Produces: `validatePartTwoResponse(responseText): ToeicWritingValidationResult`.
- Produces: `ToeicWritingPartTwoGradeRequest`, `ToeicWritingPartTwoGradeResult`, task-completion, sentence-variety, tone, grammar, paraphrase, and improved-email wire types.

- [ ] **Step 1: Write failing validator tests**

Cover 49 words, 50 words, 300 words, 301 words, 2,201 characters, blank input, repeated-token spam, keyboard-smash spam, and a valid multi-paragraph email.

```ts
test("accepts a fifty-word email", () => {
  const responseText = Array.from(
    { length: 50 },
    (_, index) => `word${index}`
  ).join(" ");
  assert.deepEqual(validatePartTwoResponse(responseText), {
    valid: true,
    issues: [],
    wordCount: 50,
  });
});

test("rejects repeated-token spam", () => {
  const result = validatePartTwoResponse(
    Array.from({ length: 50 }, () => "hello").join(" ")
  );
  assert.equal(result.valid, false);
  assert.equal(
    result.issues.some((issue) => issue.code === "OBVIOUS_SPAM"),
    true
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/part-two-response.validator.spec.ts`

Expected: FAIL because `part-two-response.validator.ts` and Part 2 grade contracts do not exist.

- [ ] **Step 3: Add stable shared contracts**

Add these request and evidence primitives, then define the result fields listed below as named exported types rather than anonymous nested objects:

```ts
export type ToeicWritingPartTwoGradeRequest = {
  contentVersion: string;
  responseText: string;
  idempotencyKey: string;
  locale: "en" | "vi";
};

export type ToeicWritingEvidenceRange = {
  start: number;
  end: number;
  text: string;
};

export type ToeicWritingPartTwoGradeResult = {
  id: number;
  taskId: number;
  score: 0 | 1 | 2 | 3 | 4;
  scoreLabel: string;
  taskCompletion: ToeicWritingTaskCompletionFeedback;
  sentenceVariety: ToeicWritingSentenceVarietyFeedback;
  tone: ToeicWritingToneFeedback;
  grammar: ToeicWritingGrammarFeedback;
  paraphrase: ToeicWritingParaphraseFeedback;
  overallFeedback: string;
  strengths: string[];
  improvements: string[];
  improvedEmail: ToeicWritingImprovedEmail;
  quota: ToeicWritingAiQuota;
  cached: boolean;
  assistance: ToeicWritingAssistanceSnapshot;
};
```

Use stable status unions:

```ts
export type ToeicWritingRequirementStatus = "MET" | "PARTIAL" | "MISSING";
export type ToeicWritingFeedbackStatus = "PASS" | "WARN" | "FAIL";
export type ToeicWritingGrammarSeverity = "SERIOUS" | "MINOR";

export type ToeicWritingRequirementFeedback = {
  requirementId: string;
  status: ToeicWritingRequirementStatus;
  comment: string;
  evidence: ToeicWritingEvidenceRange[];
  suggestedFix: string | null;
};

export type ToeicWritingTaskCompletionFeedback = {
  status: ToeicWritingFeedbackStatus;
  completedCount: number;
  totalCount: number;
  requirements: ToeicWritingRequirementFeedback[];
};

export type ToeicWritingSentenceVarietyFeedback = {
  status: ToeicWritingFeedbackStatus;
  detected: Array<{
    kind: "SIMPLE" | "COMPOUND" | "COMPLEX";
    evidence: ToeicWritingEvidenceRange;
  }>;
  feedback: string;
};

export type ToeicWritingToneFeedback = {
  status: ToeicWritingFeedbackStatus;
  feedback: string;
  suggestedOpening: string | null;
};

export type ToeicWritingGrammarError = {
  severity: ToeicWritingGrammarSeverity;
  evidence: ToeicWritingEvidenceRange;
  correction: string;
  explanation: string;
};

export type ToeicWritingGrammarFeedback = {
  status: ToeicWritingFeedbackStatus;
  errors: ToeicWritingGrammarError[];
  feedback: string;
};

export type ToeicWritingParaphraseFeedback = {
  status: ToeicWritingFeedbackStatus;
  copiedRanges: ToeicWritingEvidenceRange[];
  feedback: string;
};

export type ToeicWritingImprovedEmail = {
  text: string;
  wordCount: number;
  differences: string[];
  requirementCoverage: Array<{
    requirementId: string;
    evidence: ToeicWritingEvidenceRange[];
  }>;
};
```

Each requirement feedback contains the server-owned `requirementId`, status, localized comment, zero or more evidence ranges, and an optional localized suggested fix. Derive IDs as `requirement-${order}` from the existing stable requirement order; never accept requirement IDs from the browser. Grammar errors contain severity, evidence, correction, and explanation. The improved email contains `text`, `differences`, `wordCount`, and `requirementCoverage`, where each coverage item contains a server requirement ID plus evidence offsets into the improved email.

- [ ] **Step 4: Implement deterministic Part 2 validation**

Reuse the shared word counter and Unicode normalization helper. Reject only machine-checkable failures before AI: minimum/maximum words, maximum characters, blank input, repeated-token ratio above 0.55 when at least 20 words are present, and three or more keyboard-smash tokens matching `/^(.)\1{3,}$|^[asdfghjklqwertyuiopzxcvbnm]{12,}$/iu`. Do not attempt semantic requirement, tone, grammar, or paraphrase grading here.

- [ ] **Step 5: Run focused tests and shared type-check**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/part-two-response.validator.spec.ts
pnpm --filter @repo/shared test
pnpm --filter @repo/shared check-types
```

Expected: validator tests PASS and shared type-check exits 0.

- [ ] **Step 6: Commit**

```powershell
git add packages/shared/src/types/toeic-writing.ts apps/api/src/module/toeic-writing/validation apps/api/src/module/toeic-writing/tests/part-two-response.validator.spec.ts
git commit -m "feat(api): validate TOEIC Writing email responses"
```

---

### Task 2: Gemini Part 2 prompt and structured response contract

**Files:**

- Modify: `apps/api/src/module/toeic-writing/provider/writing-ai-provider.ts`
- Modify: `apps/api/src/module/toeic-writing/provider/gemini-writing.provider.ts`
- Modify: `apps/api/src/module/toeic-writing/provider/writing-ai.schemas.ts`
- Create: `apps/api/src/module/toeic-writing/provider/part-two-grading.prompt.ts`
- Modify: `apps/api/src/module/toeic-writing/tests/gemini-writing.provider.spec.ts`
- Create: `apps/api/src/module/toeic-writing/tests/part-two-grading.prompt.spec.ts`

**Interfaces:**

- Consumes: `WritingAiProvider` and Gemini configuration from Part 1.
- Produces: `WritingAiProvider.gradePartTwo(input): Promise<WritingPartTwoProviderResult>` and Zod-validated structured provider output.

- [ ] **Step 1: Write failing prompt tests**

Assert that the pure prompt builder includes the official 0–4 rubric, source email, stable requirement IDs/text, learner response, locale instruction, assistance disclosure, and strict evidence-offset rules. Assert it does not include user ID, email address, quota metadata, or provider credentials.

```ts
const prompt = buildPartTwoGradingPrompt({
  locale: "vi",
  sourceEmail: "From: Michael Brown\nSubject: Printer issue",
  requirements: [{ id: "requirement-1", text: "Give one cause" }],
  responseText: "Dear Mr. Brown, ...",
  assistance: {
    outlineViewed: true,
    vocabularyViewed: false,
    sampleViewed: false,
    communityAnswerRestored: false,
  },
});
assert.match(prompt, /requirement-1/);
assert.match(prompt, /0–4/);
assert.doesNotMatch(prompt, /GEMINI_API_KEY/);
```

- [ ] **Step 2: Run prompt tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/part-two-grading.prompt.spec.ts`

Expected: FAIL because the prompt builder does not exist.

- [ ] **Step 3: Define provider input and Zod schemas**

Extend the provider boundary exactly as follows:

```ts
export interface WritingAiProvider {
  enrichPicture(
    input: WritingPictureEnrichmentInput
  ): Promise<WritingPictureContext>;
  gradePartOne(
    input: WritingPartOneProviderInput
  ): Promise<WritingPartOneProviderResult>;
  gradePartTwo(input: {
    locale: "en" | "vi";
    sourceEmail: string;
    requirements: Array<{ id: string; textEn: string; textVi: string | null }>;
    responseText: string;
    assistance: ToeicWritingAssistanceSnapshot;
  }): Promise<WritingPartTwoProviderResult>;
}
```

The Zod schema must enforce score 0–4; all requirement IDs are strings; statuses are the stable enums from Task 1; arrays have explicit maximum lengths; evidence offsets are non-negative integers with `end > start`; improved email contains text plus requirement coverage; and no unknown keys are accepted.

- [ ] **Step 4: Implement the prompt builder**

Tell Gemini to grade semantic task completion, sentence variety, professional tone, grammar, and paraphrase. Require concise feedback in the requested locale, require English corrections/improved email, forbid invented facts, and require direct evidence ranges into the learner response. Include assistance only for the `independent`/`assisted` disclosure; do not lower the official score merely because help was opened.

- [ ] **Step 5: Write failing provider adapter tests**

Use a fake Gemini client. Cover the grading model selection, structured schema request, locale propagation, one schema-repair attempt, invalid score, unknown requirement ID, malformed evidence, and provider timeout.

- [ ] **Step 6: Implement `gradePartTwo`**

Call the configured grading model with low temperature and the existing timeout/abort boundary. Parse the first response with the Part 2 Zod schema; if it fails, perform the same single repair request used by Part 1. Throw `WritingAiInvalidResponseError` after the repair fails and do not log raw content.

- [ ] **Step 7: Run provider verification**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/part-two-grading.prompt.spec.ts src/module/toeic-writing/tests/gemini-writing.provider.spec.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/api/src/module/toeic-writing/provider apps/api/src/module/toeic-writing/tests
git commit -m "feat(api): add Gemini TOEIC email grading"
```

---

### Task 3: Part 2 result verification and grade orchestration

**Files:**

- Create: `apps/api/src/module/toeic-writing/grading/part-two-provider-result.validator.ts`
- Create: `apps/api/src/module/toeic-writing/grading/part-two-grade.mapper.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/grade-toeic-writing-part-two.use-case.ts`
- Modify: `apps/api/src/module/toeic-writing/dto/toeic-writing.dto.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.module.ts`
- Test: `apps/api/src/module/toeic-writing/tests/part-two-provider-result.validator.spec.ts`
- Test: `apps/api/src/module/toeic-writing/tests/toeic-writing-part-two-grade.use-case.spec.ts`
- Modify: `apps/api/src/module/toeic-writing/tests/toeic-writing.controller.spec.ts`

**Interfaces:**

- Consumes: `WritingAiProvider.gradePartTwo`, `WritingAiRepository`, assistance snapshots, and shared contracts from Tasks 1–2.
- Produces: `POST /toeic/writing/tasks/:taskId/grades/part-two` returning `ToeicWritingPartTwoGradeResult`.

- [ ] **Step 1: Write failing provider-result validator tests**

Cover exact evidence matches, Unicode offsets, out-of-range offsets, mismatched evidence text, duplicate/missing/unknown requirement IDs, an improved email below 50 words, an improved email above 300 words, missing improved-email requirement coverage, mismatched improved-email evidence, and a valid result.

```ts
test("rejects evidence that does not match the learner response", () => {
  assert.throws(
    () =>
      validatePartTwoProviderResult(providerResult, {
        responseText: "Dear Mr. Brown, thank you for contacting us.",
        requirementIds: ["requirement-1"],
      }),
    WritingAiInvalidResponseError
  );
});
```

- [ ] **Step 2: Implement provider-result verification**

For every learner evidence range, compare `Array.from(responseText).slice(start, end).join("")` with `text` so offsets are Unicode-code-point based. Require exactly one task-completion entry per server requirement. Validate grammar/paraphrase evidence the same way. Validate the improved email with Part 2 length rules, require exactly one coverage item per server requirement, and verify those offsets against `improvedEmail.text`. Reject any result that fails rather than partially persisting it.

- [ ] **Step 3: Write failing use-case tests**

Cover published Part 2 task, Part mismatch, stale content version, deterministic validation before cache/quota, owned cache hit without quota, cache isolation, one in-flight request, daily quota rejection, assistance snapshot inclusion, provider success, result verification, atomic grade/quota completion, provider failure release, invalid-result release, identical idempotent retry, and conflicting reuse of one idempotency key with changed text.

- [ ] **Step 4: Implement the use case in a fixed order**

```ts
async execute(
  userId: string,
  taskId: number,
  request: ToeicWritingPartTwoGradeRequest
) {
  const task = await this.tasks.getPublishedPartTwo(taskId);
  assertContentVersion(task, request.contentVersion);
  const validation = validatePartTwoResponse(request.responseText);
  if (!validation.valid) throw writingValidationError(validation);

  const cacheKey = createGradeCacheKey(userId, task, request.responseText, "part-two-v1");
  const cached = await this.aiRepository.findOwnedCachedGrade(cacheKey);
  if (cached) return mapPartTwoGrade(cached, true);

  const reservation = await this.aiRepository.reserveQuota(
    createWritingQuotaReservation({ userId, idempotencyKey: request.idempotencyKey })
  );
  try {
    const assistance = await this.aiRepository.getAssistanceSnapshot({
      userId,
      taskId,
      contentVersion: task.contentVersion,
    });
    const providerResult = await this.provider.gradePartTwo(
      createPartTwoProviderInput(task, request, assistance)
    );
    const verified = validatePartTwoProviderResult(providerResult, {
      responseText: request.responseText,
      requirementIds: task.requirements.map((item) => item.id),
    });
    const saved = await this.aiRepository.saveGradeAndCompleteQuota(
      createSavedPartTwoGrade(reservation, task, request, assistance, verified)
    );
    return mapPartTwoGrade(saved, false);
  } catch (error) {
    await this.aiRepository.releaseQuota(reservation.id);
    throw error;
  }
}
```

- [ ] **Step 5: Add DTO and controller route**

Create `ToeicWritingPartTwoGradeDto` with the same SHA-256, UUID, locale, and string validation as Part 1. Add `@Post("tasks/:taskId/grades/part-two")`, apply the existing `WritingAiRateLimit` policy, and pass only authenticated user ID, parsed task ID, and validated body to the use case.

- [ ] **Step 6: Register dependencies and update controller tests**

Register `GradeToeicWritingPartTwoUseCase` with the existing task repository, `WRITING_AI_PROVIDER`, and `WritingAiRepository`. Controller tests assert exact delegation and that request-supplied prompt, rubric, requirements, score, source email, or assistance fields are stripped/rejected by validation.

- [ ] **Step 7: Run focused API verification**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/part-two-provider-result.validator.spec.ts src/module/toeic-writing/tests/toeic-writing-part-two-grade.use-case.spec.ts src/module/toeic-writing/tests/toeic-writing.controller.spec.ts
pnpm --filter @repo/api architecture:check
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/api/src/module/toeic-writing
git commit -m "feat(api): grade TOEIC Writing email responses"
```

---

### Task 4: Part 2 grading client, state, and result UI

**Files:**

- Modify: `apps/web/app/features/toeic-writing/api/toeic-writing.api.ts`
- Modify: `apps/web/app/features/toeic-writing/hooks/use-toeic-writing.ts`
- Modify: `apps/web/app/features/toeic-writing/components/ToeicWritingPartTwoWorkspace.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingPartTwoResult.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingTaskCompletionPanel.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingSentenceVarietyPanel.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingGrammarPanel.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingImprovedEmail.tsx`
- Modify: `apps/web/app/views/toeic-writing/ToeicWritingSessionView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/app/features/toeic-writing/tests/toeic-writing.api.test.ts`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-part-two-grade-ui.test.ts`

**Interfaces:**

- Consumes: `POST /toeic/writing/tasks/:taskId/grades/part-two` and coaching assistance state.
- Produces: grade mutation, deterministic validation display, owned grade history, and responsive 0–4 result UI.

- [ ] **Step 1: Write failing API and UI behavior tests**

Assert exact request route/body, UUID reuse during retries, validation blocks network calls, one pending mutation, newest-first owned history, score 0–4 rendering, task requirement evidence, sentence variety examples, tone, serious/minor grammar errors, paraphrase evidence, strengths/improvements, improved email, quota, cached state, assisted label, and rewrite preserving the prior response until confirmation.

- [ ] **Step 2: Run focused web tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing.api.test.ts app/features/toeic-writing/tests/toeic-writing-part-two-grade-ui.test.ts`

Expected: FAIL because the Part 2 grade method, hook, and result components do not exist.

- [ ] **Step 3: Add API method and React Query hook**

```ts
gradePartTwo(
  taskId: number,
  body: ToeicWritingPartTwoGradeRequest
): Promise<ToeicWritingPartTwoGradeResult>;
```

Expose `useGradeToeicWritingPartTwo()` and reuse the owner-scoped `useToeicWritingGradeHistory(taskId)` query introduced by the Part 1 plan. The mutation invalidates the owned grade-history and AI-quota keys, does not invalidate authored coaching panels, and does not delete the draft. Generate one idempotency UUID per response snapshot and reuse it only while task/contentVersion/responseText are unchanged.

- [ ] **Step 4: Add client-side deterministic validation state**

Mirror the server's word/character/spam rules for immediate feedback, but always treat the server as authoritative. Disable grade below 50 words, above 300 words, or above 2,200 characters. Render localized issue messages in an `Alert`; do not show semantic warnings before AI grading.

- [ ] **Step 5: Implement the result components**

Render a score card with `score/4`, localized score label, AI/cached marker, independent/assisted badge, and rewrite button. Below it render shadcn `Accordion` sections with `rounded-md` for:

```text
Task completion -> each requirement, status, comment, quoted learner evidence, suggested fix
Sentence variety -> detected simple/compound/complex examples and feedback
Tone -> status, feedback, suggested opening
Grammar -> serious/minor errors, learner excerpt, correction, explanation
Paraphrase -> copied ranges and feedback
Overall -> localized feedback, strengths, improvements
Improved email -> English email and change explanations
```

Use server-returned evidence text directly; never derive raw HTML. Render all user/provider text as React text nodes.

- [ ] **Step 6: Integrate grading into the Part 2 workspace**

Keep authored coaching panels usable before grading. While grading, lock only the grading action and display pending state. After success, preserve editor text in state, scroll the result heading into view, and keep sticky task navigation. “Rewrite” returns to the editor with the previous response intact; replacing it with the improved email requires a separate confirmation action and records `SAMPLE`-equivalent assistance before the next grade.

- [ ] **Step 7: Add complete English and Vietnamese messages**

Mirror all keys under `toeicWriting.partTwoGrading`: validation, pending/error/quota/cache, score labels 0–4, independent/assisted, section headings, statuses, evidence labels, rewrite, improved-email replacement confirmation, and provider-unavailable errors.

- [ ] **Step 8: Run full web verification**

Run:

```powershell
pnpm --filter @repo/web test
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Expected: all commands exit 0; no new console warning, hydration warning, or missing-message error is introduced.

- [ ] **Step 9: Commit**

```powershell
git add apps/web/app/features/toeic-writing apps/web/app/views/toeic-writing apps/web/app/messages
git commit -m "feat(web): add TOEIC Writing email AI feedback"
```

---

### Task 5: Part 2 smoke coverage, rubric QA, and operations update

**Files:**

- Create: `apps/api/scripts/toeic-writing-ai/smoke-part-two-grading.ts`
- Create: `apps/api/scripts/toeic-writing-ai/smoke-part-two-grading.test.ts`
- Create: `apps/api/src/module/toeic-writing/tests/fixtures/part-two-rubric-cases.ts`
- Create: `apps/api/src/module/toeic-writing/tests/part-two-rubric-contract.spec.ts`
- Modify: `apps/api/package.json`
- Modify: `docs/runbooks/toeic-writing-ai.md`
- Modify: `CONTEXT.md`
- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`

**Interfaces:**

- Produces: deterministic rubric fixtures, an opt-in real-provider smoke command, and rollout/rollback instructions for Part 2.

- [ ] **Step 1: Write failing rubric contract tests**

Create five redacted fixture responses representing scores 0, 1, 2, 3, and 4. Assert provider output passes the schema and post-validator, includes every requirement once, and stays within the expected score band for each fixture when using a fake captured provider result. Add one adversarial prompt-injection response and assert learner text remains data rather than instruction in the constructed prompt.

- [ ] **Step 2: Write a failing smoke-runner test**

Assert the command requires explicit `--task-id`, defaults to configuration/prompt/schema checks without calling Gemini, requires `--call-provider` for a real call, and never prints learner response, prompt, API key, or provider response.

- [ ] **Step 3: Implement smoke runner and package script**

Add:

```json
{
  "ai:smoke-toeic-writing-part2": "dotenv -e ../../.env -- tsx ./scripts/toeic-writing-ai/smoke-part-two-grading.ts"
}
```

The dry run resolves the task, checks Part 2/content version/requirements, builds the prompt, and validates a fixture result. A real call uses `GEMINI_ENABLED=true --call-provider --task-id=49` (replace `49` with an owned published Part 2 task ID) and prints only task ID, model, latency, score, schema status, and quota charged yes/no.

- [ ] **Step 4: Update the runbook**

Document Part 2 environment reuse, endpoint, 50–300 word validation, official 0–4 scale, assistance disclosure, cache/quota behavior, smoke command, monitored error codes, rubric fixture review, and rollback using `GEMINI_ENABLED=false` without removing learner drafts/submissions. Update `CONTEXT.md` to define AI grades separately from immutable submissions, `docs/architecture/api.md` with Part 2 orchestration/evidence verification, and `docs/architecture/frontend.md` with the 0–4 result workflow and owned history.

- [ ] **Step 5: Run complete repository verification**

Run:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
pnpm exec prettier --check README.md AGENTS.md CONTEXT.md "docs/**/*.md" ".github/workflows/*.yml"
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add CONTEXT.md apps/api/package.json apps/api/scripts/toeic-writing-ai apps/api/src/module/toeic-writing/tests docs/architecture docs/runbooks/toeic-writing-ai.md
git commit -m "test: verify TOEIC Writing email AI grading"
```
