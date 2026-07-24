# Certificate Domain Decision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select and document whether Certificate learning is owned by Course or by a separate vocabulary taxonomy before implementing Certificate APIs.

**Architecture:** This is a bounded design spike ending in an accepted ADR and removal of fictional Certificate progress. It does not create persistence tables, endpoints, or enrollment behavior.

**Tech Stack:** Repository ADR workflow, Prisma schema inspection, existing Course and vocabulary contracts, Next.js learner views.

## Global Constraints

- Do not create Certificate endpoints or migrations in this plan.
- Do not infer product requirements from the current hard-coded IELTS/TOEIC UI.
- Preserve Course as the owner of ordered Unit/Lesson/challenge content.
- Remove or label unavailable progress rather than displaying fabricated metrics.

---

### Task 1: Inventory Certificate Product Behavior

**Files:**

- Create: `docs/architecture/certificate-domain-inventory.md`
- Inspect: `apps/web/app/views/courses/CoursesView.tsx`
- Inspect: `apps/web/app/views/flashcards/FlashcardsView.tsx`
- Inspect: `apps/api/prisma/schema.prisma`
- Inspect: `packages/shared/src/types/course.ts`

**Interfaces:**

- Consumes: current UI assumptions and Course/Vocabulary model.
- Produces: a decision input containing exact required behaviors for IELTS, TOEIC, TOEFL, and VSTEP.

- [ ] **Step 1: Record the inventory matrix**

Create a table with these columns and no undecided cells:

```text
Experience | Own lessons? | Own vocabulary membership? | Enrollment? |
Independent progress? | Admin authoring? | Required launch behavior
```

For each unresolved product answer, choose `required for first release` or
`excluded from first release`; do not write `TBD`.

- [ ] **Step 2: Record current fictional UI**

List every fixed Certificate count, percentage, lock state, and route with its
source file. State that none is an accepted domain contract.

- [ ] **Step 3: Commit the inventory**

Run:

```powershell
git diff --check
```

Commit:

```powershell
git add docs/architecture/certificate-domain-inventory.md
git commit -m "docs: inventory Certificate learning behavior"
```

### Task 2: Write and Accept the ADR

**Files:**

- Create: `docs/adr/0022-certificate-domain-ownership.md`
- Modify: `docs/adr/README.md`
- Test: `apps/api/test/domain-ownership-architecture.test.ts`

**Interfaces:**

- Consumes: the completed inventory.
- Produces: one accepted owner and explicit API/persistence consequences.

- [ ] **Step 1: Add the failing ADR catalog test**

Assert that ADR 0022 exists and contains exactly one accepted decision marker:

```ts
assert.match(adr, /Status: Accepted/);
assert.match(adr, /Decision: Certificate is (a Course|a vocabulary taxonomy)/);
assert.doesNotMatch(adr, /TBD|undecided|decide later/i);
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test test/domain-ownership-architecture.test.ts
```

Expected: FAIL because ADR 0022 does not exist.

- [ ] **Step 3: Write the ADR**

Use this decision rule:

```text
If first-release Certificate content owns ordered lessons and challenges,
Decision: Certificate is a Course.

If first-release Certificate behavior only filters vocabulary independently
from lessons,
Decision: Certificate is a vocabulary taxonomy.
```

The ADR must specify owner, relational identity, learner progress source, Admin
authoring boundary, initial routes, migration implications, and rejected model.

- [ ] **Step 4: Confirm GREEN and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test test/domain-ownership-architecture.test.ts
git diff --check
```

Commit:

```powershell
git add docs/adr/0022-certificate-domain-ownership.md docs/adr/README.md apps/api/test/domain-ownership-architecture.test.ts
git commit -m "docs: decide Certificate domain ownership"
```

### Task 3: Remove Fictional Certificate Progress

**Files:**

- Modify: `apps/web/app/views/courses/CoursesView.tsx`
- Modify: `apps/web/app/views/flashcards/FlashcardsView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`
- Test: `apps/web/test/certificate-presentation.test.ts`

**Interfaces:**

- Consumes: accepted ADR.
- Produces: truthful unavailable state or links backed by the chosen owner.

- [ ] **Step 1: Write the failing presentation test**

Assert the two views contain none of the fictional literals or static progress
fields:

```ts
assert.doesNotMatch(coursesSource, /42|TOEFL.*locked|VSTEP.*locked/s);
assert.doesNotMatch(flashcardsSource, /CERT_DECKS|percent:\s*(42|18)/);
assert.match(en.flashcards.certificateUnavailable, /not available/i);
assert.equal(typeof vi.flashcards.certificateUnavailable, "string");
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/certificate-presentation.test.ts
```

- [ ] **Step 3: Implement only accepted behavior**

If the ADR selects Course, render Certificate entries only from real Course
responses with immutable Course codes. If the first Course contract cannot
identify Certificate courses yet, render a localized unavailable state.

If the ADR selects taxonomy, render only the localized unavailable state until
the taxonomy implementation plan is complete.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/certificate-presentation.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

Commit:

```powershell
git add apps/web/app/views/courses/CoursesView.tsx apps/web/app/views/flashcards/FlashcardsView.tsx apps/web/app/messages/en.json apps/web/app/messages/vi.json apps/web/test/certificate-presentation.test.ts
git commit -m "fix(web): remove fictional Certificate progress"
```
