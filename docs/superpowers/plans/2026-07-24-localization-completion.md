# Learner Localization Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate missing learner messages and hard-coded presentation copy from primary English and Vietnamese routes.

**Architecture:** Add recursive catalog-parity and AST-based JSX copy audits, then migrate copy feature by feature without treating domain content, route segments, CSS, or technical identifiers as translations.

**Tech Stack:** next-intl, TypeScript compiler AST, Node test runner, Next.js.

## Global Constraints

- English and Vietnamese catalogs must have identical key structure.
- Domain content keeps reviewed English fallback when Vietnamese content is null.
- Route paths, enum IDs, CEFR codes, CSS classes, and API values are not message copy.
- User-visible `aria-label`, `title`, placeholder, empty, error, badge, and CTA copy must be localized.
- Stabilize Topic and Flashcard UI contracts before running their final copy migration.

---

### Task 1: Add Recursive Catalog Parity

**Files:**

- Create: `apps/web/test/i18n-catalog-parity.test.ts`
- Read: `apps/web/app/messages/en.json`
- Read: `apps/web/app/messages/vi.json`

**Interfaces:**

- Produces: a deterministic list of missing or extra message paths.

- [ ] **Step 1: Write the parity test**

Implement:

```ts
function leafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}
```

Parse both catalogs and assert sorted leaf paths are deeply equal. For matching
message strings, extract `{placeholder}` names and assert each path uses the
same sorted placeholder list in both locales.

- [ ] **Step 2: Run the test**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/i18n-catalog-parity.test.ts
```

Expected: PASS if current catalogs match; any failure is fixed before Task 2
without deleting valid keys.

- [ ] **Step 3: Commit the parity gate**

```powershell
git add apps/web/test/i18n-catalog-parity.test.ts apps/web/app/messages/en.json apps/web/app/messages/vi.json
git commit -m "test(web): enforce locale catalog parity"
```

### Task 2: Add an AST-Based Learner Copy Audit

**Files:**

- Create: `apps/web/test/i18n-presentation-audit.test.ts`

**Interfaces:**

- Consumes: primary learner view and feature component source.
- Produces: failing file/line evidence for untranslated JSX copy.

- [ ] **Step 1: Define audited roots**

Audit `.tsx` files under:

```text
apps/web/app/views
apps/web/app/features/placement-test/onboarding
apps/web/app/features/flashcards/components
apps/web/app/features/practice
apps/web/app/features/review
```

- [ ] **Step 2: Implement AST checks**

Use `typescript.createSourceFile`. Report:

1. `JsxText` containing a Unicode letter after trimming.
2. String-literal JSX attributes for `aria-label`, `title`, `placeholder`, and
   `alt` when the value contains a Unicode letter.

Ignore only:

```text
className
href
src
type
role
id
name
target
rel
method
action
data-*
aria-hidden
```

Allow decorative image `alt=""`. Do not add file-wide allowlists.

- [ ] **Step 3: Confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/i18n-presentation-audit.test.ts
```

Expected: FAIL with exact remaining copy locations, including Topic `Hot` if
still present.

- [ ] **Step 4: Commit only after all reported copy is migrated**

This test remains RED until Tasks 3-5 finish.

### Task 3: Localize Topic Presentation

**Files:**

- Modify: `apps/web/app/views/topics/TopicsView.tsx`
- Modify: `apps/web/app/views/topics/TopicDetailView.tsx`
- Modify: `apps/web/app/views/topics/TopicPracticeView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Produces: catalog-backed Topic badges, labels, tooltips, empty/error states, and modal copy.

- [ ] **Step 1: Add matching message keys**

Add keys under `topics` for every AST failure. If an editorial Hot badge still
exists after Topic truth work, use:

```json
"hotStatus": "Hot"
```

and natural Vietnamese:

```json
"hotStatus": "Nổi bật"
```

- [ ] **Step 2: Replace visible literals**

Use `t("key")` or `t("key", { value })`. Domain fields such as `topic.title`,
`wordItem.word`, and `wordItem.meaningVi` remain response content.

- [ ] **Step 3: Run focused gates**

```powershell
pnpm --filter @repo/web exec tsx --test test/i18n-catalog-parity.test.ts test/i18n-presentation-audit.test.ts
```

Expected: Topic files no longer appear in failures.

### Task 4: Localize Flashcard, Practice, Review, and Onboarding Presentation

**Files:**

- Modify: files reported by `apps/web/test/i18n-presentation-audit.test.ts`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Interfaces:**

- Produces: catalog-backed copy for all remaining audited features.

- [ ] **Step 1: Migrate one namespace at a time**

Use existing namespaces where present:

```text
flashcards
practice
review
placementTest
```

Do not create a generic `common` key for feature-specific sentences. Reuse a
shared key only when the English and Vietnamese meaning is identical in every
caller.

- [ ] **Step 2: Verify after each namespace**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/i18n-catalog-parity.test.ts test/i18n-presentation-audit.test.ts
```

Expected: the failure list shrinks and never gains catalog parity errors.

- [ ] **Step 3: Reach GREEN**

The audit passes with no file-wide exclusions and no hard-coded Vietnamese
presentation strings.

### Task 5: Add Locale Route Smoke Coverage

**Files:**

- Create: `apps/web/test/i18n-primary-routes.test.ts`
- Modify: `apps/web/package.json` only if its existing test glob does not include the file.

**Interfaces:**

- Produces: static route/message namespace coverage for both locales.

- [ ] **Step 1: Define primary routes**

Cover:

```text
dashboard
learn
learn/level
topics
topics/[slug]
practice
review
flashcards
saved-words
placement-test
```

- [ ] **Step 2: Assert namespace availability**

For every route view, parse `useTranslations("namespace")` calls and assert the
namespace exists in both catalogs. Extract literal `t("path")` calls and assert
the full namespace/path exists in both catalogs.

- [ ] **Step 3: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
git diff --check
```

Commit:

```powershell
git add apps/web/app apps/web/test/i18n-catalog-parity.test.ts apps/web/test/i18n-presentation-audit.test.ts apps/web/test/i18n-primary-routes.test.ts
git commit -m "fix(web): complete learner localization"
```

### Task 6: Full Slice Verification

- [ ] Run:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
git status --short
```
