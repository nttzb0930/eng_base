# Learning Path Information Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present General English and TOEIC Preparation as the two primary learner paths while preserving every current route, API, and progress contract.

**Architecture:** Keep localized routes thin and make changes in Web views, TOEIC-owned presentation, and synchronized message catalogs. Add one TOEIC-local navigation component under `app/features/toeic`, compose it only in browsing views, and protect the information architecture with source-level behavioral tests that match the repository's existing Web test style.

**Tech Stack:** Next.js 16, React 19, next-intl, Tailwind CSS, Lucide icons, Node test runner via `tsx --test`.

## Global Constraints

- Preserve all current public URLs, including `/learn/cert/toeic`.
- Do not change API endpoints, Shared wire types, Prisma, migrations, or database data.
- Keep CEFR progress and TOEIC attempt progress separate.
- Keep focused TOEIC session routes free of browsing navigation.
- Update English and Vietnamese catalogs together.
- Follow `localized route -> app/views -> app/features` ownership.

---

### Task 1: Characterize the new learning-path navigation

**Files:**

- Create: `apps/web/test/learning-path-information-architecture.test.ts`

**Interfaces:**

- Consumes: existing source files and JSON message catalogs.
- Produces: regression tests for path hierarchy, TOEIC local navigation, and truthful bilingual labels.

- [ ] **Step 1: Write the failing tests**

Create tests that read public source files and assert:

```ts
test("Learning presents General English and TOEIC as primary paths", () => {
  const source = read("app/views/learn/LearnView.tsx");
  assert.match(source, /t\("generalEnglishTitle"\)/);
  assert.match(source, /t\("toeicPathTitle"\)/);
  assert.match(source, /href=\{withLocale\("\/learn\/cert\/toeic"\)\}/);
  assert.doesNotMatch(source, /t\("byCertDesc"\)/);
});

test("TOEIC browsing views compose a shared local navigation", () => {
  const navigation = read("app/features/toeic/components/ToeicSectionNav.tsx");
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /\/learn\/cert\/toeic\/listening/);
  assert.match(navigation, /\/learn\/cert\/toeic\/reading/);
  for (const view of [
    "app/views/toeic-reading/ToeicOverviewView.tsx",
    "app/views/toeic-listening/ToeicListeningListView.tsx",
    "app/views/toeic-listening/ToeicDictationListView.tsx",
    "app/views/toeic-reading/ToeicReadingListView.tsx",
    "app/views/toeic-grammar/ToeicGrammarCatalogView.tsx",
  ]) {
    assert.match(read(view), /ToeicSectionNav/);
  }
});
```

Parse both message catalogs and require the new `learn`, `topics`, `toeic`, and
`toeicListening.mode` values in both locales. Assert that English and Vietnamese
no longer advertise IELTS, TOEFL, or VSTEP on the current TOEIC path.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/learning-path-information-architecture.test.ts
```

Expected: FAIL because `ToeicSectionNav.tsx` and the new message keys do not yet exist.

- [ ] **Step 3: Commit the test checkpoint**

```powershell
git add apps/web/test/learning-path-information-architecture.test.ts
git commit -m "test(web): define CEFR and TOEIC learning paths"
```

---

### Task 2: Restructure the Learning overview

**Files:**

- Modify: `apps/web/app/views/learn/LearnView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Consumes: existing CEFR progress and Dashboard query results.
- Produces: two primary path groups without new data dependencies.

- [ ] **Step 1: Add synchronized Learning copy**

Add these semantic keys under `learn` in both locales:

```json
{
  "learningPaths": "LEARNING PATHS",
  "generalEnglishTitle": "General English",
  "generalEnglishDescription": "Build everyday English through CEFR levels and practical topics.",
  "cefrPathTitle": "Learn by CEFR",
  "topicPathTitle": "Learn by topic",
  "toeicPathTitle": "TOEIC Preparation",
  "toeicPathDescription": "Practice TOEIC Listening and Reading with Parts, full tests, and exam-focused grammar.",
  "openToeic": "Open TOEIC Preparation"
}
```

Use natural Vietnamese equivalents in `vi.json`. Replace the old three-path
description with copy that describes exactly two primary goals.

- [ ] **Step 2: Compose two primary path groups**

In `LearnView.tsx`:

- Render a General English group containing the existing CEFR progress card and
  the Topic discovery card.
- Render one dedicated TOEIC Preparation card that links directly to
  `withLocale("/learn/cert/toeic")`.
- Remove the generic Certificate card and all claims about unimplemented exams.
- Preserve all existing query, loading, redirect, and error behavior.
- Use the current card tokens, responsive grid, visible focus treatment, and
  icon-plus-text actions.

- [ ] **Step 3: Run the focused test and verify GREEN for the Learning section**

```powershell
pnpm --filter @repo/web exec tsx --test test/learning-path-information-architecture.test.ts
```

Expected: tests related to Learning and copy pass; TOEIC local-navigation tests may still fail.

- [ ] **Step 4: Commit the Learning overview**

```powershell
git add apps/web/app/views/learn/LearnView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json
git commit -m "feat(web): separate General English and TOEIC paths"
```

---

### Task 3: Add shared TOEIC browsing navigation

**Files:**

- Create: `apps/web/app/features/toeic/components/ToeicSectionNav.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicOverviewView.tsx`
- Modify: `apps/web/app/views/toeic-listening/ToeicListeningListView.tsx`
- Modify: `apps/web/app/views/toeic-listening/ToeicDictationListView.tsx`
- Modify: `apps/web/app/views/toeic-reading/ToeicReadingListView.tsx`
- Modify: `apps/web/app/views/toeic-grammar/ToeicGrammarCatalogView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Produces: `ToeicSectionNav({ active }: { active: "overview" | "listening" | "reading" })`.
- Consumes: `LocalizedLink`, `useTranslations("toeic.navigation")`, and existing routes.

- [ ] **Step 1: Add bilingual TOEIC navigation keys**

Add matching keys:

```json
{
  "toeic": {
    "navigation": {
      "label": "TOEIC sections",
      "overview": "Overview",
      "listening": "Listening",
      "reading": "Reading"
    }
  }
}
```

Use `Khu vực TOEIC`, `Tổng quan`, `Nghe hiểu`, and `Đọc hiểu` in Vietnamese.

- [ ] **Step 2: Implement the feature-owned navigation**

Create a responsive three-link navigation using Lucide icons. Each link uses
the existing localized route, `aria-current="page"` when active, at least a
44-pixel target, visible focus ring, and the established emerald active style.

- [ ] **Step 3: Compose navigation in browsing views**

Render `ToeicSectionNav` after the back link and before each page header:

- overview uses `active="overview"`;
- both Listening list modes use `active="listening"`;
- Reading tests and Grammar catalog use `active="reading"`.

Do not add it to `/toeic/**/tests/**`, Dictation session, Grammar practice,
result, or other focused session views.

- [ ] **Step 4: Run focused TOEIC architecture tests**

```powershell
pnpm --filter @repo/web exec tsx --test test/learning-path-information-architecture.test.ts test/toeic-listening-architecture.test.ts test/toeic-reading-architecture.test.ts test/toeic-grammar-catalog-architecture.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit shared TOEIC navigation**

```powershell
git add apps/web/app/features/toeic apps/web/app/views/toeic-reading apps/web/app/views/toeic-listening apps/web/app/views/toeic-grammar apps/web/app/messages/en.json apps/web/app/messages/vi.json
git commit -m "feat(web): add TOEIC section navigation"
```

---

### Task 4: Correct discovery and Listening terminology

**Files:**

- Modify: `apps/web/app/features/topics/components/DiscoveryTabs.tsx`
- Modify: `apps/web/app/views/courses/CoursesView.tsx`
- Modify: `apps/web/app/features/toeic-listening/components/ToeicListeningModeTabs.tsx`
- Modify: `apps/web/app/features/toeic-reading/components/ToeicReadingModeTabs.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Test: `apps/web/test/learning-path-information-architecture.test.ts`

**Interfaces:**

- Consumes: current route-compatible discovery and mode keys.
- Produces: truthful labels without changing link destinations or mode values.

- [ ] **Step 1: Extend the failing assertions**

Assert exact meanings rather than internal enum names:

```ts
assert.equal(en.topics.byLevel, "CEFR");
assert.equal(en.topics.byCert, "TOEIC");
assert.equal(en.toeicListening.mode.level, "Listening tests");
assert.equal(en.toeicListening.mode.dictation, "Intensive listening");
assert.doesNotMatch(en.learn.byCertDesc, /IELTS|TOEFL|VSTEP/);
```

Add equivalent Vietnamese assertions and run the focused test to verify RED.

- [ ] **Step 2: Update copy while preserving compatibility keys**

- Keep `byLevel` and `byCert` keys to avoid a broad consumer rename, but set
  their visible values to `CEFR` and `TOEIC`.
- Change certificate headings/descriptions to the available TOEIC preparation
  path.
- Set Listening outer labels to `Listening tests` / `Luyện đề Listening` and
  `Intensive listening` / `Nghe chuyên sâu`.
- Make Reading mode labels explicitly TOEIC-scoped where context is ambiguous.
- Fix the hard-coded corrupted Vietnamese `aria-label` in `DiscoveryTabs` by
  reading a localized `modeLabel` key.

- [ ] **Step 3: Run focused tests and verify GREEN**

```powershell
pnpm --filter @repo/web exec tsx --test test/learning-path-information-architecture.test.ts test/certificate-presentation.test.ts app/features/toeic-reading/tests/toeic-reading-messages.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit terminology cleanup**

```powershell
git add apps/web/app/features/topics/components/DiscoveryTabs.tsx apps/web/app/views/courses/CoursesView.tsx apps/web/app/features/toeic-listening/components/ToeicListeningModeTabs.tsx apps/web/app/features/toeic-reading/components/ToeicReadingModeTabs.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test/learning-path-information-architecture.test.ts
git commit -m "fix(web): clarify CEFR and TOEIC terminology"
```

---

### Task 5: Verify the Web change

**Files:**

- Modify only if verification exposes a scoped regression.

**Interfaces:**

- Consumes: all implementation tasks.
- Produces: evidence that UI ownership, localization, types, lint, and production compilation remain valid.

- [ ] **Step 1: Format changed files**

```powershell
pnpm exec prettier --write apps/web/app apps/web/test docs/superpowers
```

- [ ] **Step 2: Run the Web test suite**

```powershell
pnpm --filter @repo/web test
```

Expected: PASS.

- [ ] **Step 3: Run Web architecture and static gates**

```powershell
pnpm --filter @repo/web architecture:check
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Expected: all commands exit 0.

- [ ] **Step 4: Review the final diff**

```powershell
git diff --check
git status --short
git log -6 --oneline
```

Confirm no environment files, generated output, secrets, database files, or
unrelated changes are present.
