# EC Shared TypeScript-Only Profile Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the transitional Shared contract/subpath layout with the EC TypeScript-only `constants` + `types` root Interface without changing runtime JSON behavior.

**Architecture:** `packages/shared` becomes a framework-neutral TypeScript package with one root `@repo/shared` Interface. Domain declarations move from `contracts.ts` and Course Zod schemas into singular files under `src/types`; runtime constants move under `src/constants`. API mappers and Nest DTOs remain the producer validation seam, while Admin resource tests and API mapper tests replace Course response parsing.

**Tech Stack:** TypeScript 6, Node test runner through `tsx`, pnpm workspaces, NestJS/class-validator, Next.js, Prisma, ESLint.

## Global Constraints

- Preserve every API endpoint, HTTP method, request field, response field, pagination shape, query key, and visible Web/Admin behavior.
- Keep Prisma schema, migrations, seeds, and database data unchanged.
- Keep Nest DTO and `class-validator` request validation.
- Keep API-owned Zod environment validation.
- Remove Course Zod response parsing from Shared and Admin.
- Final Shared callers import only from `@repo/shared`; no capability subpath or private deep import remains.
- Do not add HTTP, Auth session, React hooks, UI, Axios, Sonner, or browser behavior to Shared in this plan.
- Do not scaffold empty `hooks`, `lib`, or `utils` folders.
- Work sequentially in `C:\Users\nttzb\Downloads\ecommerce-base\tmp\eng_base_refactor` on `refactor/ec-frontend-profile`.
- Use `pnpm.cmd` on Windows.

---

## File map

### New Shared Interface

- `packages/shared/src/constants/cefr.ts`: `CEFR_LEVELS` and `CefrLevel`.
- `packages/shared/src/constants/course.ts`: Lesson Challenge runtime value arrays.
- `packages/shared/src/constants/progress.ts`: `MAX_HEARTS`.
- `packages/shared/src/constants/index.ts`: constants-only export Interface.
- `packages/shared/src/types/common.ts`: pagination metadata and generic paginated response.
- `packages/shared/src/types/course.ts`: Course content wire types, payloads, and query params.
- `packages/shared/src/types/learning.ts`: learner Course/Lesson composition and leaderboard types.
- `packages/shared/src/types/vocabulary.ts`: Vocabulary item, persistence-progress wire types, saved words, and topics.
- `packages/shared/src/types/practice.ts`: Practice challenge and summary types.
- `packages/shared/src/types/review.ts`: Review challenge and summary types.
- `packages/shared/src/types/flashcard.ts`: Flashcard summary.
- `packages/shared/src/types/dashboard.ts`: Dashboard statistics.
- `packages/shared/src/types/progress.ts`: Challenge, Course, and Learner progress types.
- `packages/shared/src/types/placement-test.ts`: Placement Test response unions.
- `packages/shared/src/types/index.ts`: types-only export Interface.
- `packages/shared/test/ec-shared-root.test.ts`: public root Interface characterization.
- `packages/shared/test/ec-shared-profile.architecture.test.ts`: final layout/import enforcement.

### Removed Shared legacy

- `packages/shared/src/contracts.ts`.
- `packages/shared/src/courses/`.
- `packages/shared/src/dashboard/`.
- `packages/shared/src/flashcards/`.
- `packages/shared/src/learning/`.
- `packages/shared/src/placement-test/`.
- `packages/shared/src/practice/`.
- `packages/shared/src/progress/`.
- `packages/shared/src/review/`.
- `packages/shared/src/vocabulary/`.
- `packages/shared/test/courses/course.contract.test.ts`.

### Callers changed

- API Course DTO, controllers, mappers, Course learning mapper, and Placement Test shared imports.
- Admin Course APIs, hooks, ViewModels, tests, ESLint config, and package dependencies.
- Web shared imports across Course, Lesson, Vocabulary, Practice, Review, Flashcard, Dashboard, Progress, Topic, Placement Test, and Views.
- Current architecture/docs plus a superseding ADR.

---

### Task 1: Add the EC Shared root Interface alongside legacy compatibility

**Files:**
- Create: `packages/shared/test/ec-shared-root.test.ts`
- Create: `packages/shared/src/constants/cefr.ts`
- Create: `packages/shared/src/constants/course.ts`
- Create: `packages/shared/src/constants/progress.ts`
- Create: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/types/common.ts`
- Create: `packages/shared/src/types/course.ts`
- Create: `packages/shared/src/types/learning.ts`
- Create: `packages/shared/src/types/vocabulary.ts`
- Create: `packages/shared/src/types/practice.ts`
- Create: `packages/shared/src/types/review.ts`
- Create: `packages/shared/src/types/flashcard.ts`
- Create: `packages/shared/src/types/dashboard.ts`
- Create: `packages/shared/src/types/progress.ts`
- Create: `packages/shared/src/types/placement-test.ts`
- Create: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: existing declarations in `packages/shared/src/contracts.ts` and `packages/shared/src/courses/course.contract.ts`.
- Produces: root exports `Course`, `CourseUnit`, `CourseLesson`, `LessonChallenge`, `LessonChallengeOption`, all existing learner types, EC payload/query/response names, `CEFR_LEVELS`, `LESSON_CHALLENGE_TYPES`, `LESSON_CHALLENGE_DIRECTIONS`, and `MAX_HEARTS`.

- [ ] **Step 1: Write the failing root Interface test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  CEFR_LEVELS,
  LESSON_CHALLENGE_TYPES,
  MAX_HEARTS,
  type Course,
  type CreateCoursePayload,
  type FlashcardSummary,
  type PaginatedCoursesResponse,
} from "@repo/shared";

test("shared exposes the EC TypeScript-only root Interface", () => {
  const course: Course = { id: 1, title: "English", imageSrc: "/en.svg" };
  const payload: CreateCoursePayload = { title: "English", imageSrc: "/en.svg" };
  const page: PaginatedCoursesResponse = {
    data: [course],
    pagination: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
  const flashcards: FlashcardSummary = {
    due: 0,
    saved: 0,
    weak: 0,
    levels: { A1: 0, A2: 0, B1: 0, B2: 0 },
  };

  assert.equal(course.title, payload.title);
  assert.equal(page.data[0]?.imageSrc, "/en.svg");
  assert.equal(flashcards.levels.A1, 0);
  assert.deepEqual(CEFR_LEVELS, ["A1", "A2", "B1", "B2"]);
  assert.deepEqual(LESSON_CHALLENGE_TYPES, ["SELECT", "ASSIST"]);
  assert.equal(MAX_HEARTS, 5);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
pnpm.cmd --filter @repo/shared test
```

Expected: FAIL because `CreateCoursePayload`, `PaginatedCoursesResponse`, and the new root types do not exist.

- [ ] **Step 3: Create constants and common types**

```ts
// src/constants/cefr.ts
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

// src/constants/course.ts
export const LESSON_CHALLENGE_TYPES = ["SELECT", "ASSIST"] as const;
export const LESSON_CHALLENGE_DIRECTIONS = ["EN_TO_VI", "VI_TO_EN"] as const;

// src/constants/progress.ts
export const MAX_HEARTS = 5;

// src/constants/index.ts
export * from "./cefr.js";
export * from "./course.js";
export * from "./progress.js";

// src/types/common.ts
export type PaginationMetadata = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMetadata;
};
```

- [ ] **Step 4: Create Course types with EC naming**

`src/types/course.ts` defines the following exact public names and fields:

```ts
import type { PaginatedResponse } from "./common.js";
import {
  LESSON_CHALLENGE_DIRECTIONS,
  LESSON_CHALLENGE_TYPES,
} from "../constants/course.js";

export type LessonChallengeType = (typeof LESSON_CHALLENGE_TYPES)[number];
export type LessonChallengeDirection =
  (typeof LESSON_CHALLENGE_DIRECTIONS)[number];

export type Course = { id: number; title: string; imageSrc: string };
export type CourseUnit = {
  id: number;
  title: string;
  description: string;
  courseId: number;
  order: number;
};
export type CourseLesson = { id: number; title: string; unitId: number; order: number };
export type LessonChallenge = {
  id: number;
  lessonId: number;
  type: LessonChallengeType;
  direction: LessonChallengeDirection | null;
  question: string;
  order: number;
  vocabularyItemId: number | null;
};
export type LessonChallengeOption = {
  id: number;
  challengeId: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
};

export type PaginatedCoursesResponse = PaginatedResponse<Course>;
export type PaginatedCourseUnitsResponse = PaginatedResponse<CourseUnit>;
export type PaginatedCourseLessonsResponse = PaginatedResponse<CourseLesson>;
export type PaginatedLessonChallengesResponse = PaginatedResponse<LessonChallenge>;
export type PaginatedLessonChallengeOptionsResponse =
  PaginatedResponse<LessonChallengeOption>;

export type CreateCoursePayload = Pick<Course, "title" | "imageSrc">;
export type UpdateCoursePayload = Partial<CreateCoursePayload>;
export type CreateCourseUnitPayload = Omit<CourseUnit, "id">;
export type UpdateCourseUnitPayload = Partial<CreateCourseUnitPayload>;
export type CreateCourseLessonPayload = Omit<CourseLesson, "id">;
export type UpdateCourseLessonPayload = Partial<CreateCourseLessonPayload>;
export type CreateLessonChallengePayload = Omit<
  LessonChallenge,
  "id" | "direction" | "vocabularyItemId"
> & {
  direction?: LessonChallengeDirection | null;
  vocabularyItemId?: number | null;
};
export type UpdateLessonChallengePayload = Partial<CreateLessonChallengePayload>;
export type CreateLessonChallengeOptionPayload =
  Omit<LessonChallengeOption, "id" | "imageSrc" | "audioSrc"> & {
    imageSrc?: string | null;
    audioSrc?: string | null;
  };
export type UpdateLessonChallengeOptionPayload =
  Partial<CreateLessonChallengeOptionPayload>;

export type CourseQueryParams = { page: number; limit: number; search?: string };
export type CourseUnitQueryParams = CourseQueryParams;
export type CourseLessonQueryParams = CourseQueryParams;
export type LessonChallengeQueryParams = CourseQueryParams;
export type LessonChallengeOptionQueryParams = CourseQueryParams;
```

- [ ] **Step 5: Split the remaining legacy declarations by exact source blocks**

Move declarations without changing their fields or union literals, then replace
legacy aliases with imports of the canonical Course names:

- `VocabularyExample`, `UserVocabularyProgress`, `UserSavedWord`,
  `VocabularyItem`, `SavedVocabularyWord`, `VocabularyTopic`, and
  `VocabularyTopicDetails` -> `types/vocabulary.ts`;
- `Challenge`, `LessonWithChallenges`, `LessonWithCompletion`,
  `LessonWithUnit`, `UnitWithLessons`, `CourseDetails`, `LessonDetails`, and
  `LeaderboardUser` -> `types/learning.ts`, replacing `UnitRecord`,
  `LessonRecord`, and `ChallengeOption` with `CourseUnit`, `CourseLesson`, and
  `LessonChallengeOption` imports from `course.ts`;
- `contracts.ts:152-188,198-200,213-219` -> `types/practice.ts`, deriving
  `PracticeCefrLevel` from `CefrLevel`;
- `contracts.ts:189-212,220-228` -> `types/review.ts`;
- `contracts.ts:229-235` -> `types/flashcard.ts`;
- `contracts.ts:236-287` -> `types/dashboard.ts`;
- `contracts.ts:307-348` -> `types/placement-test.ts`;
- `ChallengeProgress`, `UserProgress`, and `CourseProgress` ->
  `types/progress.ts`, using type-only imports from `course.ts` and
  `learning.ts`.

Each target file must import dependencies explicitly. It must not import from
`contracts.ts` or a legacy capability directory.

- [ ] **Step 6: Create the type and root export Interfaces**

```ts
// src/types/index.ts
export * from "./common.js";
export * from "./course.js";
export * from "./learning.js";
export * from "./vocabulary.js";
export * from "./practice.js";
export * from "./review.js";
export * from "./flashcard.js";
export * from "./dashboard.js";
export * from "./progress.js";
export * from "./placement-test.js";

// src/index.ts
export * from "./constants/index.js";
export * from "./types/index.js";
```

Keep legacy capability package exports temporarily so unchanged callers still
compile during Tasks 2-4. Do not export `contracts.ts` from the root.

- [ ] **Step 7: Run Shared tests and type-check and verify GREEN**

```powershell
pnpm.cmd --filter @repo/shared test
pnpm.cmd --filter @repo/shared check-types
```

Expected: both commands exit 0; legacy capability tests may still run through
their temporary package exports.

- [ ] **Step 8: Commit**

```powershell
git add packages/shared
git commit -m "refactor(shared): add EC TypeScript root interface"
```

---

### Task 2: Migrate API Course producers to EC shared names

**Files:**
- Modify: `apps/api/test/domain-ownership-architecture.test.ts`
- Modify: `apps/api/src/module/courses/dto/course-content-management.dto.ts`
- Modify: `apps/api/src/module/courses/mappers/course-content.mapper.ts`
- Modify: `apps/api/src/module/courses/use-cases/course-learning.mapper.ts`
- Modify: `apps/api/src/module/courses/admin-challenges.controller.ts`
- Modify: `apps/api/src/module/courses/tests/course-content.mapper.spec.ts`
- Modify: `apps/api/src/module/courses/tests/course-content-management.dto.spec.ts`

**Interfaces:**
- Consumes: Task 1 root `Course`, Course content types, Payload types, and Lesson Challenge constants.
- Produces: explicitly typed camelCase API mappers and class-validator DTO implementations using only `@repo/shared`.

- [ ] **Step 1: Add a failing API source-profile assertion**

Extend the Course ownership architecture test. Add `readFileSync` to its
existing `node:fs` import, then add:

```ts
test("Course producers use the EC shared root Interface", () => {
  for (const file of [
    "module/courses/dto/course-content-management.dto.ts",
    "module/courses/mappers/course-content.mapper.ts",
    "module/courses/use-cases/course-learning.mapper.ts",
  ]) {
    const source = readFileSync(join(sourceRoot, file), "utf8");
    assert.equal(source.includes("@repo/shared/courses"), false, file);
    assert.equal(source.includes("CourseDto"), false, file);
  }
});
```

- [ ] **Step 2: Run the focused architecture test and verify RED**

```powershell
pnpm.cmd --filter @repo/api test -- test/domain-ownership-architecture.test.ts
```

Expected: FAIL because the three producer files still import
`@repo/shared/courses` and use `*Dto` names.

- [ ] **Step 3: Rename DTO implementation Interfaces**

Change `course-content-management.dto.ts` to import from `@repo/shared` and use:

```ts
CourseCreateDto implements CreateCoursePayload
CourseUpdateDto implements UpdateCoursePayload
UnitCreateDto implements CreateCourseUnitPayload
UnitUpdateDto implements UpdateCourseUnitPayload
LessonCreateDto implements CreateCourseLessonPayload
LessonUpdateDto implements UpdateCourseLessonPayload
ChallengeCreateDto implements CreateLessonChallengePayload
ChallengeUpdateDto implements UpdateLessonChallengePayload
ChallengeOptionCreateDto implements CreateLessonChallengeOptionPayload
ChallengeOptionUpdateDto implements UpdateLessonChallengeOptionPayload
```

Keep every decorator and optional/null field unchanged.

- [ ] **Step 4: Type all persistence-to-wire mappers with the new root types**

Replace mapper return types exactly:

```ts
mapCourse: Course
mapUnit: CourseUnit
mapLesson: CourseLesson
mapChallenge: LessonChallenge
mapChallengeOption: LessonChallengeOption
```

Imports come from `@repo/shared`. The mapper object bodies stay unchanged so
snake_case persistence fields still become camelCase wire fields.

- [ ] **Step 5: Remove the shared Zod enum dependency from the Challenge controller**

Use the API-owned Zod dependency with the shared value array:

```ts
import { LESSON_CHALLENGE_TYPES } from "@repo/shared";
import { z } from "zod";

// Filter schema
type: z.enum(LESSON_CHALLENGE_TYPES).optional(),
```

- [ ] **Step 6: Update Course learning mapper imports**

Import `Course`, `CourseLesson`, `CourseUnit`, `LessonChallengeDirection`,
`LessonChallengeOption`, and `LessonChallengeType` from `@repo/shared`. Remove
the local aliases that only rename old `*Dto` types. Retain API-local raw Prisma
record types and protected mapping methods.

- [ ] **Step 7: Strengthen the mapper test at the producer seam**

Keep the existing exact `deepEqual` assertions and add compile-time
`satisfies` checks to expected results:

```ts
const expectedCourse = {
  id: 1,
  title: "English",
  imageSrc: "/english.svg",
} satisfies Course;

assert.deepEqual(mapCourse(courseRecord), expectedCourse);
```

Use the equivalent canonical type for Unit, Lesson, Challenge, and Challenge
Option expected values.

- [ ] **Step 8: Run focused API verification and verify GREEN**

```powershell
pnpm.cmd --filter @repo/api test -- src/module/courses/tests/course-content.mapper.spec.ts src/module/courses/tests/course-content-management.dto.spec.ts test/domain-ownership-architecture.test.ts
pnpm.cmd --filter @repo/api check-types
pnpm.cmd --filter @repo/api lint
```

Expected: all commands exit 0.

- [ ] **Step 9: Commit**

```powershell
git add apps/api
git commit -m "refactor(api): use EC shared course types"
```

---

### Task 3: Replace Admin Course Zod parsing with typed resource Interfaces

**Files:**
- Modify: `apps/admin/test/course-feature-architecture.test.ts`
- Modify: `apps/admin/app/features/courses/api/course-management.http.ts`
- Modify: `apps/admin/app/features/courses/api/course.api.ts`
- Modify: `apps/admin/app/features/courses/api/unit.api.ts`
- Modify: `apps/admin/app/features/courses/api/lesson.api.ts`
- Modify: `apps/admin/app/features/courses/api/challenge.api.ts`
- Modify: `apps/admin/app/features/courses/api/challenge-option.api.ts`
- Modify: `apps/admin/app/features/courses/hooks/use-courses.ts`
- Modify: `apps/admin/app/features/courses/hooks/use-units.ts`
- Modify: `apps/admin/app/features/courses/hooks/use-lessons.ts`
- Modify: `apps/admin/app/features/courses/hooks/use-challenges.ts`
- Modify: `apps/admin/app/features/courses/hooks/use-challenge-options.ts`
- Modify: `apps/admin/app/features/courses/types/course-management.types.ts`
- Modify: `apps/admin/app/features/courses/tests/course.api.test.ts`
- Modify: `apps/admin/app/features/courses/tests/course-query-keys.test.ts`

**Interfaces:**
- Consumes: Task 1 root types and Task 2 unchanged HTTP wire shapes.
- Produces: Course resource adapters with typed `ApiEnvelope<T>` results and no runtime Zod parsing.

- [ ] **Step 1: Add failing Admin architecture assertions**

Extend `course-feature-architecture.test.ts`:

```ts
test("course resources use TypeScript-only shared types", () => {
  const apiRoot = join(appRoot, "app/features/courses/api");
  for (const file of resourceFiles) {
    const source = readFileSync(join(apiRoot, file), "utf8");
    assert.equal(source.includes("@repo/shared/courses"), false, file);
    assert.equal(source.includes('from "zod"'), false, file);
    assert.equal(source.includes(".parse("), false, file);
  }
});
```

- [ ] **Step 2: Run the architecture test and verify RED**

```powershell
pnpm.cmd --filter @repo/admin test -- test/course-feature-architecture.test.ts
```

Expected: FAIL on current subpath imports, Zod imports, and `.parse()` calls.

- [ ] **Step 3: Replace the schema-based missing-data helper**

```ts
export function requireCourseManagementData<T>(
  response: ApiEnvelope<T>,
): T {
  if (response.data === undefined) {
    throw new Error("Course management response did not contain data");
  }
  return response.data;
}
```

Remove the `zod` import and schema parameter.

- [ ] **Step 4: Convert every Course resource adapter**

For each resource, import types from `@repo/shared` and pass the expected wire
type into the HTTP call. The Course adapter is the reference implementation:

```ts
async listPage(query: CourseQueryParams) {
  const response = await http.get<PaginatedCoursesResponse>("/admin/courses", {
    params: { ...query },
  });
  return response.data ?? emptyCourseManagementPage;
},
async listAll() {
  const response = await http.get<Course[]>("/admin/courses");
  return response.data ?? [];
},
async create(body: CreateCoursePayload) {
  return requireCourseManagementData(
    await http.post<Course>("/admin/courses", body),
  );
},
async update(id: number, body: UpdateCoursePayload) {
  return requireCourseManagementData(
    await http.put<Course>(`/admin/courses/${id}`, body),
  );
},
```

Apply the corresponding `CourseUnit`, `CourseLesson`, `LessonChallenge`, and
`LessonChallengeOption` types and their exact Payload/Response/QueryParams
names to the other four adapters. Preserve `/admin/challengeOptions` camelCase.

- [ ] **Step 5: Migrate hooks and ViewModels to root names**

Use `Course`, `CourseUnit`, `CourseLesson`, `LessonChallenge`, and
`LessonChallengeOption` in `course-management.types.ts`:

```ts
export type CourseViewModel = Course;
export type CourseUnitViewModel = CourseUnit & {
  courses?: Pick<Course, "id" | "title">;
};
```

Apply the equivalent canonical names to Lesson, Challenge, and Challenge Option
ViewModels and hook mutation payloads.

- [ ] **Step 6: Replace the dishonest runtime rejection test**

Delete `resource modules reject persistence-shaped responses`. Add:

```ts
test("course resource returns its typed wire response unchanged", async () => {
  const course = { id: 7, title: "English", imageSrc: "/en.svg" };
  const { http } = createHttpStub(course);

  assert.deepEqual(
    await createCourseApi(http).create({ title: "English", imageSrc: "/en.svg" }),
    course,
  );
});
```

The API mapper test from Task 2 owns snake_case rejection/mapping evidence.

- [ ] **Step 7: Run focused Admin verification and verify GREEN**

```powershell
pnpm.cmd --filter @repo/admin test
pnpm.cmd --filter @repo/admin check-types
pnpm.cmd --filter @repo/admin lint
```

Expected: all Admin tests pass, type-check exits 0, and no Course API file
imports Zod or calls `.parse()`.

- [ ] **Step 8: Commit**

```powershell
git add apps/admin
git commit -m "refactor(admin): use typed course resource responses"
```

---

### Task 4: Migrate every Shared caller to the root Interface

**Files:**
- Create: `packages/shared/test/ec-shared-profile.architecture.test.ts`
- Modify: all files returned by `rg -l '@repo/shared/' apps packages` excluding historical docs/specs.
- Modify: `apps/admin/eslint.config.mjs`
- Modify: `apps/api/eslint.config.mjs`

**Interfaces:**
- Consumes: Tasks 1-3 root Shared names.
- Produces: no application source import containing `@repo/shared/`.

- [ ] **Step 1: Write the failing import-boundary architecture test**

```ts
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = join(import.meta.dirname, "../../..");

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? filesUnder(path)
      : /\.(ts|tsx|mjs)$/.test(entry.name)
        ? [path]
        : [];
  });
}

test("application source imports only the EC shared root Interface", () => {
  for (const root of [
    "apps/api/src",
    "apps/admin/app",
    "apps/web/app",
  ]) {
    for (const file of filesUnder(join(repoRoot, root))) {
      const source = readFileSync(file, "utf8");
      assert.equal(source.includes("@repo/shared/"), false, file);
    }
  }
});
```

- [ ] **Step 2: Run the architecture test and verify RED**

```powershell
pnpm.cmd --filter @repo/shared test
```

Expected: FAIL and list remaining API/Admin/Web subpath imports.

- [ ] **Step 3: Migrate remaining API imports**

Change Placement Test imports and any remaining Course import to
`@repo/shared`. Use the new Course names where applicable; all non-Course type
names remain stable.

- [ ] **Step 4: Migrate all Web imports**

For every file returned by:

```powershell
rg -l '@repo/shared/' apps/web/app
```

replace only the module specifier with `@repo/shared`. Preserve imported type
names and runtime constants. Do not change query keys, endpoints, hook behavior,
or UI code.

- [ ] **Step 5: Remove obsolete ESLint subpath enforcement**

Delete `courseContractPaths` from Admin and API ESLint configs. Retain the
private Shared deep-import restrictions:

```js
const privateSharedPatterns = [
  {
    group: [
      "@repo/shared/src/**",
      "@repo/shared/dist/**",
      "**/packages/shared/src/**",
    ],
    message: "Import only declared @repo/shared package exports.",
  },
];
```

- [ ] **Step 6: Run cross-runtime verification and verify GREEN**

```powershell
pnpm.cmd --filter @repo/shared test
pnpm.cmd --filter @repo/shared check-types
pnpm.cmd --filter @repo/api check-types
pnpm.cmd --filter @repo/admin check-types
pnpm.cmd --filter @repo/web check-types
pnpm.cmd --filter @repo/api lint
pnpm.cmd --filter @repo/admin lint
pnpm.cmd --filter @repo/web lint
```

Expected: all commands exit 0 and the import-boundary test passes.

- [ ] **Step 7: Commit**

```powershell
git add apps packages/shared/test/ec-shared-profile.architecture.test.ts
git commit -m "refactor(shared): migrate consumers to root interface"
```

---

### Task 5: Remove legacy contracts, subpaths, and Shared Zod

**Files:**
- Modify: `packages/shared/test/ec-shared-profile.architecture.test.ts`
- Modify: `packages/shared/test/courses/package-exports.test.ts` (move to `packages/shared/test/package-exports.test.ts`)
- Delete: `packages/shared/test/courses/course.contract.test.ts`
- Delete: `packages/shared/src/contracts.ts`
- Delete: legacy capability directories listed in the File map.
- Modify: `packages/shared/package.json`
- Modify: `apps/admin/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: all root imports completed in Task 4.
- Produces: final EC Shared filesystem with root-only package exports and no Shared/Admin Course Zod dependency.

- [ ] **Step 1: Extend the architecture test and verify RED**

Add `existsSync` to the architecture test's `node:fs` import, define
`const sharedRoot = join(repoRoot, "packages/shared");`, then add:

```ts
test("shared has no transitional contract layout", () => {
  for (const path of [
    "src/contracts.ts",
    "src/courses",
    "src/dashboard",
    "src/flashcards",
    "src/learning",
    "src/placement-test",
    "src/practice",
    "src/progress",
    "src/review",
    "src/vocabulary",
  ]) {
    assert.equal(existsSync(join(sharedRoot, path)), false, path);
  }

  const packageJson = JSON.parse(
    readFileSync(join(sharedRoot, "package.json"), "utf8"),
  ) as {
    exports: Record<string, unknown>;
    dependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(packageJson.exports), ["."]);
  assert.equal(packageJson.dependencies?.zod, undefined);
});
```

Run `pnpm.cmd --filter @repo/shared test`; expected FAIL because legacy files,
subpaths, and Zod still exist.

- [ ] **Step 2: Replace Course package-export tests with root tests**

Move the test file to `packages/shared/test/package-exports.test.ts` and use:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { CEFR_LEVELS, type Course } from "@repo/shared";

test("the declared shared root package Interface resolves", () => {
  const course: Course = { id: 1, title: "English", imageSrc: "/en.svg" };
  assert.equal(course.title, "English");
  assert.equal(CEFR_LEVELS[0], "A1");
});

test("the package blocks private deep imports", async () => {
  await assert.rejects(
    () => import("@repo/shared/src/types/course"),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
  );
});
```

- [ ] **Step 3: Delete legacy Shared implementation**

Delete `contracts.ts`, every legacy capability directory listed above, and the
Zod Course contract tests. Before deletion, verify `rg -n 'contracts\.js|course\.contract' packages/shared/src apps` returns no callers outside the files being deleted.

- [ ] **Step 4: Collapse package exports and remove dependencies**

`packages/shared/package.json` keeps only:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

Change Shared's `architecture:check` script to:

```json
"architecture:check": "tsx --test test/ec-shared-profile.architecture.test.ts"
```

Remove `zod` from Shared dependencies. Run `rg -n 'from "zod"|from '\''zod'\''' apps/admin`; if it returns no usages, remove `zod` from Admin. Keep API Zod.

- [ ] **Step 5: Refresh the lockfile without changing unrelated versions**

```powershell
pnpm.cmd install --lockfile-only --offline
```

Expected: exit 0 and only dependency edges made unused by package changes are
removed from `pnpm-lock.yaml`.

- [ ] **Step 6: Run Shared and cross-runtime verification and verify GREEN**

```powershell
pnpm.cmd --filter @repo/shared test
pnpm.cmd --filter @repo/shared architecture:check
pnpm.cmd --filter @repo/shared check-types
pnpm.cmd --filter @repo/api check-types
pnpm.cmd --filter @repo/admin check-types
pnpm.cmd --filter @repo/web check-types
```

Expected: all commands exit 0; no legacy Shared directory or capability import
remains.

- [ ] **Step 7: Commit**

```powershell
git add packages/shared apps/admin/package.json pnpm-lock.yaml
git commit -m "refactor(shared): remove legacy contract profile"
```

---

### Task 6: Record and enforce the EC Shared decision in current docs

**Files:**
- Create: `docs/adr/0021-ec-shared-typescript-profile.md`
- Modify: `AGENTS.md`
- Modify: `docs/architecture/codebase-structure.md`
- Modify: `docs/architecture/course-content.md`
- Modify: `docs/frontend-folder-structure.md`
- Modify: `docs/frontend-api-calls.md`
- Modify: `docs/frontend-route-template.md`

**Interfaces:**
- Consumes: final Task 5 filesystem and import convention.
- Produces: one documented rule for Shared placement and the supersession link for ADRs 0012/0013.

- [ ] **Step 1: Create ADR 0021**

The ADR records:

```markdown
# ADR 0021: EC Shared TypeScript-Only Profile

## Status

Accepted

## Decision

`packages/shared` follows the EC shared profile: domain TypeScript declarations
live in `src/types`, runtime values live in `src/constants`, and consumers use
the root `@repo/shared` Interface. Shared does not validate HTTP responses at
runtime. API mappers and Nest DTOs own producer and request validation; mapper,
resource, and integration tests protect the wire shape.

Capability subpath exports, `src/contracts.ts`, `*.contract.ts`, and Shared Zod
wire schemas are forbidden. This supersedes only the Shared naming/export
sections of ADR 0012 and ADR 0013; their domain ownership and HTTP compatibility
decisions remain accepted.
```

Include consequences: simpler EC navigation, loss of runtime response parsing,
mandatory typed mapper/resource tests, and future HTTP/UI work remaining
separate.

- [ ] **Step 2: Update current contributor rules**

Replace instructions that require `@repo/shared/<capability>` or
`*.contract.ts` with:

```text
Cross-runtime TypeScript types import from @repo/shared.
Shared domain types live in packages/shared/src/types/<domain>.ts.
Shared runtime constants live in packages/shared/src/constants/<domain>.ts.
Shared index.ts files export only and contain no behavior.
Prisma types, Nest DTO classes, frontend ViewModels, and browser transport do not belong in Shared.
```

Do not rewrite historical plans/specs or old ADR text; ADR 0021 documents
supersession.

- [ ] **Step 3: Verify current docs contain no active old rule**

```powershell
rg -n '@repo/shared/|course\.contract|src/contracts\.ts' AGENTS.md docs/architecture docs/frontend-*.md
```

Expected: no active-current documentation prescribes old subpaths/contracts.
References inside ADR history, the approved design spec, and prior plans are
allowed.

- [ ] **Step 4: Run documentation-adjacent architecture checks**

```powershell
pnpm.cmd architecture:check
git diff --check
```

Expected: both exit 0. Turbo may print the known linked-worktree cache warning,
but no task may fail.

- [ ] **Step 5: Commit**

```powershell
git add AGENTS.md docs
git commit -m "docs(shared): adopt EC TypeScript-only profile"
```

---

### Task 7: Run complete repository verification

**Files:**
- Verify only; modify no files unless a gate exposes a regression owned by Tasks 1-6.

**Interfaces:**
- Consumes: completed Shared root Interface and all migrated callers.
- Produces: fresh evidence that the entire monorepo builds and tests on the final tree.

- [ ] **Step 1: Generate Prisma Client for the linked worktree**

```powershell
pnpm.cmd --filter @repo/api db:generate
```

Expected: Prisma Client generation exits 0 without applying migrations or
touching database data.

- [ ] **Step 2: Run all repository gates sequentially**

```powershell
pnpm.cmd architecture:check
pnpm.cmd test
pnpm.cmd check-types
pnpm.cmd lint
pnpm.cmd build
```

Expected: every command exits 0. The known Turbo linked-worktree IO warning and
Next workspace-root warning are environmental; test, type, lint, and build task
failures are not acceptable.

- [ ] **Step 3: Inspect final structure and forbidden patterns**

```powershell
rg --files packages/shared/src
rg -n '@repo/shared/|contracts\.js|course\.contract|CourseDtoSchema|PaginatedCoursesDtoSchema' apps packages/shared/src --glob '!**/node_modules/**' --glob '!**/dist/**'
rg -n 'from "zod"|\.parse\(' apps/admin/app/features/courses packages/shared/src
git diff --check
git status --short
```

Expected:

- Shared source contains only `constants`, `types`, and root `index.ts`;
- no application import uses a Shared capability subpath;
- no Course response schema or parsing remains;
- `git diff --check` is empty;
- `git status --short` is empty because each task committed its checkpoint.
