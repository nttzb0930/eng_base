# TOEIC Dictation 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task with a verification checkpoint after each task.

**Goal:** Import the approved/free Đề 2026 dictation collection and expose an authenticated, backend-scored dictation flow inside the TOEIC Listening page.

**Architecture:** Create a dedicated `toeic-dictation` content/progress domain instead of coercing dictation items into `toeic_questions`. Reuse the existing licensed-content storage/path-safety conventions and the existing TOEIC Listening page shell, HTTP client, auth guard, and localized navigation. Keep source acquisition, canonical packages, Prisma persistence, API use cases, and web state isolated by responsibility.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Zod, Node fetch, Next.js App Router, React Query, `next-intl`, Tailwind CSS, Vitest/Node test runner.

## Global Constraints

- Phase 1 imports only `collection_name = "Đề 2026"`, `access_level = "free"`, `is_hidden = false`.
- The expected inventory is 40 sets and 3,206 visible items; Pro/TOEIC MASTER and hidden rows are rejected.
- All learner dictation routes require JWT authentication.
- Progress and attempts are backend-owned; do not use localStorage as the source of truth.
- Canonical packages exclude media bytes; media remains under private `var/licensed-content` storage and is never committed.
- Transcript and answer data stay server-side until an item submission is accepted.
- Mastery is `accuracy >= 90`.
- Import is idempotent and replaces a matching published version atomically only after validation.
- Existing TOEIC Listening full-test and Part 1–4 behavior must remain unchanged.

---

### Task 1: Add source adapter, canonical contract, and 2026 inventory

**Files:**
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.types.ts`
- Create: `apps/api/scripts/toeic-dictation/dautoeic-toeic-dictation-source.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.profile.json`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.inventory.ts`
- Create: `apps/api/scripts/toeic-dictation/inventory-toeic-dictation.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.source.test.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.inventory.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- `createDautoeicToeicDictationSource(config): ToeicDictationSource` reads only `listening_sets` and `listening_items` through the existing approved source authorization file.
- `buildToeicDictationInventory(source, filter): Promise<ToeicDictationInventory>` returns source sets, normalized items, media inspections, and SHA-256 metadata.
- CLI `data:inventory-toeic-dictation -- --collection=2026` prints JSON containing `storageKey`, `inventorySha256`, `selectedSetCount`, `itemCount`, `audioCount`, `knownMediaBytes`, and `unknownMediaSizeCount`.

- [ ] **Step 1: Write failing source fixtures** for one valid free 2026 set, one hidden set, one Pro set, and one item missing transcript/audio. Assert only the valid set is accepted and invalid rows receive categorized errors.
- [ ] **Step 2: Run focused tests** with `pnpm --filter @repo/api exec tsx --test "scripts/toeic-dictation/*.test.ts"`; expected initial failure because the adapter and inventory functions do not exist.
- [ ] **Step 3: Implement the strict Zod schemas and source adapter.** The adapter must set `apikey` and `Authorization` from the private authorization value, constrain URLs to the configured Supabase host, paginate at 1,000 rows, and request only the fields needed for the canonical contract.
- [ ] **Step 4: Implement inventory filtering and deterministic canonical hashing.** Filter collection/access/hidden before media inspection, sort by set order then item order/id, inspect only allowed media URLs, and hash stable JSON with SHA-256.
- [ ] **Step 5: Add the CLI entry point and package script** without requiring a database connection. Read authorization from `var/licensed-content/dautoeic/source-authorization.txt`; never print it.
- [ ] **Step 6: Run focused tests** and verify the fixture reports 2026/free-only rows, rejects Pro/hidden rows, and produces the same SHA for the same input.
- [ ] **Step 7: Commit** with `git add apps/api/scripts/toeic-dictation apps/api/package.json && git commit -m "feat(api): inventory TOEIC dictation 2026"`.

---

### Task 2: Add resumable download, canonical package, and validation

**Files:**
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.storage.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.download.ts`
- Create: `apps/api/scripts/toeic-dictation/download-toeic-dictation.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.validation.ts`
- Create: `apps/api/scripts/toeic-dictation/validate-toeic-dictation.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.download.test.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.validation.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- `createFileToeicDictationStorage(repositoryRoot): ToeicDictationStorage` stores packages under `var/licensed-content/dautoeic/toeic-dictation/2026/` with one child directory per content SHA-256.
- `downloadToeicDictationPackage(input): Promise<DownloadSummary>` supports bounded concurrency, checksum reuse, retry, and resume.
- `validateToeicDictationPackage(package): ToeicDictationValidation` returns `valid`, categorized errors, and normalized counts.

- [ ] **Step 1: Write failing tests** for path containment, checksum reuse, interrupted download resume, unsupported content type, zero-byte media, duplicate source IDs, and missing transcript/audio.
- [ ] **Step 2: Run the focused download/validation tests** and verify they fail for missing storage/download functions.
- [ ] **Step 3: Implement storage with explicit path containment.** Store `content.json`, `manifest.json`, `validation.json`, and media by SHA-256 extension; reject paths outside the dictation root.
- [ ] **Step 4: Implement resumable download.** Use the profile’s `downloadConcurrency: 2`, `Range` from existing byte length, retries for 429/5xx, and a final checksum/byte-size check before marking a file reusable.
- [ ] **Step 5: Implement package validation** for 40 sets, expected collection/access flags, unique source item IDs, stable ordering, non-empty transcript, local audio existence, supported audio content type, positive byte size, and manifest checksum equality.
- [ ] **Step 6: Add CLI commands** `pnpm --filter @repo/api data:download-toeic-dictation -- --approved-sha=$env:DICTATION_SHA` and `pnpm --filter @repo/api data:validate-toeic-dictation`, both independent of the database.
- [ ] **Step 7: Run focused tests** and a read-only inventory command. Record the operator-approved SHA and media size before any download.
- [ ] **Step 8: Commit** with `git add apps/api/scripts/toeic-dictation apps/api/package.json && git commit -m "feat(api): download and validate TOEIC dictation"`.

---

### Task 3: Add Prisma schema and migration for dictation content/progress

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801100000_add_toeic_dictation_content/migration.sql`
- Create: `apps/api/src/module/toeic-dictation/tests/toeic-dictation-migration.spec.ts`

**Interfaces:**
- Prisma models `toeic_dictation_sets`, `toeic_dictation_items`, `toeic_dictation_progress`, and `toeic_dictation_attempts` expose the names used by the API use cases in later tasks.
- `toeic_dictation_sets` has unique `(source, source_set_id)` and a published source version.
- `toeic_dictation_progress` has unique `(user_id, item_id)`.
- `toeic_dictation_attempts` has unique `(user_id, submission_key)` and immutable source-version/score snapshots.

- [ ] **Step 1: Write migration contract tests** asserting tables, primary keys, unique indexes, foreign-key cascades, `accuracy` range, and `mastered` fields.
- [ ] **Step 2: Run the migration test** and confirm it fails because the migration/models are absent.
- [ ] **Step 3: Add Prisma models** with `Json` word-level feedback, `String[]`/scalar ordering metadata where needed, `published_at`, and indexes for collection/test/part and user progress lookups.
- [ ] **Step 4: Write the SQL migration** matching the Prisma schema, including checks that accuracy is between 0 and 100 and that only one attempt identity exists per user/submission key.
- [ ] **Step 5: Run `pnpm --filter @repo/api exec prisma validate` and the migration tests.** Do not apply the migration automatically.
- [ ] **Step 6: Commit** with `git add apps/api/prisma && git commit -m "feat(api): add TOEIC dictation persistence"`.

---

### Task 4: Import the validated 2026 package idempotently

**Files:**
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.import.ts`
- Create: `apps/api/scripts/toeic-dictation/import-toeic-dictation.ts`
- Create: `apps/api/scripts/toeic-dictation/toeic-dictation.import.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- `importToeicDictationPackage(prisma, storage, approvedSha): Promise<ImportSummary>` returns `updated`, `skipped`, `rejected`, and `failed` source set IDs.
- Import reads only a complete validated package whose SHA equals `--approved-sha` and whose set rows still satisfy 2026/free/non-hidden constraints.

- [ ] **Step 1: Write failing importer tests** for first import, repeated import skip, new-version replacement, transaction rollback, and preservation of unrelated TOEIC Listening rows.
- [ ] **Step 2: Run the importer tests** and verify they fail because no importer exists.
- [ ] **Step 3: Implement transactional set/item/media upsert.** Resolve existing set identity by `(source, source_set_id)`, delete only superseded dictation items for that set, create the new version, attach media metadata, and publish after validation.
- [ ] **Step 4: Preserve user history** by retaining attempts as immutable snapshots and mapping existing progress to the new item IDs only when source item IDs match; otherwise initialize progress cleanly without deleting historical attempts.
- [ ] **Step 5: Add CLI `pnpm --filter @repo/api data:import-toeic-dictation -- --approved-sha=$env:DICTATION_SHA`** using the existing dotenv/Prisma runtime boundary.
- [ ] **Step 6: Run importer tests and typecheck.** The expected summary for a successful first import is 40 updated sets, zero rejected/failed, and no duplicate rows on rerun.
- [ ] **Step 7: Commit** with `git add apps/api/scripts/toeic-dictation apps/api/package.json && git commit -m "feat(api): import TOEIC dictation 2026"`.

---

### Task 5: Add shared contracts, grading policy, and API module

**Files:**
- Create: `packages/shared/src/types/toeic-dictation.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/api/src/module/toeic-dictation/toeic-dictation.module.ts`
- Create: `apps/api/src/module/toeic-dictation/toeic-dictation.controller.ts`
- Create: `apps/api/src/module/toeic-dictation/toeic-dictation.mapper.ts`
- Create: `apps/api/src/module/toeic-dictation/dto/toeic-dictation.dto.ts`
- Create: `apps/api/src/module/toeic-dictation/use-cases/list-toeic-dictation-sets.use-case.ts`
- Create: `apps/api/src/module/toeic-dictation/use-cases/get-toeic-dictation-set.use-case.ts`
- Create: `apps/api/src/module/toeic-dictation/use-cases/get-toeic-dictation-progress.use-case.ts`
- Create: `apps/api/src/module/toeic-dictation/use-cases/submit-toeic-dictation.use-case.ts`
- Create: `apps/api/src/module/toeic-dictation/use-cases/save-toeic-dictation-progress.use-case.ts`
- Create: `apps/api/src/module/toeic-dictation/use-cases/get-toeic-dictation-media.use-case.ts`
- Create: `apps/api/src/module/toeic-dictation/toeic-dictation-grading.policy.ts`
- Create: `apps/api/src/module/toeic-dictation/tests/toeic-dictation-grading.policy.spec.ts`
- Create: `apps/api/src/module/toeic-dictation/tests/toeic-dictation.use-cases.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- `normalizeDictationText(value: string): string[]` returns canonical tokens.
- `gradeToeicDictation(expected: string, actual: string): ToeicDictationGrade` returns `accuracy`, `wordsCorrect`, `totalWords`, token feedback, and `mastered`.
- Shared DTOs include `ToeicDictationSetSummary`, `ToeicDictationItem`, `ToeicDictationProgress`, `ToeicDictationSubmitPayload`, and `ToeicDictationSubmitResult`.

- [ ] **Step 1: Write grading tests** for case/whitespace/punctuation normalization, missing/extra/mismatched words, empty input, 90% mastery, and retry idempotency.
- [ ] **Step 2: Run focused API tests** and verify failure before implementation.
- [ ] **Step 3: Implement grading as a pure policy** with ordered token alignment; do not expose canonical transcript from list/detail use cases.
- [ ] **Step 4: Implement list/detail/progress use cases** filtering to `PUBLISHED`, `Đề 2026`, free sets and checking user ownership for progress.
- [ ] **Step 5: Implement submit transaction.** Verify item/set/version, grade server-side, create-or-return the attempt by submission key, and upsert latest progress with mastered threshold.
- [ ] **Step 6: Implement media use case/controller** by reusing the existing path containment and byte-range response behavior without returning `source_url` or `storage_path`.
- [ ] **Step 7: Wire JWT guards, DTO validation, controller routes, and module registration.** Return stable 404/409/422 errors for unavailable set, stale version, and invalid submit.
- [ ] **Step 8: Run API focused tests and typecheck.** Verify an unauthenticated request is rejected and a second identical submission returns the original attempt.
- [ ] **Step 9: Commit** with `git add packages/shared/src apps/api/src/module/toeic-dictation apps/api/src/app.module.ts && git commit -m "feat(api): add TOEIC dictation API"`.

---

### Task 6: Add Listening mode tabs and dictation catalog UI

**Files:**
- Create: `apps/web/app/features/toeic-dictation/api/toeic-dictation.api.ts`
- Create: `apps/web/app/features/toeic-dictation/hooks/use-toeic-dictation.ts`
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationModeTabs.tsx`
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationListSkeleton.tsx`
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationSetCard.tsx`
- Create: `apps/web/app/views/toeic-listening/ToeicDictationListView.tsx`
- Modify: `apps/web/app/views/toeic-listening/ToeicListeningListView.tsx`
- Modify: `apps/web/app/features/toeic-listening/components/ToeicListeningScopeTabs.tsx`
- Modify: `apps/web/app/[locale]/(main)/learn/cert/toeic/listening/page.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Create: `apps/web/app/features/toeic-dictation/tests/toeic-dictation.api.test.ts`

**Interfaces:**
- `createToeicDictationApi(http)` mirrors the existing `createToeicListeningApi` factory and exposes `overview`, `sets`, `set`, `progress`, `submit`, and `media`.
- `ToeicDictationListView` receives no server-only state; it reads `mode` from the page and React Query handles authenticated data.

- [ ] **Step 1: Write API factory tests** for query paths, mode-preserving links, and submit payloads.
- [ ] **Step 2: Run the focused web test** and verify the new factory is missing.
- [ ] **Step 3: Implement shared dictation types/hooks/API factory** using the existing `webHttpClient` and query-key conventions.
- [ ] **Step 4: Implement localized mode tabs** so `mode=level` preserves the existing `scope` query and `mode=dictation` opens the 2026 catalog.
- [ ] **Step 5: Implement the catalog cards** with Test/Part filters, sorted Test then Part order, counts, correct/incorrect/unanswered chips, progress bar, and Start/Continue actions.
- [ ] **Step 6: Add loading, empty, auth-error, and retry states** using a dictation-specific skeleton rather than the general Listening skeleton.
- [ ] **Step 7: Add English/Vietnamese messages** for tabs, catalog labels, progress, auth requirement, and errors; keep both locale key sets in parity.
- [ ] **Step 8: Run focused web tests, typecheck, and lint.** Confirm existing `mode=level` navigation snapshots/route tests remain green.
- [ ] **Step 9: Commit** with `git add apps/web/app/features/toeic-dictation apps/web/app/views/toeic-listening apps/web/app/[locale]/(main)/learn/cert/toeic/listening/page.tsx apps/web/app/messages && git commit -m "feat(web): add TOEIC dictation catalog"`.

---

### Task 7: Add one-item dictation session and backend progress restore

**Files:**
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationPlayer.tsx`
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationAnswerForm.tsx`
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationFeedback.tsx`
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationSessionSkeleton.tsx`
- Create: `apps/web/app/features/toeic-dictation/toeic-dictation-session-state.ts`
- Create: `apps/web/app/views/toeic-listening/ToeicDictationSessionView.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/dictation/sets/[setId]/page.tsx`
- Modify: `apps/web/app/features/toeic-dictation/hooks/use-toeic-dictation.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Create: `apps/web/app/features/toeic-dictation/tests/toeic-dictation-session-state.test.ts`

**Interfaces:**
- `createToeicDictationSessionState(items, progress)` restores the first unanswered item or the saved active item.
- `submit(itemId, typedText, submissionKey)` calls the backend and returns word-level feedback without placing the canonical transcript in browser state before submission.
- `saveProgress(setId, activeItemId)` debounces a backend `PUT`; it is flushed before route changes and from a `visibilitychange` handler when the document becomes hidden.

- [ ] **Step 1: Write session-state tests** for restore, next/previous, answered/mastered counts, and progress payload generation.
- [ ] **Step 2: Run focused session tests** and verify missing state functions fail.
- [ ] **Step 3: Implement pure session state** with item ordering from the API and progress restoration from backend data.
- [ ] **Step 4: Implement the audio player** using the opaque media endpoint, explicit play/pause/replay, duration display, and accessible keyboard controls.
- [ ] **Step 5: Implement the answer form and feedback.** Disable duplicate submit, show loading/error states, reveal transcript/translation only from the submit response, and mark mastery at 90%.
- [ ] **Step 6: Implement debounced backend progress saves** with retry state and local interactive-state preservation on network failure; do not write dictation progress to localStorage.
- [ ] **Step 7: Add route links and session error/auth states** so unauthenticated users are redirected by the existing auth boundary and stale versions show a recoverable conflict.
- [ ] **Step 8: Run focused tests, typecheck, and lint.** Verify reload on another authenticated browser restores the backend progress.
- [ ] **Step 9: Commit** with `git add apps/web/app/features/toeic-dictation apps/web/app/views/toeic-listening apps/web/app/[locale]/(session)/toeic/dictation apps/web/app/messages && git commit -m "feat(web): add TOEIC dictation session"`.

---

### Task 8: Verify, document operations, and enable the 2026 rollout

**Files:**
- Create: `docs/guides/toeic-dictation-2026-operations.md`
- Create: `apps/api/src/module/toeic-dictation/tests/toeic-dictation.module.spec.ts`
- Modify: `docs/features-overview.md`

- [ ] **Step 1: Add module/route architecture tests** ensuring the dictation module is registered and the page remains a thin server component.
- [ ] **Step 2: Run the operator inventory command** and record the approved SHA, item count, audio count, and media size in the operations guide without recording tokens.
- [ ] **Step 3: Run download and validation** from the approved SHA; stop if any set is Pro/hidden, media is missing, or validation is invalid.
- [ ] **Step 4: Apply the migration explicitly** with `pnpm --filter @repo/api db:migrate:deploy`, then run the idempotent importer with the approved SHA.
- [ ] **Step 5: Run the complete verification suite:** `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`; expected result is zero failures.
- [ ] **Step 6: Smoke test Test 1 Part 1–4:** catalog, audio, submit, word-level feedback, refresh, progress restore, and mode-tab navigation; verify existing level Listening still works.
- [ ] **Step 7: Commit documentation** with `git add docs/guides/toeic-dictation-2026-operations.md docs/features-overview.md apps/api/src/module/toeic-dictation/tests && git commit -m "docs: operate TOEIC dictation 2026"`.
- [ ] **Step 8: Review `git diff`, migration status, and package inventory** before enabling the published tab in the target environment.

---

## Plan Self-Review

- **Spec coverage:** source filtering, inventory/download/validation, private media, dedicated domain, authenticated API, server grading, 90% mastery, mode tabs, catalog/session UI, progress restore, i18n, security, tests, and rollout are covered by Tasks 1–8.
- **Placeholder scan:** no `TBD`, `TODO`, or unspecified “handle edge cases” steps are present; every task names files, interfaces, commands, and expected verification.
- **Type consistency:** shared dictation DTO names are introduced in Task 5 before the web API/hooks in Task 6; grading and progress methods are defined before submit/session consumers in Tasks 5 and 7.
- **Scope check:** acquisition, persistence/API, and UI remain separate checkpoints but are one vertical feature with independently testable deliverables.
