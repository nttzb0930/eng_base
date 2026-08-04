# TOEIC Writing Part One AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver quota-controlled Gemini grading for TOEIC Writing Part 1, including deterministic validation, versioned picture enrichment, persisted results, and the learner result UI.

**Architecture:** Extend the existing `toeic-writing` capability with focused validators, provider/repository interfaces, Prisma adapters, and use cases. The browser sends only owned task/version/text/idempotency data; the API resolves rubric, keywords, image context, quota, cache, and Gemini structured output.

**Tech Stack:** NestJS 11, Prisma/PostgreSQL, Zod 4, `@google/genai` 2.11, Next.js 16, React Query, next-intl, shadcn UI, Node test runner.

## Global Constraints

- Use `gemini-3.5-flash-lite` through independently configurable vision and grading model variables.
- Keep grading synchronous; add no Redis queue or worker. The per-minute delivery guard is process-local and must be replaced by shared throttler storage before scaling API replicas.
- Require an authenticated account; login already guarantees verified email for learner accounts.
- Permit five successful unique AI grades per user per UTC day.
- Permit two grade requests per minute per user, ten per minute per IP, and one in-flight grade per user.
- Part 1 responses contain 3–40 words, at most 300 characters, exactly one sentence, and both required keyword forms.
- Part 2 response constants are 50–300 words and at most 2,200 characters so the shared editor contract is correct before Part 2 work begins.
- Deterministic failures and provider failures consume no quota.
- Frontend never supplies prompt, rubric, required words, image, image context, or score.
- Do not log learner text, raw prompts, provider responses, or provider credentials.
- Author and test migration SQL, but do not apply it to the learner's database without the explicit migration checkpoint in the operations runbook.
- Use TDD and commit after every task.

---

### Task 1: Shared Part 1 contracts and validation

**Files:**

- Modify: `packages/shared/src/types/toeic-writing.ts`
- Modify: `packages/shared/test/toeic-writing-interface.test.ts`
- Create: `apps/api/src/module/toeic-writing/validation/toeic-writing-text.utils.ts`
- Create: `apps/api/src/module/toeic-writing/validation/part-one-response.validator.ts`
- Test: `apps/api/src/module/toeic-writing/tests/part-one-response.validator.spec.ts`

**Interfaces:**

- Produces: `countToeicWritingWords(text): number` and `validatePartOneResponse(input): ToeicWritingValidationResult`.
- Produces: `ToeicWritingPartOneGradeRequest`, `ToeicWritingPartOneGradeResult`, `ToeicWritingValidationIssue`, and quota metadata types.

- [ ] **Step 1: Write failing validator tests**

Cover valid input, fewer than three words, more than forty words, more than 300 characters, lowercase start, missing terminal punctuation, multiple sentences, missing keywords, accepted `prepare -> preparing`, and obvious repeated-token spam.

```ts
test("accepts inflected required words", () => {
  const result = validatePartOneResponse({
    responseText: "The woman is preparing food.",
    requiredWords: ["prepare", "food"],
  });
  assert.deepEqual(result, { valid: true, issues: [], wordCount: 5 });
});

test("rejects a second sentence", () => {
  const result = validatePartOneResponse({
    responseText: "The woman prepares food. She is in a kitchen.",
    requiredWords: ["prepare", "food"],
  });
  assert.equal(result.valid, false);
  assert.equal(
    result.issues.some((issue) => issue.code === "ONE_SENTENCE_REQUIRED"),
    true
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/part-one-response.validator.spec.ts`

Expected: FAIL because the validator modules do not exist.

- [ ] **Step 3: Add shared contracts**

Define stable wire types without provider-specific fields:

```ts
export type ToeicWritingValidationIssueCode =
  | "MIN_WORDS"
  | "MAX_WORDS"
  | "MAX_CHARACTERS"
  | "UPPERCASE_START_REQUIRED"
  | "TERMINAL_PUNCTUATION_REQUIRED"
  | "ONE_SENTENCE_REQUIRED"
  | "REQUIRED_WORD_MISSING"
  | "OBVIOUS_SPAM";

export type ToeicWritingPartOneGradeRequest = {
  contentVersion: string;
  responseText: string;
  idempotencyKey: string;
  locale: "en" | "vi";
};

export type ToeicWritingAssistanceSnapshot = {
  outlineViewed: boolean;
  vocabularyViewed: boolean;
  sampleViewed: boolean;
  communityAnswerRestored: boolean;
};

export type ToeicWritingAiQuota = {
  dailyLimit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

export type ToeicWritingGradeCheck = {
  status: "PASS" | "WARN" | "FAIL";
  label: string;
  feedback: string;
};

export type ToeicWritingPartOneSuggestion = {
  correctedSentence: string;
  annotated: Array<{
    text: string;
    status: "KEPT" | "CORRECTED" | "ADDED" | "REMOVED";
  }>;
  alternativeSentence: string;
  explanation: string;
};

export type ToeicWritingPartOneGradeResult = {
  id: number;
  taskId: number;
  score: 0 | 1 | 2 | 3;
  scoreLabel: string;
  checks: {
    grammar: ToeicWritingGradeCheck;
    keywords: ToeicWritingGradeCheck;
    relevance: ToeicWritingGradeCheck;
  };
  overallFeedback: string;
  suggestion: ToeicWritingPartOneSuggestion;
  quota: ToeicWritingAiQuota;
  cached: boolean;
  assistance: ToeicWritingAssistanceSnapshot;
};

export type ToeicWritingGradeHistoryItem = {
  id: number;
  taskId: number;
  part: 1 | 2;
  score: number;
  maxScore: 3 | 4;
  scoreLabel: string;
  cached: boolean;
  assistance: ToeicWritingAssistanceSnapshot;
  createdAt: string;
};

export type ToeicWritingGradeHistoryPage = {
  items: ToeicWritingGradeHistoryItem[];
  nextCursor: number | null;
};
```

Replace the current loose character limits with `TOEIC_WRITING_RESPONSE_LIMITS = { 1: 300, 2: 2_200 }` and add `TOEIC_WRITING_WORD_LIMITS = { 1: { min: 3, max: 40 }, 2: { min: 50, max: 300 } }`. Add shared tests proving both constants and Unicode-aware character counting.

- [ ] **Step 4: Implement the pure validator**

Keep original text for display, use Unicode NFKC only for checks, count words with `/\s+/u`, and use a focused English-inflection candidate generator. Return stable issue codes plus keyword metadata; never throw for learner mistakes.

- [ ] **Step 5: Run tests and shared type-check**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/part-one-response.validator.spec.ts
pnpm --filter @repo/shared test
pnpm --filter @repo/shared check-types
```

Expected: validator tests PASS and shared type-check exits 0.

- [ ] **Step 6: Commit**

```powershell
git add packages/shared/src/types/toeic-writing.ts apps/api/src/module/toeic-writing/validation
git commit -m "feat(api): validate TOEIC Writing picture responses"
```

---

### Task 2: Gemini configuration and provider adapter

**Files:**

- Create: `apps/api/src/config/gemini.config.ts`
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/src/config/index.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/module/toeic-writing/provider/writing-ai-provider.ts`
- Create: `apps/api/src/module/toeic-writing/provider/gemini-writing.provider.ts`
- Create: `apps/api/src/module/toeic-writing/provider/writing-ai.schemas.ts`
- Test: `apps/api/src/config/gemini.config.test.ts`
- Test: `apps/api/src/module/toeic-writing/tests/gemini-writing.provider.spec.ts`

**Interfaces:**

- Consumes: Part 1 shared result types from Task 1.
- Produces: `WRITING_AI_PROVIDER` injection token and `WritingAiProvider.enrichPicture` / `gradePartOne`.

- [ ] **Step 1: Write failing configuration tests**

Assert default model names, timeout 20,000 ms, limit 5, optional disabled configuration without a key, and rejection when AI is enabled without `GEMINI_API_KEY`.

- [ ] **Step 2: Run config tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/config/gemini.config.test.ts`

Expected: FAIL because `gemini.config.ts` does not exist.

- [ ] **Step 3: Add validated configuration**

Expose this shape from `registerAs("gemini", ...)`:

```ts
export type GeminiConfiguration = {
  enabled: boolean;
  apiKey: string;
  visionModel: string;
  gradingModel: string;
  timeoutMs: number;
  dailyLimit: number;
  reservationTtlMs: number;
};
```

Add `GEMINI_ENABLED`, `GEMINI_API_KEY`, both model fields, timeout, daily limit, and `WRITING_AI_RESERVATION_TTL_MS` (default 120,000) to the Zod environment schema. Load `geminiConfig` from `AppModule`. Per-minute request limits belong to HTTP delivery in Task 5, not provider configuration.

- [ ] **Step 4: Write failing provider contract tests**

Use a fake Gemini client. Assert inline image bytes and MIME type are sent by `enrichPicture`, structured JSON is parsed by Zod, locale is passed to grading instructions, and invalid JSON produces `WritingAiInvalidResponseError` without logging response content.

- [ ] **Step 5: Run provider tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/gemini-writing.provider.spec.ts`

Expected: FAIL because the provider does not exist.

- [ ] **Step 6: Implement provider boundary and schemas**

```ts
export interface WritingAiProvider {
  enrichPicture(input: {
    imageBytes: Uint8Array;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    requiredWords: string[];
  }): Promise<WritingPictureContext>;

  gradePartOne(input: {
    locale: "en" | "vi";
    responseText: string;
    requiredWords: string[];
    picture:
      | { source: "ENRICHED"; context: WritingPictureContext }
      | {
          source: "DIRECT_IMAGE";
          imageBytes: Uint8Array;
          mimeType: "image/jpeg" | "image/png" | "image/webp";
        };
  }): Promise<WritingPartOneProviderResult>;
}
```

Use `@google/genai`, structured output JSON schema, low temperature, configured timeout with `AbortController`, and one schema-repair request. For `ENRICHED`, serialize the stored scene context into the prompt; for `DIRECT_IMAGE`, attach owned image bytes and MIME type without accepting a browser URL. Keep prompt builders as pure private functions and export schemas only for contract tests.

Define the provider-neutral enrichment shape in `writing-ai-provider.ts`:

```ts
export type WritingPictureContext = {
  schemaVersion: 1;
  sceneSummary: string;
  visibleEntities: string[];
  visibleActions: string[];
  relationships: string[];
  requiredWordGrounding: Array<{
    word: string;
    supported: boolean;
    evidence: string;
  }>;
};
```

- [ ] **Step 7: Run provider/config tests and API type-check**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/config/gemini.config.test.ts src/module/toeic-writing/tests/gemini-writing.provider.spec.ts
pnpm --filter @repo/api check-types
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/api/src/config apps/api/src/app.module.ts apps/api/src/module/toeic-writing/provider
git commit -m "feat(api): add Gemini Writing provider"
```

---

### Task 3: Persist image contexts, grades, quota, and assistance

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260803140000_add_toeic_writing_ai/migration.sql`
- Create: `apps/api/src/module/toeic-writing/repository/writing-ai.repository.ts`
- Create: `apps/api/src/module/toeic-writing/repository/prisma-writing-ai.repository.ts`
- Create: `apps/api/src/module/toeic-writing/tests/support/in-memory-writing-ai.repository.ts`
- Test: `apps/api/src/module/toeic-writing/tests/writing-ai-repository.spec.ts`
- Test: `apps/api/src/module/toeic-writing/tests/writing-ai-quota.integration.spec.ts`
- Test: `apps/api/src/module/toeic-writing/tests/toeic-writing-ai-migration.spec.ts`

**Interfaces:**

- Produces: atomic quota reservation, completion/release, owned cache, image-context lookup, grade persistence, and assistance recording.

- [ ] **Step 1: Write failing migration/source tests**

Assert tables, foreign keys, unique cache identity, quota non-negative checks, owner indexes, and cascade/restrict behavior are present in schema and SQL.

- [ ] **Step 2: Run migration test and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-ai-migration.spec.ts`

Expected: FAIL because the migration is absent.

- [ ] **Step 3: Add Prisma models and migration**

Add models corresponding to:

```text
toeic_writing_image_contexts
toeic_writing_ai_grades
toeic_writing_assistance_events
ai_usage_daily
ai_usage_reservations
```

Use unique keys:

```text
(task_id, image_sha256, prompt_version)
(user_id, task_id, content_version, response_hash, prompt_version)
(user_id, idempotency_key)
(user_id, feature, usage_date)
```

Store grade feedback and image context as JSON, model/prompt/rubric versions as bounded strings, and quota `reserved`/`used` as integers with database checks. `ai_usage_reservations` stores `RESERVED | COMPLETED | RELEASED` status and timestamps. Add a partial unique index allowing only one `RESERVED` Writing request per user and an index on `(user_id, feature, created_at)`. `reserveQuota` releases reservations older than `reservationTtlMs` in the same transaction before enforcing daily and single-in-flight limits. IP and per-minute rate limits never enter this business table.

- [ ] **Step 4: Write failing repository tests**

Use the in-memory adapter for behavior tests and mocked Prisma transactions for adapter tests. Cover reservation below limit, rejection at limit, completion, release, stale release, owned cache hit, cross-owner miss, conflicting reuse of one idempotency key with a different response hash, identical idempotent retry, and idempotent assistance events. This in-memory adapter is the second concrete adapter that justifies the repository seam under the architecture rules.

- [ ] **Step 5: Implement repository interface and Prisma adapter**

```ts
export interface WritingAiRepository {
  reserveQuota(
    input: WritingQuotaReservationInput
  ): Promise<WritingQuotaReservation>;
  releaseQuota(reservationId: string): Promise<void>;
  findOwnedCachedGrade(
    input: WritingGradeCacheKey
  ): Promise<WritingAiGradeRecord | null>;
  saveGradeAndCompleteQuota(
    input: SaveWritingAiGradeInput
  ): Promise<WritingAiGradeRecord>;
  findPictureContext(
    input: PictureContextKey
  ): Promise<WritingPictureContextRecord | null>;
  recordAssistance(input: RecordWritingAssistanceInput): Promise<void>;
  getAssistanceSnapshot(
    input: WritingAssistanceKey
  ): Promise<ToeicWritingAssistanceSnapshot>;
}
```

Define the adjacent repository inputs without Prisma types:

```ts
export type WritingGradeCacheKey = {
  userId: string;
  taskId: number;
  contentVersion: string;
  responseHash: string;
  promptVersion: string;
};

export type WritingQuotaReservationInput = {
  userId: string;
  feature: "TOEIC_WRITING";
  idempotencyKey: string;
  dailyLimit: number;
  reservationTtlMs: number;
};

export type WritingQuotaReservation = {
  id: string;
  userId: string;
  usageDate: string;
};

export type SaveWritingAiGradeInput = WritingGradeCacheKey & {
  reservationId: string;
  part: 1 | 2;
  locale: "en" | "vi";
  model: string;
  rubricVersion: string;
  assistance: ToeicWritingAssistanceSnapshot;
  result: Record<string, unknown>;
  contextSource: "ENRICHED" | "DIRECT_IMAGE" | null;
};

export type WritingAiGradeRecord = SaveWritingAiGradeInput & {
  id: number;
  createdAt: Date;
};

export type PictureContextKey = {
  taskId: number;
  imageSha256: string;
  promptVersion: string;
};

export type WritingPictureContextRecord = PictureContextKey & {
  model: string;
  context: WritingPictureContext;
};

export type WritingAssistanceKey = {
  userId: string;
  taskId: number;
  contentVersion: string;
};

export type RecordWritingAssistanceInput = WritingAssistanceKey & {
  kind: "OUTLINE" | "VOCABULARY" | "SAMPLE" | "COMMUNITY_RESTORE";
};
```

Use database transactions and conditional SQL for quota; do not implement quota by read-then-write in application memory. `reserveQuota` atomically enforces the daily limit and single-in-flight rule. `saveGradeAndCompleteQuota` inserts the grade, changes the reservation to `COMPLETED`, decrements `reserved`, and increments `used` in one transaction. Add database-backed integration cases that complete five unique grades then reject the sixth daily use and race ten reservations for one user while permitting exactly one in flight. Assert counters never become negative or exceed their limits. Skip only when `TEST_DATABASE_URL` is absent and run it in CI with that variable configured.

- [ ] **Step 6: Generate Prisma client and run tests**

Run:

```powershell
pnpm --filter @repo/api exec prisma generate
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-ai-migration.spec.ts src/module/toeic-writing/tests/writing-ai-repository.spec.ts
$env:DATABASE_URL=$env:TEST_DATABASE_URL; pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/writing-ai-quota.integration.spec.ts
pnpm --filter @repo/api check-types
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/api/prisma apps/api/src/module/toeic-writing/repository apps/api/src/module/toeic-writing/tests
git commit -m "feat(api): persist TOEIC Writing AI usage"
```

---

### Task 4: Idempotent Part 1 image enrichment pipeline

**Files:**

- Create: `apps/api/scripts/toeic-writing-ai/enrich-part-one-images.ts`
- Create: `apps/api/scripts/toeic-writing-ai/import-part-one-contexts.ts`
- Create: `apps/api/scripts/toeic-writing-ai/toeic-writing-ai.storage.ts`
- Create: `apps/api/scripts/toeic-writing-ai/toeic-writing-ai.validation.ts`
- Test: `apps/api/scripts/toeic-writing-ai/toeic-writing-ai.enrichment.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- Consumes: licensed Part 1 packages and `WritingAiProvider.enrichPicture`.
- Produces: immutable candidate JSON and imported image-context rows.

- [ ] **Step 1: Write failing pipeline tests**

Fixtures must prove image SHA/prompt-version cache reuse, one provider call per new image, invalid context rejection, resumability, and no database requirement during candidate generation.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test scripts/toeic-writing-ai/toeic-writing-ai.enrichment.test.ts`

Expected: FAIL because scripts do not exist.

- [ ] **Step 3: Implement candidate storage and validation**

Use this immutable identity:

```ts
type PictureContextCandidate = {
  schemaVersion: 1;
  taskId: number;
  contentVersion: string;
  imageSha256: string;
  model: string;
  promptVersion: "toeic-writing-image-context-v1";
  context: WritingPictureContext;
};
```

Write candidates below the existing licensed-content root without committing media or generated candidates to Git.

- [ ] **Step 4: Implement CLI commands and package scripts**

Add:

```json
{
  "data:enrich-toeic-writing-part1": "dotenv -e ../../.env -- tsx ./scripts/toeic-writing-ai/enrich-part-one-images.ts",
  "data:import-toeic-writing-part1-contexts": "dotenv -e ../../.env -- tsx ./scripts/toeic-writing-ai/import-part-one-contexts.ts"
}
```

Support `--workers=1..8`, default 2, explicit `--prompt-version`, progress output, resume, and a final completed/skipped/rejected/failed summary.

- [ ] **Step 5: Run tests, lint, and a dry run without Gemini**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/toeic-writing-ai/toeic-writing-ai.enrichment.test.ts
pnpm --filter @repo/api lint
pnpm --filter @repo/api data:enrich-toeic-writing-part1 -- --dry-run
```

Expected: tests/lint PASS; dry run reports 48 eligible Part 1 tasks without provider calls.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/scripts/toeic-writing-ai apps/api/package.json
git commit -m "feat(data): enrich TOEIC Writing pictures"
```

---

### Task 5: Part 1 grade use case and HTTP API

**Files:**

- Modify: `apps/api/src/module/toeic-writing/dto/toeic-writing.dto.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.module.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/grade-toeic-writing-part-one.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-grade.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/list-toeic-writing-grades.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-quota.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/record-toeic-writing-assistance.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/observability/writing-ai-observability.service.ts`
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/src/config/rate-limit.config.ts`
- Create: `apps/api/src/common/decorators/writing-ai-rate-limit.decorator.ts`
- Create: `apps/api/src/common/guards/writing-ai-rate-limit.guard.ts`
- Create: `apps/api/src/common/rate-limit/writing-ai-rate-limit.test.ts`
- Test: `apps/api/src/module/toeic-writing/tests/toeic-writing-part-one-grade.use-case.spec.ts`
- Test: `apps/api/src/module/toeic-writing/tests/writing-ai-observability.service.spec.ts`
- Modify: `apps/api/src/module/toeic-writing/tests/toeic-writing.controller.spec.ts`

**Interfaces:**

- Produces: `POST /toeic/writing/tasks/:taskId/grades/part-one`, `GET /toeic/writing/grades/:gradeId`, `GET /toeic/writing/tasks/:taskId/grades?cursor=120&limit=20`, `GET /toeic/writing/ai-quota`, and `POST /toeic/writing/tasks/:taskId/assistance/:kind`.

- [ ] **Step 1: Write failing use-case tests**

Cover ownership/published task, Part mismatch, stale content version, validation before quota, cache before reservation, quota reservation, context fallback, provider success, invalid provider output, release on failure, score/suggestion post-validation, and assistance snapshot.

- [ ] **Step 2: Run use-case tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-part-one-grade.use-case.spec.ts`

Expected: FAIL because the use case is absent.

- [ ] **Step 3: Implement orchestration**

The use case order is fixed:

```ts
async execute(userId: string, taskId: number, request: ToeicWritingPartOneGradeRequest) {
  const task = await this.tasks.getPublishedPartOne(taskId);
  assertContentVersion(task, request.contentVersion);
  const validation = validatePartOneResponse({
    responseText: request.responseText,
    requiredWords: task.requiredWords.map((word) => word.en),
  });
  if (!validation.valid) throw writingValidationError(validation);
  const cacheKey = createGradeCacheKey(userId, task, request.responseText);
  const cached = await this.aiRepository.findOwnedCachedGrade(cacheKey);
  if (cached) return mapPartOneGrade(cached, true);
  const reservation = await this.aiRepository.reserveQuota(
    createReservation({ userId, idempotencyKey: request.idempotencyKey })
  );
  try {
    const picture = await this.contexts.resolveOrLoadOwnedImage(task);
    const result = await this.provider.gradePartOne(createProviderInput(task, request, picture));
    const checked = validatePartOneProviderResult(result, task);
    const saved = await this.aiRepository.saveGradeAndCompleteQuota(
      createSavedGrade(reservation, checked, picture.source)
    );
    return mapPartOneGrade(saved, false);
  } catch (error) {
    await this.aiRepository.releaseQuota(reservation.id);
    throw error;
  }
}
```

- [ ] **Step 4: Add Writing AI delivery rate limiting**

Extend `rateLimitConfig` and `env.validation.ts` with `WRITING_AI_USER_LIMIT=2`, `WRITING_AI_IP_LIMIT=10`, and `WRITING_AI_RATE_LIMIT_TTL=60`. Add a `WritingAiRateLimit` method decorator and `WritingAiRateLimitGuard` under `common`; the guard runs after `UserJwtGuard`, tracks authenticated `userId` and trusted `request.ip` separately in the existing process-local Throttler storage, and throws the existing `RateLimitExceededException` with `Retry-After`. Tests issue three requests for one user and eleven distinct users behind one IP, asserting the third and eleventh requests return the stable 429 contract. The use case receives no IP or Express request object.

- [ ] **Step 5: Add DTOs and controller routes**

Use UUID validation for idempotency, SHA-256 format for content version, and `@IsIn(["en", "vi"])`. Apply `WritingAiRateLimit` only to grade endpoints. Map stable errors for validation, daily quota, rate limit, provider timeout, stale content, and unavailable context. Grade history is owner-scoped, ordered newest first, limited to 20 rows, and returns no raw provider payload.

- [ ] **Step 6: Add aggregate-safe observability**

Implement `WritingAiObservabilityService.record(event)` with fixed event names and numeric/string dimensions only: part, model, prompt version, context source, latency bucket, outcome, schema-repair used, cache hit, and quota charged. Unit tests must reject or redact keys named `responseText`, `prompt`, `providerResponse`, `apiKey`, or `email` before delegating to `ApplicationLogger`.

- [ ] **Step 7: Write/update controller tests**

Assert the controller passes only authenticated user ID, parsed task ID, and validated body to use cases. Assert grade routes declare the Writing AI rate-limit policy and do not accept task metadata or prompt fields.

- [ ] **Step 8: Run focused API verification**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/common/rate-limit/writing-ai-rate-limit.test.ts src/module/toeic-writing/tests/toeic-writing-part-one-grade.use-case.spec.ts src/module/toeic-writing/tests/writing-ai-observability.service.spec.ts src/module/toeic-writing/tests/toeic-writing.controller.spec.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add apps/api/src/common apps/api/src/config apps/api/src/module/toeic-writing
git commit -m "feat(api): grade TOEIC Writing picture responses"
```

---

### Task 6: Part 1 grading workspace and results

**Files:**

- Modify: `apps/web/app/features/toeic-writing/api/toeic-writing.api.ts`
- Modify: `apps/web/app/features/toeic-writing/hooks/use-toeic-writing.ts`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingPartOneValidation.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingPartOneResult.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingAssistancePanel.tsx`
- Modify: `apps/web/app/features/toeic-writing/components/ToeicWritingEditorPane.tsx`
- Modify: `apps/web/app/views/toeic-writing/ToeicWritingSessionView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Test: `apps/web/app/features/toeic-writing/tests/toeic-writing.api.test.ts`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-part-one-ui.test.ts`

**Interfaces:**

- Consumes: Part 1 grade/quota/assistance API from Task 5.
- Produces: responsive Picture editor with validation, sample tracking, grade display, owned grade history, cache handling, and rewrite.

- [ ] **Step 1: Write failing API and UI state tests**

Assert exact route/body, query-key ownership, validation prevents mutation, one pending mutation, quota rendering, newest-first owned history pagination, 0–2 correction rendering, 3/3 improvement rendering, and assistance badge.

- [ ] **Step 2: Run web tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing.api.test.ts app/features/toeic-writing/tests/toeic-writing-part-one-ui.test.ts`

Expected: FAIL because grade methods/components are absent.

- [ ] **Step 3: Add API and React Query hooks**

```ts
gradePartOne(taskId: number, body: ToeicWritingPartOneGradeRequest): Promise<ToeicWritingPartOneGradeResult>;
quota(): Promise<ToeicWritingAiQuota>;
gradeHistory(taskId: number, cursor?: number): Promise<ToeicWritingGradeHistoryPage>;
recordAssistance(taskId: number, kind: "SAMPLE" | "COMMUNITY_RESTORE"): Promise<void>;
```

Grade mutation invalidates grade history and quota only; it must not clear the draft automatically.

- [ ] **Step 4: Implement validation/editor behavior**

Share wire issue codes with localized copy. Enforce word limits in the editor without truncating pasted content silently. Keep the response editable until grading starts, persist draft, and disable only the grading action while pending.

- [ ] **Step 5: Implement result UI**

Use shadcn `Alert`, `Badge`, `Button`, and collapsible sections with `rounded-md`. Render score/checklist, annotated correction or improvement, quota remaining/reset, cached status, assisted label, rewrite, and a lazy newest-first previous-grades panel. The sticky footer retains task navigation and grading action on mobile.

- [ ] **Step 6: Add complete English and Vietnamese messages**

Add identical key structures under `toeicWriting.partOneGrading`. Include validation, quota, provider, cache, assistance, score labels, checks, suggestion, and rewrite copy.

- [ ] **Step 7: Run web verification**

Run:

```powershell
pnpm --filter @repo/web test
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Expected: all commands exit 0; existing documented warnings may remain but no new warning is introduced.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/app/features/toeic-writing apps/web/app/views/toeic-writing apps/web/app/messages
git commit -m "feat(web): add TOEIC Writing picture AI coaching"
```

---

### Task 7: End-to-end verification and operations documentation

**Files:**

- Create: `apps/api/scripts/toeic-writing-ai/smoke-part-one-grading.ts`
- Modify: `.env.example`
- Modify: `CONTEXT.md`
- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`
- Modify: `docs/guides/environment-configuration.md`
- Create: `docs/runbooks/toeic-writing-ai.md`
- Test: `apps/api/scripts/toeic-writing-ai/smoke-part-one-grading.test.ts`

**Interfaces:**

- Produces: opt-in real-provider smoke command and operator runbook.

- [ ] **Step 1: Write a failing smoke-runner test**

Use a fake provider and assert the runner requires an explicit `--task-id`, never prints response text/API key, and exits non-zero for invalid structured output.

- [ ] **Step 2: Implement smoke runner and script entry**

Add `ai:smoke-toeic-writing-part1` to `apps/api/package.json`. Require `GEMINI_ENABLED=true` and explicit task ID. Default to dry-run provider/config/context checks unless `--call-provider` is supplied.

- [ ] **Step 3: Document setup and rollout**

Document environment values, migration, Prisma generation, 48-image dry run/enrichment/import, quota reset semantics, smoke command, single-process delivery-rate-limit constraint, rollback by `GEMINI_ENABLED=false`, and metrics to inspect. Update `CONTEXT.md` so Part 1 AI grading is no longer described as a future inference, document the new API ownership/transaction/rate-limit behavior in `docs/architecture/api.md`, document the Part 1 grading/history UI flow in `docs/architecture/frontend.md`, and add every new server-only variable to the canonical environment guide.

- [ ] **Step 4: Run full verification**

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

- [ ] **Step 5: Commit**

```powershell
git add .env.example CONTEXT.md apps/api/package.json apps/api/scripts/toeic-writing-ai docs/architecture docs/guides/environment-configuration.md docs/runbooks/toeic-writing-ai.md
git commit -m "docs: add TOEIC Writing AI operations runbook"
```
