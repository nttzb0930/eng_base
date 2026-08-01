# TOEIC Grammar Lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add checksum-versioned Grammar lessons and an authenticated learner detail screen with lesson and practice tabs.

**Architecture:** Extend the existing Grammar snapshot rather than creating a second content lifecycle. API exposes one safe subtopic-detail resource; Web composes that resource with the existing subtopic practice session and never renders source HTML.

**Tech Stack:** TypeScript, Zod, Prisma/PostgreSQL, NestJS, Next.js App Router, React Query, next-intl, Tailwind CSS, Node test runner.

## Global Constraints

- Never expose answer correctness through the lesson endpoint.
- Never render source HTML with `dangerouslySetInnerHTML`.
- Never call the source at learner request time.
- Keep downloaded content under ignored `var/licensed-content/dautoeic`.
- Database migration and snapshot import are explicit operator actions.
- Preserve unrelated dirty-worktree changes.

---

### Task 1: Version the canonical lesson snapshot

**Files:**

- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.types.ts`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.canonical.ts`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.canonical.test.ts`

**Interfaces:** Produces `ToeicGrammarLesson` and schema-version-2 `ToeicGrammarSnapshot.lessons`.

- [ ] Write a failing canonical test with one lesson linked to one subtopic and assert deterministic normalization.
- [ ] Run `pnpm --filter @repo/api exec tsx --test scripts/toeic-grammar/toeic-grammar.canonical.test.ts`; expect failure because lessons are unsupported.
- [ ] Add lesson types, Zod parsing, deterministic ordering, unique source identity, known-subtopic validation, and a non-empty supported-content invariant.
- [ ] Add failing tests for duplicate lesson IDs, unknown subtopics, and empty content; make them pass.
- [ ] Re-run the focused canonical test.

### Task 2: Acquire lessons through the approved pipeline

**Files:**

- Modify: `apps/api/scripts/toeic-grammar/dautoeic-grammar-source.ts`
- Modify: `apps/api/scripts/toeic-grammar/dautoeic-grammar-source.test.ts`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.inventory.ts`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.inventory.test.ts`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.download.ts`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.download.test.ts`

**Interfaces:** Adds `readLessons(sourceSubtopicIds: string[]): Promise<ToeicGrammarLesson[]>`; inventory records approved lesson identities and download writes them into the canonical snapshot.

- [ ] Write failing source tests for lesson row mapping and for stripping an optional `Bearer ` prefix from the access-token file value.
- [ ] Verify RED with the focused source test.
- [ ] Implement authenticated batched `/rest/v1/lessons` reads, safe field normalization, and authorization normalization.
- [ ] Write failing inventory/download tests proving lesson identity approval and rejection of extra downloaded identities.
- [ ] Add lesson inventory metadata and snapshot assembly, then run all Grammar script tests.

### Task 3: Persist lessons atomically

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260801090000_add_toeic_grammar_lessons/migration.sql`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.prisma-store.ts`
- Modify: `apps/api/scripts/toeic-grammar/toeic-grammar.prisma-store.test.ts`
- Modify: `docs/guides/licensed-toeic-grammar-operations.md`

**Interfaces:** Adds `grammar_lessons` owned by `grammar_content_snapshots` and `grammar_subtopics`.

- [ ] Write a failing Prisma-store test asserting lesson create data and snapshot activation order.
- [ ] Verify RED with the focused Prisma-store test.
- [ ] Add the Prisma model/migration and import lesson rows after subtopics and before snapshot activation.
- [ ] Run Prisma generation, focused store tests, and API typecheck without applying the migration.
- [ ] Document that a new inventory/download/import is required to populate lessons.

### Task 4: Expose learner-safe subtopic detail

**Files:**

- Modify: `packages/shared/src/types/toeic-grammar.ts`
- Modify: `packages/shared/test/toeic-grammar-interface.test.ts`
- Create: `apps/api/src/module/toeic-grammar/use-cases/get-toeic-grammar-subtopic.use-case.ts`
- Create: `apps/api/src/module/toeic-grammar/tests/get-toeic-grammar-subtopic.use-case.spec.ts`
- Modify: `apps/api/src/module/toeic-grammar/toeic-grammar.controller.ts`
- Modify: `apps/api/src/module/toeic-grammar/toeic-grammar.module.ts`

**Interfaces:** Produces `ToeicGrammarSubtopicDetail` and `GET /toeic/grammar/subtopics/:target`.

- [ ] Write failing Shared and use-case tests for ordered lesson blocks, learner progress, 404, and absence of HTML/answer keys.
- [ ] Verify both tests fail for missing interfaces.
- [ ] Add the root-exported wire types and Prisma-backed use case.
- [ ] Register a static authenticated controller route using `@Param("target")`.
- [ ] Run focused Shared/API tests and typechecks.

### Task 5: Add the localized lesson detail experience

**Files:**

- Modify: `apps/web/app/features/toeic-grammar/api/toeic-grammar.api.ts`
- Modify: `apps/web/app/features/toeic-grammar/hooks/use-toeic-grammar.ts`
- Modify: `apps/web/app/features/toeic-grammar/components/ToeicGrammarProgressCard.tsx`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarLessonContent.tsx`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarLessonSkeleton.tsx`
- Create: `apps/web/app/views/toeic-grammar/ToeicGrammarLessonView.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/reading/grammar/[subtopicId]/page.tsx`
- Create: `apps/web/app/[locale]/(main)/learn/cert/toeic/reading/grammar/[subtopicId]/loading.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `apps/web/app/features/toeic-grammar/tests/toeic-grammar.api.test.ts`
- Modify: `apps/web/app/features/toeic-grammar/tests/toeic-grammar-messages.test.ts`
- Modify: `apps/web/test/toeic-grammar-practice-architecture.test.ts`

**Interfaces:** Adds `toeicGrammarKeys.subtopic(target)`, `toeicGrammarApi.subtopic(target)`, `useToeicGrammarSubtopic(target)`, and localized detail route.

- [ ] Write failing API, message-parity, route-thinness, and safe-rendering tests.
- [ ] Verify the tests fail because the detail resource and route do not exist.
- [ ] Implement the resource adapter/hook, safe text/structured rendering, two URL-backed tabs, retry/empty states, and page-specific skeleton.
- [ ] Change subtopic card navigation to the detail route while preserving aggregate topic/set/level practice links.
- [ ] Run focused Web tests, typecheck, lint, and production build.

### Task 6: Canonical documentation and full verification

**Files:**

- Modify: `CONTEXT.md`
- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`

- [ ] Update canonical ownership and learner API/UI descriptions.
- [ ] Run `pnpm architecture:check`, `pnpm test`, `pnpm check-types`, `pnpm lint`, and `pnpm build` sequentially.
- [ ] Run documentation formatting, `git diff --check`, and inspect `git status --short` for secrets/generated artifacts.
- [ ] Report the explicit operator commands for migration, fresh inventory/download validation, and import; do not execute database writes.
