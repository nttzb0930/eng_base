# Onboarding Constants and Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Web onboarding options and API persistence validation consume one Shared set of supported language, goal, and intensity IDs.

**Architecture:** Shared exports immutable ID arrays and derived union types. Web keeps presentation metadata locally but keys it by Shared IDs. API DTOs use class-validator for membership and a cross-field validator for primary-language selection.

**Tech Stack:** TypeScript, `@repo/shared`, class-validator/class-transformer, Next.js onboarding components, Node test runner.

## Global Constraints

- System UI locale remains `en`/`vi` in Web local storage only.
- Target learning languages remain `en`, `ja`, `de`, `zh`, and `ko`.
- Goals remain `travel`, `career`, `exams`, `culture`, `study_abroad`, and `hobby`.
- Intensities remain `relaxed`, `standard`, `accelerated`, and `intensive`.
- `customGoal` maximum length is 300 after trimming.
- Existing valid onboarding payloads remain compatible.

---

### Task 1: Publish Shared Onboarding Constants

**Files:**

- Create: `packages/shared/src/constants/onboarding.ts`
- Modify: `packages/shared/src/constants/index.ts`
- Test: `packages/shared/test/shared-root-interface.test.ts`

**Interfaces:**

- Produces: `TARGET_LANGUAGE_IDS`, `ONBOARDING_GOAL_IDS`, `LEARNING_INTENSITY_IDS` and their union types.

- [ ] **Step 1: Write the failing contract test**

Assert:

```ts
assert.deepEqual(TARGET_LANGUAGE_IDS, ["en", "ja", "de", "zh", "ko"]);
assert.deepEqual(ONBOARDING_GOAL_IDS, [
  "travel",
  "career",
  "exams",
  "culture",
  "study_abroad",
  "hobby",
]);
assert.deepEqual(LEARNING_INTENSITY_IDS, [
  "relaxed",
  "standard",
  "accelerated",
  "intensive",
]);
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/shared test
```

- [ ] **Step 3: Add immutable constants and types**

Use:

```ts
export const TARGET_LANGUAGE_IDS = ["en", "ja", "de", "zh", "ko"] as const;
export type TargetLanguageId = (typeof TARGET_LANGUAGE_IDS)[number];

export const ONBOARDING_GOAL_IDS = [
  "travel",
  "career",
  "exams",
  "culture",
  "study_abroad",
  "hobby",
] as const;
export type OnboardingGoalId = (typeof ONBOARDING_GOAL_IDS)[number];

export const LEARNING_INTENSITY_IDS = [
  "relaxed",
  "standard",
  "accelerated",
  "intensive",
] as const;
export type LearningIntensityId = (typeof LEARNING_INTENSITY_IDS)[number];
```

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/shared test
pnpm --filter @repo/shared check-types
```

Commit:

```powershell
git add packages/shared/src/constants/onboarding.ts packages/shared/src/constants/index.ts packages/shared/test/shared-root-interface.test.ts
git commit -m "feat(shared): define onboarding option IDs"
```

### Task 2: Make Web Presentation Metadata Type-Safe

**Files:**

- Modify: `apps/web/app/features/placement-test/onboarding/LanguageStep.tsx`
- Modify: `apps/web/app/features/placement-test/onboarding/GoalStep.tsx`
- Modify: `apps/web/app/features/placement-test/onboarding/IntensityStep.tsx`
- Modify: `apps/web/app/features/placement-test/types/placement-test.types.ts`
- Test: `apps/web/test/onboarding-option-contract.test.ts`

**Interfaces:**

- Consumes: Shared ID unions.
- Produces: local display metadata with no duplicated authoritative ID list.

- [ ] **Step 1: Write the failing structural/type test**

Assert each component imports the relevant Shared constant/type and does not
declare a raw authoritative `const LANGUAGES`, `const GOALS`, or
`const INTENSITIES` array.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/onboarding-option-contract.test.ts
```

- [ ] **Step 3: Key metadata by Shared ID**

Use this pattern:

```ts
const LANGUAGE_METADATA: Record<
  TargetLanguageId,
  { nameKey: string; nativeName: string; flagCode: string; isBeta?: boolean }
> = {
  en: { nameKey: "step1.langEnglish", nativeName: "English", flagCode: "gb" },
  ja: {
    nameKey: "step1.langJapanese",
    nativeName: "日本語",
    flagCode: "jp",
    isBeta: true,
  },
  de: { nameKey: "step1.langGerman", nativeName: "Deutsch", flagCode: "de" },
  zh: { nameKey: "step1.langChinese", nativeName: "中文", flagCode: "cn" },
  ko: { nameKey: "step1.langKorean", nativeName: "한국어", flagCode: "kr" },
};

const LANGUAGES = TARGET_LANGUAGE_IDS.map((id) => ({
  id,
  ...LANGUAGE_METADATA[id],
}));
```

Apply the same mapping pattern for goal and intensity presentation metadata.
Change onboarding state/input types to the Shared unions.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/onboarding-option-contract.test.ts test/system-language-onboarding.test.ts
pnpm --filter @repo/web check-types
```

Commit:

```powershell
git add apps/web/app/features/placement-test apps/web/test/onboarding-option-contract.test.ts
git commit -m "refactor(web): consume Shared onboarding options"
```

### Task 3: Enforce DTO Membership and Cross-Field Rules

**Files:**

- Create: `apps/api/src/module/placement-test/dto/is-primary-language-selected.validator.ts`
- Modify: `apps/api/src/module/placement-test/dto/placement-test.dto.ts`
- Create: `apps/api/src/module/placement-test/tests/placement-test.dto.spec.ts`

**Interfaces:**

- Consumes: Shared IDs and CEFR levels.
- Produces: validated `ConfirmPlacementLevelDto`.

- [ ] **Step 1: Write failing DTO tests**

Use `plainToInstance` and `validate`. Cover:

```ts
test("accepts the existing valid onboarding payload");
test("rejects an unsupported language");
test("rejects primary language outside selected languages");
test("rejects an unsupported goal");
test("rejects an unsupported intensity");
test("rejects custom goal over 300 trimmed characters");
test("trims custom goal before persistence");
```

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/placement-test/tests/placement-test.dto.spec.ts
```

- [ ] **Step 3: Add membership validation**

Use:

```ts
@IsArray()
@IsIn([...TARGET_LANGUAGE_IDS], { each: true })
@IsOptional()
languages?: TargetLanguageId[];

@IsIn([...TARGET_LANGUAGE_IDS])
@IsPrimaryLanguageSelected()
@IsOptional()
primaryLanguage?: TargetLanguageId;

@IsArray()
@IsIn([...ONBOARDING_GOAL_IDS], { each: true })
@IsOptional()
goals?: OnboardingGoalId[];

@IsIn([...LEARNING_INTENSITY_IDS])
@IsOptional()
intensity?: LearningIntensityId;

@Transform(({ value }) => typeof value === "string" ? value.trim() : value)
@IsString()
@MaxLength(300)
@IsOptional()
customGoal?: string;
```

Also restrict `level` with existing `CEFR_LEVELS`.

- [ ] **Step 4: Implement cross-field validator**

The validator returns true when primary language is absent. When present, it
requires `Array.isArray(object.languages)` and inclusion in that array. Use
message:

```text
primaryLanguage must be included in languages
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm --filter @repo/api exec tsx --test src/module/placement-test/tests/placement-test.dto.spec.ts src/module/placement-test/tests/placement-test.rules.spec.ts
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```

Commit:

```powershell
git add apps/api/src/module/placement-test/dto apps/api/src/module/placement-test/tests/placement-test.dto.spec.ts
git commit -m "fix(api): validate onboarding option IDs"
```

### Task 4: Full Slice Verification

- [ ] Run:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
git diff --check
git status --short
```
