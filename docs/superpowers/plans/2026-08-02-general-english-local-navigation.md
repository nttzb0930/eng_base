# General English Local Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group CEFR learning, topic learning, CEFR practice, and CEFR reading under one shared General English navigation while preserving all routes and backend contracts.

**Architecture:** Add one feature-owned local navigation component and compose it only in General English browsing views. Remove generic Practice and Reading peers from global navigation, make Learning own those route states, and keep the Learning overview as the direct entry point to all four capabilities.

**Tech Stack:** Next.js 16, React 19, next-intl, Tailwind CSS, Lucide icons, Node test runner through `tsx --test`.

## Global Constraints

- Preserve `/learn/level`, `/learn/topic`, `/practice`, and `/reading`.
- Do not change API endpoints, Shared wire types, Prisma, migrations, or data.
- Do not render browsing navigation in focused session or result routes.
- Keep General English and TOEIC progress separate.
- Update English and Vietnamese catalogs together.
- Follow `localized route -> app/views -> app/features` ownership.

---

### Task 1: Characterize the General English navigation boundary

**Files:**

- Modify: `apps/web/test/learning-path-information-architecture.test.ts`
- Modify: `apps/web/test/certificate-presentation.test.ts`

**Interfaces:**

- Consumes: public view, component, header, sidebar, and locale-catalog source.
- Produces: regression coverage for exact routes, view composition, and global-nav removal.

- [ ] **Step 1: Add failing source-level behavior tests**

Require a `GeneralEnglishSectionNav` with the four stable routes; require
`LearnLevelView`, `TopicsView`, `PracticeView`, and `ReadingListView` to select
`cefr`, `topics`, `practice`, and `reading`; reject `/practice` and `/reading`
from global nav item arrays; and require `/learn` to link to all four sections.

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
pnpm --filter @repo/web exec tsx --test test/learning-path-information-architecture.test.ts test/certificate-presentation.test.ts
```

Expected: FAIL because `GeneralEnglishSectionNav.tsx` does not exist and the
global header still owns Practice and Reading.

- [ ] **Step 3: Commit the regression checkpoint**

```powershell
git add apps/web/test/learning-path-information-architecture.test.ts apps/web/test/certificate-presentation.test.ts
git commit -m "test(web): define General English section navigation"
```

### Task 2: Add the shared General English navigation

**Files:**

- Create: `apps/web/app/features/general-english/components/GeneralEnglishSectionNav.tsx`
- Modify: `apps/web/app/views/learn/LearnLevelView.tsx`
- Modify: `apps/web/app/views/topics/TopicsView.tsx`
- Modify: `apps/web/app/views/practice/PracticeView.tsx`
- Modify: `apps/web/app/views/reading/ReadingListView.tsx`
- Delete: `apps/web/app/features/topics/components/DiscoveryTabs.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Produces: `GeneralEnglishSectionNav({ active, levelCount?, topicCount? })`.
- Consumes: `LocalizedLink`, `withLocale`, and `learn.generalNavigation` messages.

- [ ] **Step 1: Add matching bilingual navigation messages**

Add `learn.generalNavigation.label`, `cefr`, `topics`, `practice`, and `reading`
to both message catalogs with truthful CEFR-scoped wording.

- [ ] **Step 2: Implement the four-route navigation**

Use a single blue active treatment, `aria-current="page"`, visible focus rings,
`rounded-md`, shrink-safe links, and contained horizontal overflow on mobile.

- [ ] **Step 3: Replace browsing-view navigation**

Compose the component in the four browsing views with the matching active key.
Do not add it to any session or result view. Delete `DiscoveryTabs` after its
last consumer is removed.

- [ ] **Step 4: Run focused tests and verify GREEN for composition**

```powershell
pnpm --filter @repo/web exec tsx --test test/learning-path-information-architecture.test.ts test/cefr-level-progress.test.ts test/reading-architecture.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Commit the shared navigation**

```powershell
git add apps/web/app/features/general-english apps/web/app/features/topics/components/DiscoveryTabs.tsx apps/web/app/views apps/web/app/messages apps/web/test
git commit -m "feat(web): add General English section navigation"
```

### Task 3: Align global navigation and Learning discovery

**Files:**

- Modify: `apps/web/app/components/navigation/Header.tsx`
- Modify: `apps/web/app/components/navigation/Sidebar.tsx`
- Modify: `apps/web/app/components/navigation/SidebarItem.tsx`
- Modify: `apps/web/app/views/learn/LearnView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Consumes: the four General English route destinations.
- Produces: one global Learning item active across `/learn`, `/practice`, and `/reading`, plus direct Learning-overview entry points.

- [ ] **Step 1: Remove generic Practice and Reading global items**

Delete their header and sidebar item definitions and unused icon imports. Extend
the Learning item's route matching to include `/practice` and `/reading` while
preserving locale-aware matching.

- [ ] **Step 2: Add Practice and Reading entry points to General English**

Extend the General English group in `LearnView` to link directly to
`/practice` and `/reading`. Use the existing blue General English visual family,
short bilingual descriptions, `rounded-md` actions, and no new query.

- [ ] **Step 3: Run focused IA and navigation tests**

```powershell
pnpm --filter @repo/web exec tsx --test test/learning-path-information-architecture.test.ts test/web-architecture.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit the global-navigation alignment**

```powershell
git add apps/web/app/components/navigation apps/web/app/views/learn/LearnView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test
git commit -m "refactor(web): group General English capabilities"
```

### Task 4: Verify the complete Web change

**Files:**

- Modify only if a scoped regression is found.

**Interfaces:**

- Consumes: all prior tasks.
- Produces: evidence for behavior, architecture, formatting, types, lint, and production compilation.

- [ ] **Step 1: Format and validate the diff**

```powershell
pnpm exec prettier --write apps/web/app/features/general-english apps/web/app/components/navigation apps/web/app/views apps/web/app/messages apps/web/test docs/superpowers
git diff --check
```

- [ ] **Step 2: Run all Web tests and architecture checks**

```powershell
pnpm --filter @repo/web test
pnpm --filter @repo/web architecture:check
```

- [ ] **Step 3: Run static and production gates**

```powershell
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

- [ ] **Step 4: Review repository state**

```powershell
git status --short
git log -8 --oneline
git rev-list --left-right --count origin/develop...develop
```

Confirm no generated build output, environment files, secrets, database files,
or unrelated changes are included.
