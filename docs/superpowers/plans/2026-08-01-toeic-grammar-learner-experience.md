# TOEIC Grammar Learner Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver authenticated, server-graded TOEIC Grammar catalog and single-question practice across topic, subtopic, mixed-set, and difficulty views.

**Architecture:** Shared owns JSON-safe wire types; `module/toeic-grammar` owns Prisma-backed catalog, safe practice reads, and transactional grading. Web follows localized route → view → feature hook → resource API → Auth transport, with backend progress and no answer key in initial payloads.

**Tech Stack:** NestJS, Prisma/PostgreSQL, class-validator, Next.js App Router, React Query, next-intl, Tailwind CSS, Node test runner.

## Global Constraints

- Correctness and correct-option data remain server-owned until a submitted answer is graded.
- Grammar progress is account-scoped and never stored in `localStorage`.
- Source difficulty 1–5 is not labeled as CEFR.
- Missing enrichment remains empty and never triggers AI or provider calls.
- Routes preserve the active locale and route `page.tsx` files remain thin.
- Database migration application is an explicit operator action, not a test or build step.

---

### Task 1: Shared learner-safe Grammar interface

**Files:**
- Create: `packages/shared/src/types/toeic-grammar.ts`
- Modify: `packages/shared/src/types/index.ts`
- Test: `packages/shared/test/toeic-grammar-interface.test.ts`

**Interfaces:**
- Produces: `ToeicGrammarPracticeMode`, `ToeicGrammarCatalog`, `ToeicGrammarPractice`, `ToeicGrammarAnswerPayload`, and `ToeicGrammarAnswerResult` from root `@repo/shared`.

- [ ] **Step 1: Write the failing root-interface test**

Assert the shared index exports the Grammar file, the file has no Prisma/Nest/React imports, and all four modes type-check.

```ts
const modes: ToeicGrammarPracticeMode[] = [
  "topic",
  "subtopic",
  "set",
  "level",
];
assert.equal(modes.length, 4);
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @repo/shared exec tsx --test test/toeic-grammar-interface.test.ts`

Expected: FAIL because the interface does not exist.

- [ ] **Step 3: Implement minimal wire types**

Catalog summaries contain `questionCount`, `correctCount`, `incorrectCount`, and `unansweredCount`. Learner questions expose option `id`, `label`, and `text` only. Grading result owns correct option, translations, explanations, vocabulary, and updated progress.

```ts
export type ToeicGrammarPracticeMode =
  | "topic"
  | "subtopic"
  | "set"
  | "level";

export type ToeicGrammarAnswerPayload = {
  submissionKey: string;
  snapshotVersion: string;
  mode: ToeicGrammarPracticeMode;
  target: string;
  questionId: number;
  selectedOptionId: number;
};
```

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @repo/shared exec tsx --test test/toeic-grammar-interface.test.ts && pnpm --filter @repo/shared check-types`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared/src/types/toeic-grammar.ts packages/shared/src/types/index.ts packages/shared/test/toeic-grammar-interface.test.ts
git commit -m "feat(shared): define TOEIC grammar learner interface"
```

### Task 2: Grammar progress persistence

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801080000_add_toeic_grammar_progress/migration.sql`
- Test: `apps/api/src/module/toeic-grammar/tests/toeic-grammar-persistence.test.ts`

**Interfaces:**
- Consumes: imported source question identity.
- Produces: immutable `grammar_question_attempts` and current `grammar_question_progress`.

- [ ] **Step 1: Write a failing persistence test**

Assert unique `(user_id, submission_key)` and `(user_id, source, source_question_id)` identities, text snapshots, practice context, counters, and user cascade behavior.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-grammar/tests/toeic-grammar-persistence.test.ts`

Expected: FAIL because learner tables are absent.

- [ ] **Step 3: Add Prisma models and migration**

Use source identity rather than a foreign key to replaceable question rows.

```prisma
@@unique([user_id, submission_key], map: "grammar_attempts_user_submission_key")
@@unique([user_id, source, source_question_id], map: "grammar_progress_user_source_question_key")
```

- [ ] **Step 4: Generate Prisma and run GREEN**

Run: `pnpm --filter @repo/api db:generate && pnpm --filter @repo/api exec tsx --test src/module/toeic-grammar/tests/toeic-grammar-persistence.test.ts`

Expected: PASS. Do not deploy the migration.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260801080000_add_toeic_grammar_progress/migration.sql apps/api/src/module/toeic-grammar/tests/toeic-grammar-persistence.test.ts
git commit -m "feat(api): persist TOEIC grammar progress"
```

### Task 3: Learner-safe catalog and practice reads

**Files:**
- Create: `apps/api/src/module/toeic-grammar/toeic-grammar.collection.ts`
- Create: `apps/api/src/module/toeic-grammar/toeic-grammar.mapper.ts`
- Create: `apps/api/src/module/toeic-grammar/use-cases/get-toeic-grammar-catalog.use-case.ts`
- Create: `apps/api/src/module/toeic-grammar/use-cases/get-toeic-grammar-practice.use-case.ts`
- Test: `apps/api/src/module/toeic-grammar/tests/get-toeic-grammar-catalog.use-case.spec.ts`
- Test: `apps/api/src/module/toeic-grammar/tests/get-toeic-grammar-practice.use-case.spec.ts`

**Interfaces:**
- Produces: `execute(userId)` catalog and `execute(userId, mode, target)` safe practice collection.

- [ ] **Step 1: Write failing catalog tests**

Cover active snapshot only, ordered catalog, unique-question progress intersections, and no-active-snapshot behavior.

- [ ] **Step 2: Write failing practice safety tests**

Cover all four modes, first unanswered index, stable ordering, exact option projection, and absence of `correct`/correct option IDs.

- [ ] **Step 3: Run RED**

Run both spec files with `pnpm --filter @repo/api exec tsx --test`.

Expected: FAIL because use cases do not exist.

- [ ] **Step 4: Implement the collection policy, mapper, and use cases**

Keep membership selection in one pure policy shared with grading. Explicitly map safe options:

```ts
options: row.grammar_question_options.map(({ id, label, text }) => ({
  id,
  label,
  text,
}))
```

- [ ] **Step 5: Run GREEN and type check**

Run both spec files, then `pnpm --filter @repo/api check-types`.

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/module/toeic-grammar
git commit -m "feat(api): expose TOEIC grammar learner reads"
```

### Task 4: Transactional grading and HTTP delivery

**Files:**
- Create: `apps/api/src/module/toeic-grammar/dto/toeic-grammar.dto.ts`
- Create: `apps/api/src/module/toeic-grammar/use-cases/submit-toeic-grammar-answer.use-case.ts`
- Create: `apps/api/src/module/toeic-grammar/toeic-grammar.controller.ts`
- Create: `apps/api/src/module/toeic-grammar/toeic-grammar.module.ts`
- Create: `apps/api/src/module/toeic-grammar/index.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `docs/architecture/api.md`
- Test: `apps/api/src/module/toeic-grammar/tests/submit-toeic-grammar-answer.use-case.spec.ts`
- Test: `apps/api/src/module/toeic-grammar/tests/toeic-grammar.controller.spec.ts`

**Interfaces:**
- Produces: authenticated `GET /toeic/grammar/catalog`, `GET /toeic/grammar/practice`, and `POST /toeic/grammar/answers`.

- [ ] **Step 1: Write failing grading tests**

Cover option ownership, collection membership, snapshot conflict, immutable snapshots, aggregate upsert, identical retry, and conflicting idempotency-key reuse.

- [ ] **Step 2: Write failing controller tests**

Assert prefix, guard, actor forwarding, query validation, UUID validation, and delegation.

- [ ] **Step 3: Run RED**

Run both new spec files. Expected: FAIL.

- [ ] **Step 4: Implement DTOs, transaction, controller, and module**

Validate before writing. Insert/reuse the attempt and upsert progress atomically. Return enrichment only after grading. Register the module and update API architecture.

- [ ] **Step 5: Run complete Grammar API tests**

Run: `pnpm --filter @repo/api exec tsx --test "src/module/toeic-grammar/tests/*.test.ts" "src/module/toeic-grammar/tests/*.spec.ts"`, API architecture check, and API type check.

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/module/toeic-grammar apps/api/src/app.module.ts docs/architecture/api.md
git commit -m "feat(api): grade TOEIC grammar practice"
```

### Task 5: Web Grammar data layer and URL state

**Files:**
- Create: `apps/web/app/features/toeic-grammar/api/toeic-grammar.api.ts`
- Create: `apps/web/app/features/toeic-grammar/hooks/use-toeic-grammar.ts`
- Create: `apps/web/app/features/toeic-grammar/toeic-grammar-route.ts`
- Create: `apps/web/app/features/toeic-grammar/toeic-grammar-session-state.ts`
- Test: `apps/web/app/features/toeic-grammar/tests/toeic-grammar.api.test.ts`
- Test: `apps/web/app/features/toeic-grammar/tests/toeic-grammar-route.test.ts`
- Test: `apps/web/app/features/toeic-grammar/tests/toeic-grammar-session-state.test.ts`

**Interfaces:**
- Produces: resource keys/API, React Query hooks, URL parser, and single-question state helpers.

- [ ] **Step 1: Write failing API tests**

Assert exact paths, mode/target cache keys, body passthrough, retry key reuse, and no `localStorage`.

- [ ] **Step 2: Write failing route/state tests**

Assert valid tabs/modes, level bounds, first-unanswered initialization, navigation, pending lock, feedback retention, and retry.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-grammar/tests/*.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement APIs, hooks, parsers, and state**

Invalidate catalog/practice after grading. Generate one UUID per deliberate selection and retain it for retries.

- [ ] **Step 5: Run GREEN and Web type check**

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/app/features/toeic-grammar
git commit -m "feat(web): add TOEIC grammar data flow"
```

### Task 6: Catalog UI and Reading mode switch

**Files:**
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarCatalogTabs.tsx`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarProgressCard.tsx`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarCatalogSkeleton.tsx`
- Create: `apps/web/app/views/toeic-grammar/ToeicGrammarCatalogView.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/reading/grammar/page.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/reading/grammar/loading.tsx`
- Create: `apps/web/app/features/toeic-reading/components/ToeicReadingModeTabs.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicReadingListView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Test: `apps/web/test/toeic-grammar-catalog-architecture.test.ts`
- Test: `apps/web/app/features/toeic-grammar/tests/toeic-grammar-messages.test.ts`

- [ ] **Step 1: Write failing architecture and i18n tests**

Assert thin routes, feature/view ownership, dedicated skeleton, localized links, key parity, no hard-coded learner copy, and Reading mode switch.

- [ ] **Step 2: Run RED**

Run the two focused Web tests. Expected: FAIL.

- [ ] **Step 3: Implement catalog presentation**

Use the current emerald TOEIC language, expandable topics, consistent set/level cards, non-color progress labels, actions, retry/empty states, and URL-backed tabs.

- [ ] **Step 4: Run GREEN, type check, and lint**

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/app/features/toeic-grammar apps/web/app/views/toeic-grammar apps/web/app/[locale]/(main)/learn/cert/toeic/reading/grammar apps/web/app/features/toeic-reading/components/ToeicReadingModeTabs.tsx apps/web/app/views/toeic-reading/ToeicReadingListView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test/toeic-grammar-catalog-architecture.test.ts
git commit -m "feat(web): browse TOEIC grammar practice"
```

### Task 7: Single-question practice UI

**Files:**
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarQuestion.tsx`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarFeedback.tsx`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarNavigator.tsx`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarPracticeSkeleton.tsx`
- Create: `apps/web/app/views/toeic-grammar/ToeicGrammarPracticeView.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/grammar/practice/page.tsx`
- Create: `apps/web/app/[locale]/(session)/toeic/grammar/practice/loading.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `docs/architecture/frontend.md`
- Test: `apps/web/test/toeic-grammar-practice-architecture.test.ts`

- [ ] **Step 1: Write failing practice architecture test**

Assert thin route, safe options, sticky header/footer, navigator semantics, duplicate-submission lock, same-key retry, answer-result-only feedback, and no `localStorage`.

- [ ] **Step 2: Run RED**

Run the focused architecture test. Expected: FAIL.

- [ ] **Step 3: Implement focused practice**

Render one question. Submit on selection, lock pending, retain UUID for retry, communicate feedback with icon/text/border, conditionally render enrichment, and use a sticky bottom navigation bar.

- [ ] **Step 4: Run Web feature gates**

Run the architecture test, all Grammar feature tests, Web architecture check, type check, and lint.

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/app/features/toeic-grammar apps/web/app/views/toeic-grammar apps/web/app/[locale]/(session)/toeic/grammar/practice apps/web/app/messages/en.json apps/web/app/messages/vi.json docs/architecture/frontend.md apps/web/test/toeic-grammar-practice-architecture.test.ts
git commit -m "feat(web): practice TOEIC grammar questions"
```

### Task 8: Verification and operator handoff

- [ ] **Step 1: Run complete feature gates**

Run Shared type check, all API Grammar tests, all Web Grammar tests, and API/Web architecture checks.

- [ ] **Step 2: Run repository gates**

Run the complete sequence in `docs/guides/verification.md`: architecture, test, standalone vocabulary workflow, type check, lint, build, and docs Prettier.

- [ ] **Step 3: Inspect the change set**

Run `git diff --check` and `git status --short`. Confirm private snapshots, credentials, generated outputs, and `.env` are not staged.

- [ ] **Step 4: Provide explicit operator smoke steps**

Ask the operator to run:

```powershell
pnpm --filter @repo/api db:migrate:deploy
pnpm dev
```

Smoke Catalog → collection → answer → feedback → reload → account progress. Do not deploy the migration during automated verification.

