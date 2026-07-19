# Topic Localization and Runner Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 103 canonical vocabulary topics manually bilingual for English/Vietnamese, expose locale-aware topic learning in API/Web, and make AI topic classification observable, deterministic, and fail-closed.

**Architecture:** `data/vocabulary/topics.json` remains the single taxonomy source; catalog records continue storing topic slugs only. Seed synchronization copies localized taxonomy fields into PostgreSQL, API use cases project the requested locale with English fallback, and Web includes locale in requests/query keys and groups topic cards by the localized group. Classification artifacts use a versioned execution identity derived from input, taxonomy, prompt, provider, and model; only exact matches can be reused.

**Tech Stack:** TypeScript 6, Node test runner, NestJS 11, Prisma 7/PostgreSQL 15, Next.js 15, TanStack Query, next-intl, pnpm/Turborepo.

## Global Constraints

- Do not call Gemini/OpenAI-compatible providers during implementation verification.
- Do not merge generated topic classifications, reset the database, or run the full seed automatically.
- Never log API keys, authorization headers, cookies, database credentials, complete prompts, complete provider responses, or complete batches.
- Preserve `VocabularyCatalogItem.topics` as `string[]`; localized topic objects belong to taxonomy/API responses only.
- Preserve English `title`, `description`, and `group` fields for backward compatibility.
- All Vietnamese text in the canonical taxonomy is human-authored; do not machine-generate it during this task.
- Implement each task test-first and keep commits small. Do not tag or push without a separate user instruction.

---

## Task 1: Enforce the bilingual canonical taxonomy contract

**Files:**

- Modify: `apps/api/scripts/vocabulary/catalog/vocabulary-catalog.ts`
- Modify: `apps/api/scripts/vocabulary/catalog/vocabulary-catalog.test.ts`
- Modify: `apps/api/test/vocabulary-data-architecture.test.ts`

- [ ] Add failing unit fixtures/tests asserting that every topic requires non-empty `titleVi`, `descriptionVi`, and `groupVi`, orders are unique, and one English group cannot map to conflicting Vietnamese group names.

- [ ] Add a failing architecture assertion that `topics.json` contains exactly 103 entries, unique slugs/orders, complete bilingual text, and that every `vocabulary-catalog.json[*].topics[*]` value is a string slug present in the taxonomy.

- [ ] Run the focused tests and confirm they fail because the current interface/data has no Vietnamese fields:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts test/vocabulary-data-architecture.test.ts
```

- [ ] Extend the canonical type without creating a second contract:

```ts
export type VocabularyTopicDefinition = {
  slug: string;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  order: number;
  group: string;
  groupVi: string;
};
```

- [ ] Extend `validateVocabularySources()` with trimmed non-empty checks, duplicate-order detection, and consistent `group -> groupVi` validation. Error messages must include the topic slug or conflicting group.

- [ ] Run the focused tests again. Unit fixtures should pass; the architecture test should remain red only because the real JSON has not yet been translated.

- [ ] Commit:

```powershell
git add apps/api/scripts/vocabulary/catalog/vocabulary-catalog.ts apps/api/scripts/vocabulary/catalog/vocabulary-catalog.test.ts apps/api/test/vocabulary-data-architecture.test.ts
git commit -m "test: enforce bilingual topic taxonomy"
```

## Task 2: Manually localize all 103 topics

**Files:**

- Modify: `data/vocabulary/topics.json`

- [ ] Preserve every existing slug, English title/description/group, and order. Add `titleVi`, `descriptionVi`, and `groupVi` to each of the 103 objects.

- [ ] Write natural learner-facing Vietnamese. Use sentence case, keep topic names concise, end descriptions consistently, and use one exact `groupVi` translation for every repeated English group.

- [ ] Do not alter `data/vocabulary/vocabulary-catalog.json` in this task.

- [ ] Run the taxonomy tests:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/catalog/vocabulary-catalog.test.ts test/vocabulary-data-architecture.test.ts
```

Expected: 103 topics accepted; catalog references remain slug-only and valid.

- [ ] Review the diff specifically for accidental slug/order/English changes:

```powershell
git diff --word-diff=porcelain -- data/vocabulary/topics.json
```

- [ ] Commit:

```powershell
git add data/vocabulary/topics.json
git commit -m "data: localize vocabulary topics in Vietnamese"
```

## Task 3: Carry localization through seed data

**Files:**

- Modify: `apps/api/scripts/vocabulary/database/vocabulary-seed-data.test.ts`
- Modify: `apps/api/scripts/vocabulary/database/vocabulary-seed-data.ts`
- Modify: `apps/api/scripts/vocabulary/database/seed-vocab-topics.ts`
- Modify: `apps/api/scripts/seed.ts`

- [ ] Update seed-data fixtures and add failing assertions that all six presentation fields survive loading unchanged: `title`, `titleVi`, `description`, `descriptionVi`, `group`, `groupVi`.

- [ ] Run the focused test and confirm failure:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/vocabulary-seed-data.test.ts
```

- [ ] Map canonical taxonomy fields to persistence consistently in both the targeted topic seed and the main seed:

```ts
{
  title: topic.title,
  title_vi: topic.titleVi,
  description: topic.description,
  description_vi: topic.descriptionVi,
  group_name: topic.group,
  group_name_vi: topic.groupVi,
  order: topic.order,
}
```

- [ ] Use the same mapping for both Prisma `create` and `update`. Do not duplicate divergent field lists; extract a local mapper if the file structure permits.

- [ ] Run the focused test and API type check:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/vocabulary/database/vocabulary-seed-data.test.ts
pnpm --filter @repo/api check-types
```

The type check may remain red until Task 4 adds Prisma columns; record the exact expected errors and do not suppress them.

- [ ] Commit only after Task 4 if Prisma types prevent a valid isolated commit.

## Task 4: Add localized topic columns via migration

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260719190000_add_localized_vocabulary_topics/migration.sql`

- [ ] Add nullable columns to `vocabulary_topics` so deployment is backward-compatible before seed synchronization:

```prisma
title_vi       String?
description_vi String?
group_name     String?
group_name_vi  String?
```

- [ ] Write additive SQL only:

```sql
ALTER TABLE "vocabulary_topics"
  ADD COLUMN "title_vi" TEXT,
  ADD COLUMN "description_vi" TEXT,
  ADD COLUMN "group_name" TEXT,
  ADD COLUMN "group_name_vi" TEXT;
```

- [ ] Regenerate the client and verify types without applying the migration to the user's database:

```powershell
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api check-types
```

- [ ] Run the seed-data test again.

- [ ] Commit Tasks 3 and 4 together because seed code and generated Prisma types form one deployable slice:

```powershell
git add apps/api/prisma apps/api/scripts/seed.ts apps/api/scripts/vocabulary/database
git commit -m "feat(api): persist localized vocabulary topics"
```

## Task 5: Define and test API locale projection

**Files:**

- Create: `apps/api/src/module/topics/topic-locale.ts`
- Create: `apps/api/src/module/topics/topics.use-cases.test.ts`
- Modify: `apps/api/src/module/topics/use-cases/topic-source.ts`
- Modify: `apps/api/src/module/topics/use-cases/list-vocabulary-topics.use-case.ts`
- Modify: `apps/api/src/module/topics/use-cases/get-vocabulary-topic.use-case.ts`
- Modify: `packages/shared/src/types/vocabulary.ts`

- [ ] Add tests using a fake Prisma boundary for these cases:

  - omitted locale returns English;
  - `vi` returns Vietnamese title/description/group;
  - missing Vietnamese values fall back field-by-field to English;
  - unsynchronized English group falls back to stable `Other`;
  - list and detail return the same localized presentation fields;
  - locale does not alter slug, order, counts, progress, or vocabulary membership.

- [ ] Run the focused test and confirm it fails:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/topics/topics.use-cases.test.ts
```

- [ ] Define the bounded locale contract and projection:

```ts
export const TOPIC_LOCALES = ["en", "vi"] as const;
export type TopicLocale = (typeof TOPIC_LOCALES)[number];

export function localizeVocabularyTopic(
  topic: RawVocabularyTopic,
  locale: TopicLocale,
) {
  const englishGroup = topic.group_name?.trim() || "Other";
  return {
    id: topic.id,
    slug: topic.slug,
    title: locale === "vi" ? topic.title_vi?.trim() || topic.title : topic.title,
    description:
      locale === "vi"
        ? topic.description_vi?.trim() || topic.description
        : topic.description,
    group:
      locale === "vi"
        ? topic.group_name_vi?.trim() || englishGroup
        : englishGroup,
    order: topic.order,
  };
}
```

- [ ] Extend raw SQL selections and `RawVocabularyTopic` with all localized columns. Pass `locale: TopicLocale = "en"` into both use cases and project before composing stats/details.

- [ ] Add required `group: string` to shared `VocabularyTopic`; do not expose `titleVi` or `descriptionVi` to Web.

- [ ] Run focused tests and type checks:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/topics/topics.use-cases.test.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/web check-types
```

- [ ] Commit:

```powershell
git add apps/api/src/module/topics packages/shared/src/types/vocabulary.ts
git commit -m "feat(api): localize vocabulary topic responses"
```

## Task 6: Validate `locale` at the HTTP boundary

**Files:**

- Create: `apps/api/src/module/topics/dto/topics-query.dto.ts`
- Create: `apps/api/src/module/topics/topics.controller.test.ts`
- Modify: `apps/api/src/module/topics/topics.controller.ts`

- [ ] Add controller tests proving `locale=vi` reaches list/detail use cases, omission becomes `en`, and an unsupported locale is rejected by the DTO validation contract.

- [ ] Run and confirm failure:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/topics/topics.controller.test.ts
```

- [ ] Implement DTOs using `class-validator` and the global transform/whitelist pipe already configured in `main.ts`:

```ts
export class TopicsQueryDto {
  @IsOptional()
  @IsIn(TOPIC_LOCALES)
  locale: TopicLocale = "en";
}

export class TopicDetailsQueryDto extends TopicsQueryDto {
  @IsOptional()
  @IsIn(PRACTICE_CEFR_LEVELS)
  level?: PracticeCefrLevel;
}
```

- [ ] Replace raw `@Query("level")` arguments with `@Query() query` and pass `query.locale` explicitly. Preserve routes `GET /topics` and `GET /topics/:slug`.

- [ ] Run controller tests, all topic tests, lint, and API type check.

- [ ] Commit:

```powershell
git add apps/api/src/module/topics
git commit -m "feat(api): validate vocabulary topic locale"
```

## Task 7: Make Web requests and caches locale-aware

**Files:**

- Modify: `apps/web/app/features/topics/api/topic.api.ts`
- Modify: `apps/web/app/features/topics/hooks/use-topics.ts`
- Modify: `apps/web/app/features/topics/tests/topic.api.test.ts`
- Create: `apps/web/app/features/topics/tests/topic-query-keys.test.ts`
- Modify: topic list/detail consumers under `apps/web/app/views/topics/`

- [ ] Update API tests first. Expected requests:

```ts
[
  { method: "GET", path: "/topics?locale=vi" },
  { method: "GET", path: "/topics/travel?locale=vi&level=A1" },
]
```

- [ ] Add query-key tests proving English and Vietnamese list/detail keys differ.

- [ ] Run focused Web tests and confirm failure:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/topics/tests/topic.api.test.ts app/features/topics/tests/topic-query-keys.test.ts
```

- [ ] Change signatures to `list(locale)` and `detail(slug, locale, level?)`. Build query strings with `URLSearchParams` so parameters are encoded and deterministic.

- [ ] Include locale in all cache keys:

```ts
list: (locale: string) => ["topics", "list", locale] as const,
detail: (slug: string, locale: string, level?: string) =>
  ["topics", "detail", locale, slug, level ?? "all"] as const,
```

- [ ] Read the current locale at the view boundary and pass it to `useTopics(locale)` / `useTopic(slug, locale, level)`. Never infer locale from translated response text.

- [ ] Run focused tests and Web type check.

- [ ] Commit:

```powershell
git add apps/web/app/features/topics apps/web/app/views/topics
git commit -m "feat(web): request localized vocabulary topics"
```

## Task 8: Group the learn-by-topic catalog by localized group

**Files:**

- Create: `apps/web/app/features/topics/utils/group-vocabulary-topics.ts`
- Create: `apps/web/app/features/topics/tests/group-vocabulary-topics.test.ts`
- Modify: `apps/web/app/views/topics/TopicsView.tsx`

- [ ] Add pure-function tests verifying stable group order by first topic order, stable card order, no mutation, and a single `Other` group for blank group values.

- [ ] Run the focused test and confirm failure.

- [ ] Implement:

```ts
export type VocabularyTopicGroup = {
  name: string;
  topics: VocabularyTopic[];
};

export function groupVocabularyTopics(
  topics: readonly VocabularyTopic[],
): VocabularyTopicGroup[] {
  // Sort a copy by `order`, then accumulate by trimmed `group || "Other"`.
}
```

- [ ] Update `TopicsView` so the existing recommendation stays global, while the catalog renders one section per localized group with a heading and topic count. Keep existing localized topic links and progress cards.

- [ ] Run the focused test, Web tests, lint, and type check.

- [ ] Commit:

```powershell
git add apps/web/app/features/topics apps/web/app/views/topics/TopicsView.tsx
git commit -m "feat(web): group vocabulary topics for learning"
```

## Task 9: Version classification plans and execution identities

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-classification/topic-classification.ts`
- Modify: `apps/api/scripts/vocabulary/topic-classification/topic-classification.test.ts`
- Create: `apps/api/scripts/vocabulary/topic-classification/topic-classification-run.ts`
- Create: `apps/api/scripts/vocabulary/topic-classification/topic-classification-run.test.ts`
- Modify: `apps/api/scripts/vocabulary/topic-classification/prepare-vocab-topics.ts`

- [ ] Add failing tests for deterministic SHA-256 identities and mismatch reasons covering input, catalog, taxonomy, prompt, provider, and model.

- [ ] Define version-2 manifest identity:

```ts
export type ClassificationPlan = {
  schemaVersion: 2;
  catalogSha256: string;
  topicTaxonomySha256: string;
  promptSha256: string;
  totalRecords: number;
  batchSize: number;
  batches: ClassificationBatch[];
};

export type ClassificationExecutionIdentity = {
  schemaVersion: 2;
  batchId: string;
  inputSha256: string;
  catalogSha256: string;
  topicTaxonomySha256: string;
  promptSha256: string;
  provider: "gemini" | "openai-compatible";
  model: string;
  executionSha256: string;
};
```

- [ ] Make `executionSha256` the hash of a stable JSON serialization of every preceding identity field. Never include an API key or base URL.

- [ ] Extend preparation to hash the exact canonical topic JSON content and prompt text used by the runner. Keep batch input hashes. Re-preparation may preserve old outputs because reuse validation will reject stale identities safely.

- [ ] Run both classification unit suites and the API type check.

- [ ] Commit:

```powershell
git add apps/api/scripts/vocabulary/topic-classification
git commit -m "feat(data): fingerprint topic classification runs"
```

## Task 10: Add safe progress/debug reporting and fail-closed runner behavior

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-classification/topic-classification-run.ts`
- Modify: `apps/api/scripts/vocabulary/topic-classification/topic-classification-run.test.ts`
- Modify: `apps/api/scripts/vocabulary/topic-classification/run-vocab-topics-gemini.ts`

- [ ] Add failing tests for:

  - basic events always emitted: run start, batch start, reused/stale/success/rejected, run finish;
  - `VOCAB_AI_DEBUG=true` adds bounded provider/model/timing/count/fingerprint prefixes;
  - debug false never emits prompt/response/batch content;
  - stale output is rerun rather than silently reused;
  - missing/rejected requested batches yield a nonzero final result;
  - error sanitization replaces bearer tokens, `sk-...` strings, URLs with credentials, and long provider bodies.

- [ ] Implement structured one-line JSON events through a reporter that only accepts allow-listed scalar metadata. Basic events include batch ID, ordinal/total, status, duration, and aggregate counts.

- [ ] Parse debug strictly and case-insensitively:

```ts
const debug = process.env.VOCAB_AI_DEBUG?.trim().toLowerCase() === "true";
```

- [ ] Replace unconditional `outputPath exists -> continue` with exact `validateReusableClassificationOutput()`. Log `reused` only for an exact identity; log `stale` with a bounded mismatch code and rerun otherwise.

- [ ] Store output as `{ ...identity, records }`. Write rejected metadata without raw provider responses. After all workers settle, throw a summarized error or set `process.exitCode = 1` when any requested batch is rejected/missing.

- [ ] Keep `VOCAB_AI_CONCURRENCY` as the concurrency cap and ensure counters update in JavaScript's single event loop without printing entire batches.

- [ ] Run focused tests, API lint, and type check. Do not invoke `data:classify-topics-ai` in verification.

- [ ] Commit:

```powershell
git add apps/api/scripts/vocabulary/topic-classification
git commit -m "feat(data): expose safe classification progress"
```

## Task 11: Reject mixed or stale outputs during merge

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-classification/merge-vocab-topics.ts`
- Create: `apps/api/scripts/vocabulary/topic-classification/merge-vocab-topics.test.ts`

- [ ] Extract a pure output-collection validator and test:

  - all expected batch IDs exist exactly once;
  - every output matches manifest input/catalog/taxonomy/prompt hashes;
  - every output has the same provider and model;
  - no rejected file exists for a requested batch;
  - stale version-1 `{ batchId, records }` output is rejected;
  - valid v2 outputs return records in manifest order.

- [ ] Run the focused test and confirm failure.

- [ ] Make merge exit before writing the catalog if any check fails. Preserve the existing topic-slug validation and “topics-only” merge behavior.

- [ ] Run classification/merge tests and type check. Do not run the real merge command.

- [ ] Commit:

```powershell
git add apps/api/scripts/vocabulary/topic-classification
git commit -m "fix(data): reject stale topic classifications"
```

## Task 12: Sanitize environment examples and document operations

**Files:**

- Modify: `.env.example`
- Modify: `docs/operations/environment-configuration.md`
- Modify: the vocabulary workflow guide under `docs/` that currently documents topic classification
- Modify: `README.md` only if its setup commands reference outdated topic/env behavior

- [ ] Remove any real-looking secret from `.env.example`; all committed secret values must be blank or explicit placeholders. Add:

```dotenv
VOCAB_AI_PROVIDER=openai-compatible
VOCAB_TOPIC_MODEL=gemini-3-flash
VOCAB_AI_CONCURRENCY=3
VOCAB_AI_DEBUG=false
VOCAB_TOPIC_BATCH_SIZE=50
VOCAB_TOPIC_MINIMUM_WORDS=30
OPENAI_API_KEY=
OPENAI_BASE_URL=http://127.0.0.1:8045/v1
```

- [ ] Document that `OPENAI_BASE_URL` is the API root ending in `/v1`; code appends `/chat/completions`. Explain basic vs debug logs, exact fingerprint reuse, nonzero rejected exits, and safe resume commands.

- [ ] Document the canonical localization boundary: bilingual fields live in `topics.json`/topic table; catalog assignments stay slug-only; API accepts `locale=en|vi` and defaults to English.

- [ ] Add a security note: a credential previously exposed in chat or committed history must be rotated. History rewriting is a separate destructive Git operation and is not performed by this plan without explicit approval.

- [ ] Search tracked files for obvious stale names/secrets without printing secret values:

```powershell
git grep -n -E "GEMINI_API_KEY=.+|OPENAI_API_KEY=.+|lingo|Clerk|CLERK_" -- . ":(exclude)pnpm-lock.yaml"
```

Review each match; placeholders and historical documentation references must be intentional.

- [ ] Run docs/source checks and commit:

```powershell
pnpm --filter @repo/api lint
pnpm --filter @repo/api check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web check-types
git add .env.example README.md docs
git commit -m "docs: explain localized topic data workflow"
```

## Task 13: Full verification and deployment handoff

**Files:**

- No implementation changes expected; fix only defects exposed by verification.

- [ ] Run all repository verification:

```powershell
pnpm architecture:check
pnpm test
pnpm lint
pnpm check-types
pnpm build
git status --short
```

- [ ] Confirm no provider call occurred and `data/vocabulary/working/` remains ignored/uncommitted.

- [ ] Confirm migration and seed order for the operator, but do not execute automatically:

```powershell
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:seed-topics
```

- [ ] Manually smoke-test after the operator applies migration/seed:

  - `GET /api/topics?locale=en` returns English `title`, `description`, `group`;
  - `GET /api/topics?locale=vi` returns Vietnamese values;
  - `GET /api/topics/:slug?locale=vi&level=A1` remains compatible;
  - Web `/en/topics` and `/vi/topics` use distinct cached responses and localized group headings.

- [ ] Inspect `git log --oneline --decorate -15` and `git status --short`. Do not create a tag or push unless requested.

## Acceptance Checklist

- [ ] Exactly 103 canonical topics contain complete manual English/Vietnamese title, description, and group values.
- [ ] Catalog topic assignments remain arrays of valid slugs only.
- [ ] Database migration is additive and seed synchronization populates all localized fields.
- [ ] API validates `locale=en|vi`, defaults to English, and performs field-level English fallback.
- [ ] Web request/query keys include locale and the learn-by-topic page groups cards by localized group.
- [ ] Classification output reuse requires an exact version-2 execution identity.
- [ ] Basic progress is always visible; detailed safe diagnostics require `VOCAB_AI_DEBUG=true`.
- [ ] Any requested rejected/missing batch makes the runner fail nonzero.
- [ ] Merge refuses missing, rejected, mixed, version-1, or stale outputs before writing catalog data.
- [ ] No secret or full provider payload is logged or committed.
- [ ] Repository architecture, tests, lint, type checks, and builds pass.
