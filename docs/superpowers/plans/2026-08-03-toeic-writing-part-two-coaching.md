# TOEIC Writing Part Two Coaching Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver bilingual TOEIC Writing Part 2 email practice with lazy, server-tracked outline, vocabulary, sample, and community coaching panels before AI grading is added.

**Architecture:** Keep the public task detail limited to the email prompt and stable requirements. Return authored coaching content from dedicated authenticated endpoints, record assistance server-side, and render panels inside the existing autosaved Writing workspace.

**Tech Stack:** NestJS 11, Prisma/PostgreSQL, Next.js 16, React Query, next-intl, shadcn UI, Node test runner.

## Global Constraints

- Part 2 responses contain 50–300 words for grading readiness and at most 2,200 characters.
- English content is rendered first and Vietnamese translation below in both locales.
- Outline, vocabulary, and sample data are loaded only when opened.
- Opening authored help is recorded by the API; the browser cannot clear or forge the assistance snapshot.
- Community contains only explicit opt-in submissions and never exposes private drafts or grades.
- Author and test community migration SQL, but do not apply it to the learner's database without an explicit migration checkpoint.
- Keep task `page.tsx` files thin and all browser state under the existing view/feature folders.
- Use TDD and commit after every task.

---

### Task 1: Coaching contracts and assistance endpoints

**Files:**

- Modify: `packages/shared/src/types/toeic-writing.ts`
- Modify: `apps/api/src/module/toeic-writing/dto/toeic-writing.dto.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/get-toeic-writing-coaching.use-case.ts`
- Modify: `apps/api/src/module/toeic-writing/use-cases/record-toeic-writing-assistance.use-case.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.module.ts`
- Test: `apps/api/src/module/toeic-writing/tests/toeic-writing-coaching.use-cases.spec.ts`
- Modify: `apps/api/src/module/toeic-writing/tests/toeic-writing.controller.spec.ts`

**Interfaces:**

- Produces: `GET /toeic/writing/tasks/:taskId/coaching/:kind` and an owned assistance snapshot.

- [ ] **Step 1: Write failing use-case tests**

Cover published Part 2 ownership, Part 1 rejection, `OUTLINE`, `VOCABULARY`, and `SAMPLE` mapping, assistance recording before response, missing content as an empty typed panel, and content-version conflict.

```ts
test("records SAMPLE assistance before returning authored content", async () => {
  const result = await useCase.execute("learner-1", 22, "SAMPLE", version);
  assert.equal(repository.recorded[0]?.kind, "SAMPLE");
  assert.equal(result.kind, "SAMPLE");
  assert.equal(result.sampleEn.length > 0, true);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-coaching.use-cases.spec.ts`

Expected: FAIL because contracts/use cases do not exist.

- [ ] **Step 3: Add shared discriminated contracts**

```ts
export type ToeicWritingCoachingKind = "OUTLINE" | "VOCABULARY" | "SAMPLE";

export type ToeicWritingPartTwoCoaching =
  | {
      kind: "OUTLINE";
      variants: Array<{ level: 1 | 2; sections: ToeicWritingOutlineSection[] }>;
    }
  | {
      kind: "VOCABULARY";
      variants: Array<{ level: 1 | 2; items: ToeicWritingVocabularyPattern[] }>;
    }
  | {
      kind: "SAMPLE";
      sampleEn: string;
      sampleVi: string | null;
      structure: ToeicWritingSampleSection[];
    };
```

Reuse the `ToeicWritingAssistanceSnapshot` introduced by the Part 1 plan; it already contains `outlineViewed`, `vocabularyViewed`, `sampleViewed`, and `communityAnswerRestored`. Extend the existing assistance use case from `SAMPLE` to `OUTLINE | VOCABULARY | SAMPLE | COMMUNITY_RESTORE`; do not create a second recorder or a second snapshot type.

- [ ] **Step 4: Implement mapping and assistance use cases**

Read the already imported `outlineLevel1/2`, `chunksLevel1/2`, `sampleEn/Vi`, and requirements from the task payload. Parse outline entries into stable `OPENING`, `BODY`, and `ENDING` sections without generating new content.

- [ ] **Step 5: Add controller route and DTO validation**

Validate `kind` with `@IsIn`, require the SHA-256 content version query, and return stable stale-content and wrong-part errors.

- [ ] **Step 6: Run API verification**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-coaching.use-cases.spec.ts src/module/toeic-writing/tests/toeic-writing.controller.spec.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add packages/shared/src/types/toeic-writing.ts apps/api/src/module/toeic-writing
git commit -m "feat(api): expose TOEIC Writing email coaching"
```

---

### Task 2: Community sharing and owned listing

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260803150000_add_toeic_writing_community/migration.sql`
- Modify: `packages/shared/src/types/toeic-writing.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/share-toeic-writing-submission.use-case.ts`
- Create: `apps/api/src/module/toeic-writing/use-cases/list-toeic-writing-community.use-case.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.controller.ts`
- Modify: `apps/api/src/module/toeic-writing/toeic-writing.module.ts`
- Test: `apps/api/src/module/toeic-writing/tests/toeic-writing-community.use-cases.spec.ts`

**Interfaces:**

- Produces: explicit share/unshare and paginated task community APIs.

- [ ] **Step 1: Write failing community tests**

Cover owner-only share, unshare, private-by-default, published-task filtering, no email/username leakage, stable masked display name, pagination limit 20, and restore recording as assistance.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-community.use-cases.spec.ts`

Expected: FAIL.

- [ ] **Step 3: Add migration and schema**

Add nullable sharing fields to `toeic_writing_submissions`:

```text
shared_at timestamp
share_revoked_at timestamp
```

Index `(task_id, shared_at)` with active rows filtered in queries. This release exposes only the explicitly shared response text and masked author label; it never exposes private AI feedback, drafts, email, username, or grade metadata.

- [ ] **Step 4: Implement use cases and routes**

```text
PUT    /toeic/writing/submissions/:submissionId/share
DELETE /toeic/writing/submissions/:submissionId/share
GET    /toeic/writing/tasks/:taskId/community?cursor=120&limit=20
POST   /toeic/writing/tasks/:taskId/community/:submissionId/restore
```

The restore route returns response text only after recording `COMMUNITY_RESTORE` assistance for the requesting user/task/version.

- [ ] **Step 5: Generate Prisma and run tests**

Run:

```powershell
pnpm --filter @repo/api exec prisma generate
pnpm --filter @repo/api exec tsx --test src/module/toeic-writing/tests/toeic-writing-community.use-cases.spec.ts
pnpm --filter @repo/api check-types
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/prisma packages/shared/src/types/toeic-writing.ts apps/api/src/module/toeic-writing
git commit -m "feat(api): share TOEIC Writing submissions"
```

---

### Task 3: Part 2 coaching API client and hooks

**Files:**

- Modify: `apps/web/app/features/toeic-writing/api/toeic-writing.api.ts`
- Modify: `apps/web/app/features/toeic-writing/hooks/use-toeic-writing.ts`
- Modify: `apps/web/app/features/toeic-writing/tests/toeic-writing.api.test.ts`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-coaching-state.test.ts`

**Interfaces:**

- Consumes: coaching/community APIs from Tasks 1–2.
- Produces: lazy queries and explicit community mutations.

- [ ] **Step 1: Write failing API tests**

Assert exact URL encoding for coaching kind/version, disabled queries until a panel opens, separate query keys per task/version/kind, cursor pagination, share/unshare, and restore.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing.api.test.ts app/features/toeic-writing/tests/toeic-writing-coaching-state.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement API methods**

```ts
coaching(taskId: number, version: string, kind: ToeicWritingCoachingKind): Promise<ToeicWritingPartTwoCoaching>;
community(taskId: number, cursor?: number): Promise<ToeicWritingCommunityPage>;
share(submissionId: number): Promise<void>;
unshare(submissionId: number): Promise<void>;
restoreCommunity(taskId: number, submissionId: number, version: string): Promise<{ responseText: string }>;
```

- [ ] **Step 4: Implement React Query hooks**

Use `enabled: open` for coaching queries. Cache authored content per task/version. Community restore writes into the existing editor state only after user confirmation when local text is non-empty.

- [ ] **Step 5: Run web tests and type-check**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing.api.test.ts app/features/toeic-writing/tests/toeic-writing-coaching-state.test.ts
pnpm --filter @repo/web check-types
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/app/features/toeic-writing/api apps/web/app/features/toeic-writing/hooks apps/web/app/features/toeic-writing/tests
git commit -m "feat(web): connect TOEIC Writing email coaching"
```

---

### Task 4: Responsive Part 2 editor and panels

**Files:**

- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingPartTwoWorkspace.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingOutlinePanel.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingVocabularyPanel.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingSamplePanel.tsx`
- Create: `apps/web/app/features/toeic-writing/components/ToeicWritingCommunityPanel.tsx`
- Modify: `apps/web/app/features/toeic-writing/components/ToeicWritingEditorPane.tsx`
- Modify: `apps/web/app/features/toeic-writing/components/ToeicWritingPromptPane.tsx`
- Modify: `apps/web/app/views/toeic-writing/ToeicWritingSessionView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/frontend.md`
- Create: `apps/web/app/features/toeic-writing/tests/toeic-writing-part-two-ui.test.ts`

**Interfaces:**

- Produces: the full Part 2 coaching workspace without AI grading.

- [ ] **Step 1: Write failing UI behavior tests**

Cover English-before-Vietnamese prompt, 50/300 word readiness, 2,200 character cap, lazy panel opening, Bài 1/Bài 2 switching, outline sections, vocabulary examples, sample structure/bilingual toggles, community restore confirmation, and mobile stacked layout class contracts.

- [ ] **Step 2: Run UI test and verify RED**

Run: `pnpm --filter @repo/web exec tsx --test app/features/toeic-writing/tests/toeic-writing-part-two-ui.test.ts`

Expected: FAIL.

- [ ] **Step 3: Split the existing generic workspace by Part**

Keep autosave/navigation in `ToeicWritingSessionView`; delegate task-specific content to `ToeicWritingPartTwoWorkspace`. Do not duplicate the autosave queue or draft state.

- [ ] **Step 4: Implement authored panels**

Use shadcn buttons, tabs, accordion/collapsible, checkbox, and badges with `rounded-md`. Render:

```text
Outline: Bài 1/Bài 2 -> Opening/Body/Ending
Vocabulary: pattern EN -> meaning VI -> example EN -> example VI
Sample: email EN -> email VI, optional structure labels
Community: opt-in cards -> restore action
```

- [ ] **Step 5: Implement editor limits and sticky action footer**

Count whitespace-delimited words, refuse state updates that exceed 300 words or 2,200 characters, display a non-destructive limit message, and keep draft save available below 50 words. This coaching deliverable has no grading action; `2026-08-03-toeic-writing-part-two-ai.md` adds that action after the coaching APIs and panels pass verification.

- [ ] **Step 6: Add complete locale messages**

Mirror keys under `toeicWriting.partTwoCoaching` in both message files. English and Vietnamese content order is a rendering rule, not a locale conditional.

Update `docs/architecture/api.md` with authenticated lazy coaching endpoints, server-recorded assistance, and explicit community sharing boundaries. Update `docs/architecture/frontend.md` with the Part 2 coaching workspace, English-before-Vietnamese rule, lazy panels, and community restore confirmation.

- [ ] **Step 7: Run full web verification**

Run:

```powershell
pnpm --filter @repo/web test
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/app/features/toeic-writing apps/web/app/views/toeic-writing apps/web/app/messages docs/architecture/api.md docs/architecture/frontend.md
git commit -m "feat(web): add TOEIC Writing email coaching panels"
```
