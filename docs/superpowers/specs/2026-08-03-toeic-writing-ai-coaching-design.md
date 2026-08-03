# TOEIC Writing AI Coaching Design

## Status

Approved for implementation planning on 2026-08-03.

## Objective

Add authenticated, quota-controlled AI coaching to TOEIC Writing without exposing provider credentials or trusting browser-supplied task metadata. Deliver Picture grading first, then reuse the same foundation for Email coaching and grading.

## Scope

### Phase 1: Writing Part 1 — Picture

- Enrich each published picture into a reusable, versioned image context.
- Validate a learner's single sentence before using AI quota.
- Grade against the official TOEIC Writing Part 1 scale of 0–3.
- Return criterion-level feedback, a correction for scores below 3, or an improved expression for a score of 3.
- Preserve grading history, idempotency, assistance usage, and quota usage per account.

### Phase 2: Writing Part 2 — Email

- Present the imported bilingual email prompt, directions, and requirements.
- Expose optional outline, vocabulary, sample, and community panels.
- Validate the response before using AI quota.
- Grade against the official TOEIC Writing Part 2 scale of 0–4.
- Return task completion, sentence variety, tone, grammar, paraphrase, overall feedback, strengths, improvements, and an improved email.

### Out of scope

- TOEIC Writing opinion essay grading.
- Billing or purchasable AI credits.
- Redis, queues, and background workers for interactive grading.
- Calling or reusing Dautoeic grading endpoints or quota.
- Automatically publishing community submissions.

## Confirmed product decisions

- Provider: Gemini API through a backend-only adapter.
- Initial model: `gemini-3.5-flash-lite` for both vision enrichment and grading.
- Models are configured independently so either can be changed without code changes.
- Architecture: synchronous grading with database-backed quota; no Redis or worker.
- Access: authenticated users with verified email only.
- Daily limit: five successful, unique AI grades per user.
- Burst limits: two grading requests per minute per user and ten per minute per IP.
- One active grading request per user at a time.
- Identical task version, response, and prompt version reuse a cached result without consuming another daily use.
- Provider failure, timeout, or invalid structured output does not consume quota.
- Feedback follows the requested UI locale; stored enum values and schema keys remain locale-independent.
- Opening an outline, vocabulary panel, or sample is recorded. Results are labelled as independent or assisted.

## Architecture

The existing `toeic-writing` capability remains the owner of tasks, drafts, submissions, assistance events, and grades. Controllers validate transport input and delegate to use cases. Business rules belong in use cases and pure validators. Gemini is isolated behind an adapter.

Primary units:

- `PartOneResponseValidator`: deterministic Picture rules.
- `PartTwoResponseValidator`: deterministic Email rules.
- `GeminiWritingProvider`: provider-neutral interface implemented with Gemini.
- `ImageContextService`: resolves an enriched context and supports direct-image fallback.
- `GradePartOneUseCase`: validates, reserves quota, grades, persists, and returns Part 1 feedback.
- `GradePartTwoUseCase`: performs the equivalent Part 2 flow.
- `WritingAiQuotaRepository`: transaction-safe reservations and completion.
- `WritingGradeRepository`: owned grading history and idempotent cache lookup.
- `WritingAssistanceRepository`: records server-observed panel/sample access.

The web client sends only:

- `taskId`
- `contentVersion`
- `responseText`
- `idempotencyKey`
- requested locale

The API loads the task, image context, keywords, prompt, requirements, and rubric. The client cannot provide or override those values.

## Configuration

Configuration is validated through the API's existing configuration layer rather than read ad hoc inside use cases.

```env
GEMINI_API_KEY=...
GEMINI_VISION_MODEL=gemini-3.5-flash-lite
GEMINI_GRADING_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=20000
TOEIC_WRITING_AI_DAILY_LIMIT=5
TOEIC_WRITING_AI_USER_RATE_LIMIT=2
TOEIC_WRITING_AI_IP_RATE_LIMIT=10
```

Provider secrets must never be returned to the web app, stored in grading rows, or included in logs.

## Picture image enrichment

Image relevance is evaluated through a hybrid strategy.

1. An idempotent offline command reads the local licensed Picture package and image bytes.
2. It computes the image SHA-256 and looks up an existing context for the same image and prompt version.
3. Gemini reads the image once and returns structured context.
4. The command validates the response and writes a versioned candidate file for review.
5. An import step stores the approved context.
6. Interactive grading uses the stored context. If no valid context exists, the API may send the owned image bytes directly to Gemini and records `contextSource = direct_image`.

The context contains:

- concise scene summary
- visible people and objects
- observable actions
- safe factual statements
- claims that should not be inferred
- required keywords
- image SHA-256
- model and prompt version

The current 48 Part 1 images are backfilled before general availability. Enrichment runs again only when the image SHA or enrichment prompt version changes.

## Deterministic validation

Frontend validation improves responsiveness. The API repeats every rule and is authoritative.

### Part 1

- 3–40 whitespace-delimited words.
- At most 300 characters.
- Exactly one sentence.
- The first alphabetic character is uppercase.
- The response ends in `.`, `!`, or `?`.
- Both required words or phrases are present.
- Common English inflections are accepted, including plural, third-person singular, past, gerund, `y` transformations, final-`e` removal, and common consonant doubling.
- Obvious garbage is rejected: symbol/number-only content, repeated-character spam, or excessive repeated tokens.

### Part 2

- 50–300 whitespace-delimited words.
- At most 2,200 characters.
- Obvious garbage is rejected before grading.
- Greeting, sign-off, requirements, tone, sentence variety, grammar, and paraphrase are semantic grading concerns. They are not hard-blocked by deterministic validation.

Text is Unicode-normalized for validation and hashing while the learner's original text is preserved for display and evidence offsets.

## Quota, rate limiting, and idempotency

`ai_usage_daily` tracks `reserved` and `used` counts per user, feature, and UTC date.

1. A transaction reserves a slot only if `reserved + used < dailyLimit`.
2. A successful, schema-valid grade moves one slot from `reserved` to `used`.
3. Provider failure releases the reservation.
4. A stale-reservation recovery job or request-time cleanup releases expired reservations.

Additional protections:

- two requests per minute per user
- ten requests per minute per IP
- one in-flight grade per user
- normalized response hash and prompt version cache
- unique idempotency key per user
- payload size enforcement before parsing provider input

Deterministic validation and viewing learning aids never consume AI quota.

## Persistence

### Image contexts

Store task, content version, image SHA, structured context, model, prompt version, status, and timestamps. The unique identity is task plus image SHA plus prompt version.

### AI grades

Store:

- owner and task identifiers
- part and content version
- associated submission or draft identifier
- normalized response hash
- official score and structured feedback
- rubric, prompt, and model versions
- image context source for Part 1
- assistance snapshot
- lifecycle status and timestamps

The cache identity includes user, task, content version, response hash, and prompt version. Cache reads enforce ownership.

### Assistance

Outline, vocabulary, and sample content is returned by dedicated authenticated endpoints. Opening one records an assistance event on the server. Grades snapshot whether each aid was used. Community viewing is not considered authored-answer assistance, but restoring another learner's answer into the editor is.

Community publication remains explicit opt-in and separate from grading.

## Gemini prompting and structured output

Part 1 and Part 2 use separate prompts and JSON schemas:

- `toeic-writing-part1-v1`
- `toeic-writing-part2-v1`

Prompts include the official rubric, task-owned context, required output schema, scoring examples, and an instruction to treat learner content strictly as untrusted data. Temperature is kept low.

The API validates every provider response. One structured-output repair attempt is allowed. A second invalid response fails the request and releases quota.

### Part 1 result

- official score 0–3 and localized label
- grammar/spelling check
- required-keyword check
- image-relevance check
- overall localized feedback
- score below 3: corrected sentence and annotated changes
- score 3: improved sentence, explanation, and annotated additions

Any correction or improvement must contain both required keyword forms, remain relevant to the image context, and contain no more than 40 words.

### Part 2 result

- official score 0–4 and localized label
- task completion with one entry per stable requirement identifier
- sentence variety, including supported examples from the learner response
- professional tone
- serious and minor grammar findings
- paraphrase/copying findings against the source email
- overall feedback, strengths, and improvements
- improved email and categorized differences

Every learner-text quotation is represented by an offset range. The API verifies that each range resolves to the expected text. Invalid evidence is removed or causes the provider result to fail based on whether the field is required.

The improved email must be 50–300 words and satisfy every task requirement.

## UI behavior

### Part 1

Desktop uses a two-column picture/editor layout. Mobile stacks picture before editor. The editor shows the 40-word limit and deterministic errors. Sample and community panels sit beside the grading action. The sticky session footer contains navigation and grading status.

The result view shows the 0–3 score, criterion checklist, correction or improvement, and a rewrite action. Previous grades remain available in history.

### Part 2

Desktop uses source email on the left and directions/editor on the right. Mobile stacks the email first. The editor shows a 300-word limit and enables grading at 50 valid words.

Optional panels:

- Outline: two stored variants with Opening, Body, and Ending.
- Vocabulary: stored bilingual patterns and examples, with later integration into the vocabulary basket.
- Sample: English first, Vietnamese below, with optional structure labels.
- Community: only learner-opted-in submissions.

The result view shows a 0–4 score, overview chips, criterion accordions, overall feedback, strengths, improvement priorities, and an improved email. It displays `Independent` or `Assisted` based on server-recorded events.

## Error handling

- Validation failures return stable field/rule codes and do not reserve quota.
- Quota responses include the limit, usage, remaining count, and reset time.
- Provider timeout or unavailable errors are retryable and do not consume quota.
- A stale content version preserves the draft but requires the learner to reload before grading.
- Offline web drafts remain local and synchronize when connectivity returns.
- Provider and database failures must not expose prompts, credentials, stack traces, or another user's data.

## Testing strategy

- Unit tests for Part 1 and Part 2 validators and keyword morphology.
- Unit tests for quota reserve, complete, release, expiry, and concurrent races.
- Unit tests for owned cache and idempotency behavior.
- Contract tests for Gemini adapter fixtures; CI never calls Gemini.
- Golden prompt tests for every official score level.
- Integration tests from controller through mocked provider and repositories.
- Security tests for ownership, validation bypass, prompt injection, cross-user cache reads, and assistance tampering.
- UI tests for validation, loading, cached results, quota exhaustion, retries, optional panels, and responsive layouts.
- An opt-in smoke command calls Gemini against a small licensed fixture set only when a key is explicitly supplied.

Metrics include aggregate latency, error rate, schema failure rate, cache hit rate, and quota usage. Learner text and raw prompts are excluded from logs and metrics.

## Delivery order

1. Shared Gemini adapter, configuration, quota, persistence, and contracts.
2. Part 1 image enrichment command and backfill.
3. Part 1 grading API and result UI.
4. Part 2 optional coaching panels and assistance tracking.
5. Part 2 grading API and result UI.
6. Community opt-in, moderation boundaries, rubric QA, and rollout controls.

Each phase must pass its unit, integration, architecture, type, lint, and relevant build checks before the next phase begins.
