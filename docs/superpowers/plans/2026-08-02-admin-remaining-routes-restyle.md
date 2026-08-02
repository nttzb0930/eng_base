# Admin Remaining Routes Restyle and Visual QA Plan

> **For Codex:** Execute after the Course Management restyle, using focused RED/GREEN checks and independent commits per capability.

**Goal:** Rebuild Reading, source review, Users, Practice Sessions, and Login on the same semantic Shadcn system, then complete responsive, dark-mode, typography, accessibility, and dependency audits across every Admin route.

**Architecture:** Route Views remain composition-only. Users and Practice presentation move into their owning feature folders. Reading keeps its existing feature ownership and exact nested wire payload. Shared page/form/table/feedback patterns remain in `app/components`, while workflow-specific editors stay with their capability.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Shadcn/Radix, TanStack Query/Table, React Hook Form, Zod, Sonner.

---

## Invariants

- Do not change Admin URLs, authenticated browser transport, endpoint paths, methods, cache keys, pagination, or payloads.
- Reading source HTML remains text-only; never add `dangerouslySetInnerHTML`.
- Preserve Reading A1 authoring/publication behavior and nested question/option invariants.
- Preserve User create/edit password differences and Practice Session detail/delete behavior.
- Preserve Admin login endpoint, auth state, and post-login redirect.
- Do not add backend, database, migration, seed, provider, or vocabulary workflow changes.

### Task 1: Guard remaining-route composition

**Files:**
- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Modify: `apps/admin/test/reading-architecture.test.ts`

Add failing assertions for capability-owned User and Practice screens, thin Views, decomposed Reading components, primitive controls, and forbidden browser `confirm()`/native select/radio usage. Run the focused tests and confirm RED before implementation.

### Task 2: Restyle Reading Passages

**Files:**
- Modify: `apps/admin/app/features/reading/components/ReadingPassagesScreen.tsx`
- Create: `apps/admin/app/features/reading/components/passage/reading-passage-columns.tsx`
- Create: `apps/admin/app/features/reading/components/passage/ReadingPassageEditorDialog.tsx`
- Create: `apps/admin/app/features/reading/components/passage/ReadingPassageFields.tsx`
- Create: `apps/admin/app/features/reading/components/passage/ReadingQuestionEditor.tsx`
- Create: `apps/admin/app/features/reading/components/passage/ReadingOptionEditor.tsx`
- Create: `apps/admin/app/features/reading/components/passage/reading-passage.schema.ts`

Use PageHeader/DataTable/shared feedback, React Hook Form/Zod, Shadcn Select/Textarea/Radio Group, and DestructiveActionDialog. Preserve the exact A1 request model, nested ordering, correct-option behavior, publication flow, query invalidation, and stable IDs. Verify focused Reading/API characterization plus Admin type/lint/build; commit.

### Task 3: Restyle Reading Source Candidates

**Files:**
- Modify: `apps/admin/app/features/reading-source-candidates/components/ReadingSourceCandidatesScreen.tsx`
- Modify: `apps/admin/app/features/reading-source-candidates/components/ReadingSourceCandidateReviewDialog.tsx`
- Create: `apps/admin/app/features/reading-source-candidates/components/reading-source-candidate-columns.tsx`
- Create: `apps/admin/app/features/reading-source-candidates/components/reading-source-candidate.schema.ts`

Adopt PageHeader, DataTable, Shadcn filters, feedback states, scroll-safe Dialog, typed validation, and Radio Group. Keep source ID/checksum readable, source HTML text-only, pending-only edits, topic/CEFR behavior, and approve/reject requests unchanged. Verify and commit.

### Task 4: Move and restyle Users

**Files:**
- Create: `apps/admin/app/features/users/components/UsersManagementScreen.tsx`
- Create: `apps/admin/app/features/users/components/user-columns.tsx`
- Create: `apps/admin/app/features/users/components/UserEditorForm.tsx`
- Create: `apps/admin/app/features/users/components/user-editor.schema.ts`
- Replace: `apps/admin/app/views/users/UsersView.tsx`

Make the View a thin adapter. Use DataTable, shared feedback, RHF/Zod editor, Shadcn Select, and destructive dialog. Preserve list/search/page behavior, role payload, create password requirement, optional edit password, query invalidation, and resource API. Verify and commit.

### Task 5: Move and restyle Practice Sessions

**Files:**
- Create: `apps/admin/app/features/practice/components/PracticeSessionsScreen.tsx`
- Create: `apps/admin/app/features/practice/components/practice-session-columns.tsx`
- Create: `apps/admin/app/features/practice/components/PracticeSessionDetailDialog.tsx`
- Replace: `apps/admin/app/views/practice-sessions/PracticeSessionsView.tsx`

Make the View a thin adapter. Preserve list/detail/delete queries, filters, pagination, metric semantics, date/status formatting, and nested item rendering. Use responsive metric cards, a bounded scroll region, semantic badges, DataTable, shared feedback, and destructive dialog. Verify and commit.

### Task 6: Restyle Login and Auth loading

**Files:**
- Modify: `apps/admin/app/views/auth/LoginView.tsx`
- Modify: `apps/admin/app/features/auth/components/AuthGuard.tsx`
- Create: `apps/admin/app/features/auth/components/login.schema.ts`

Use a focused semantic Card, RHF/Zod fields, visible inline errors, correct autocomplete, pending state, and existing login/redirect behavior. Replace custom spinners and hardcoded English/Zinc presentation with shared loading/tokens. Verify Auth API characterization, types, lint, and build; commit.

### Task 7: Cross-route visual and accessibility QA

1. Audit every Admin production TSX file for `font-bold`, `font-black`, negative tracking, literal Zinc/white surfaces, heavy shadows, excessive rounding, native select/textarea/radio, `confirm()`, and missing icon-button labels.
2. Check every route at mobile, tablet, desktop, light, and dark layouts; fix overflow, dialog height, control touch size, focus visibility, skeleton shape, empty/error state, and background-fetch indication.
3. Ensure status meaning always includes text/icon, table rows use stable IDs, and form errors are connected with `aria-invalid`/`aria-describedby`.
4. Remove only dependencies proven unused by repository-wide search; update lockfile through pnpm.
5. Run all Admin gates, then root `pnpm test`, `pnpm check-types`, `pnpm lint`, and `pnpm build`.
6. Run root `pnpm architecture:check`; report any verified pre-existing failure separately and do not broaden scope into Learner Web.
7. Update the canonical frontend document if implementation changed a durable ownership or presentation rule.

