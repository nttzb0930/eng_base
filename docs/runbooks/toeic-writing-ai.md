# TOEIC Writing AI Runbook

This runbook operates Part 1 picture-description and Part 2 email-response
coaching. Provider access is disabled by default, secrets stay in the ignored
root `.env`, and no startup, build, test, seed, or migration command calls
Gemini.

## Preconditions

1. Back up the intended database and confirm its `DATABASE_URL`/`DB_*` target.
2. Mount or retain the approved private Writing packages under
   `LICENSED_CONTENT_ROOT`; never commit this directory or its media.
3. Generate Prisma Client, then apply the committed migrations in the intended
   environment:

```powershell
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api db:migrate:deploy
```

The migration must exist before import, but migration deployment is an operator
action. Do not use `db:push` as a substitute.

## Image-context enrichment

Inventory the current Part 1 candidates without provider traffic:

```powershell
pnpm --filter @repo/api data:enrich-toeic-writing-part1 -- --dry-run --workers=2
```

The approved dataset currently contains 48 eligible Part 1 images. A changed
count must be reviewed before enabling provider work. For a reviewed run, set
`GEMINI_ENABLED=true` and `GEMINI_API_KEY` only in the local environment, then:

```powershell
pnpm --filter @repo/api data:enrich-toeic-writing-part1 -- --workers=2
pnpm --filter @repo/api data:import-toeic-writing-part1-contexts -- --prompt-version=toeic-writing-image-context-v1
```

Both commands are resumable/idempotent by their content and prompt identities.
Do not raise concurrency until provider limits and failure behavior are known.

## Grading smoke

Choose one published Part 1 database task ID. The default smoke verifies task
ownership plus context/image resolution and never calls Gemini:

```powershell
pnpm --filter @repo/api ai:smoke-toeic-writing-part1 -- --task-id=<task-id>
```

Only after the dry run is healthy and provider use is explicitly approved:

```powershell
pnpm --filter @repo/api ai:smoke-toeic-writing-part1 -- --task-id=<task-id> --call-provider
```

The runner uses a synthetic sentence, validates the structured response, and
logs only task ID, context source, provider-call state, schema state, and score.
It never prints the API key, image context, learner response, or raw provider
response. The smoke does not consume learner quota or persist a learner grade.

### Part 2 email grading

Part 2 reuses the same server-only Gemini configuration. Runtime grading uses
`POST /api/toeic/writing/tasks/:taskId/grades/part-two`, the official 0-4
scale, and rejects responses outside 50-300 words or 2,200 characters before
quota or provider use. Results disclose whether outline, vocabulary, sample, or
community assistance was used; opening assistance does not reduce the score.

Choose one owned, published Part 2 task. The default command validates task
ownership, prompt construction, schema, requirement IDs, and evidence rules
without calling Gemini or charging quota:

```powershell
pnpm --filter @repo/api ai:smoke-toeic-writing-part2 -- --task-id=<task-id>
```

Only after review, enable Gemini and opt into one real provider call:

```powershell
$env:GEMINI_ENABLED="true"
pnpm --filter @repo/api ai:smoke-toeic-writing-part2 -- --task-id=<task-id> --call-provider
```

The summary contains only task ID, model, latency, score, schema status,
provider-call status, and `quotaCharged=false`. It never logs task content,
learner response, prompt, API key, or raw provider response. Review the five
deterministic rubric fixtures (scores 0-4) whenever the prompt, schema, rubric,
or evidence validation changes.

## Runtime checks

- Confirm unauthenticated grading is rejected.
- Confirm invalid local responses are rejected before quota/provider use.
- Confirm a successful grade decrements remaining daily quota once.
- Retry the same response and confirm `cached=true` with no extra quota charge.
- Confirm another learner cannot read grade detail or history.
- Confirm Sample/assistance use is represented separately in the result.
- Confirm Part 2 result contains every server-owned requirement exactly once.
- Confirm Unicode evidence offsets reproduce the displayed learner excerpts.

Daily quota resets at UTC midnight. Expired reservations are released after
`WRITING_AI_RESERVATION_TTL_MS`. HTTP delivery limits are process-local; use a
shared limiter before running multiple API replicas.

## Observability and rollback

Monitor the structured events `context_resolved`, `grade_completed`, and
`grade_failed`, including only model/version, outcome, cache/quota flags,
context source, and latency bucket. Treat prompts, responses, picture context,
keys, headers, and provider bodies as prohibited log data.

Immediate rollback is `GEMINI_ENABLED=false` followed by an API restart. This
stops new provider calls while preserving tasks, contexts, grades, submissions,
and history. Do not delete migration history or persisted grades during a
provider incident.

Monitor invalid-response, evidence-mismatch, quota-exhausted, provider-timeout,
and provider-disabled outcomes. A Part 2 incident uses the same rollback and
must not delete drafts, submissions, assistance events, or existing grades.
