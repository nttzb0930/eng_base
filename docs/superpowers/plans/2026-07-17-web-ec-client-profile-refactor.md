# Web EC Client Profile Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the learner Web runtime from mixed `app`/`src` domain buckets and authenticated Server Component fetching to the approved EC-derived client-side `app/features` + `app/views` profile.

**Architecture:** Localized Next routes stay thin and compose Views. Authenticated Views are Client Components that use capability-owned TanStack Query hooks and singular resource `.api.ts` adapters backed by one existing browser HTTP client. Server execution remains only where Next.js or next-intl requires it, such as route params, metadata, locale setup, and public/static rendering; authenticated API requests do not use `cookies()` or a parallel server client.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, TanStack Query 5, Axios 1, next-intl 4, Zustand 5, Node test runner through `tsx --test`.

## Global Constraints

- Scope is `apps/web` plus frontend-structure documentation; do not change `apps/api`, Prisma, migrations, seeds, vocabulary data, or shared wire contracts.
- Preserve all localized URLs, query strings, HTTP paths, methods, bodies, response semantics, access/refresh behavior, and visible learning behavior.
- Authenticated data is loaded in the browser. Do not create `*.server.ts`, `*.client.ts`, `api-request.server.ts`, `api-request.client.ts`, `platform`, or `app/lib/http`.
- Each addressed resource uses one singular adapter such as `course.api.ts`, `lesson.api.ts`, `progress.api.ts`, or `vocabulary.api.ts`.
- Routes render Views. Views compose feature hooks. Feature hooks call their owning resource API.
- Keep `src/lib/web-http-client.ts` as the single cross-cutting browser transport for this scope.
- `next/headers` is allowed only for next-intl request configuration or other framework-owned public rendering, never for authenticated API data.
- Keep schema, state, types, constants, and components under their capability owner unless independent capabilities actually share them.
- Locale-aware navigation must use `withLocale`/`LocalizedLink`; a protected redirect may not drop the active locale.
- Do not leave forwarding facades in `src/modules` or `src/services`; remove old implementations after their consumers move.
- Add characterization tests before each migration, run the narrow red/green cycle, then commit the completed vertical slice.

---

## File and Interface Map

Application-wide runtime and presentation:

```text
app/config/
app/i18n/
app/messages/
app/components/ui/
app/components/layout/
app/components/navigation/
app/components/feedback/
app/hooks/
app/schema/
app/store/
app/utils/
app/providers.tsx
src/lib/web-http-client.ts             retained browser transport
```

Capability resource Interfaces:

```text
app/features/auth/api/auth.api.ts
app/features/courses/api/course.api.ts
app/features/courses/api/unit.api.ts
app/features/dashboard/api/dashboard.api.ts
app/features/flashcards/api/flashcard.api.ts
app/features/lessons/api/lesson.api.ts
app/features/placement-test/api/placement-test.api.ts
app/features/practice/api/practice.api.ts
app/features/progress/api/progress.api.ts
app/features/review/api/review.api.ts
app/features/topics/api/topic.api.ts
app/features/vocabulary/api/vocabulary.api.ts
```

There is no `learning` aggregate API. Course, Unit, Lesson, Progress,
Leaderboard, Topic, Vocabulary, Review, Practice, Flashcard, and Placement Test
retain their own external HTTP Interfaces.

### Task 1: Establish the app-owned shared frame and protect browser transport behavior

**Files:**
- Create: `apps/web/test/ec-feature-architecture.test.ts`
- Create: `apps/web/test/web-http-client.test.ts`
- Move: `apps/web/src/config/index.ts` -> `apps/web/app/config/index.ts`
- Move: `apps/web/src/i18n/request.ts` -> `apps/web/app/i18n/request.ts`
- Move: `apps/web/src/lib/i18n/config.ts` -> `apps/web/app/i18n/config.ts`
- Move: `apps/web/src/lib/i18n/paths.ts` -> `apps/web/app/i18n/paths.ts`
- Move: `apps/web/src/lib/i18n/server.ts` -> `apps/web/app/i18n/server.ts`
- Move: `apps/web/src/lib/i18n/use-current-locale.ts` -> `apps/web/app/i18n/use-current-locale.ts`
- Move: `apps/web/src/lib/i18n/use-localized-challenge-question.ts` -> `apps/web/app/i18n/use-localized-challenge-question.ts`
- Move: `apps/web/src/messages/en.json` -> `apps/web/app/messages/en.json`
- Move: `apps/web/src/messages/vi.json` -> `apps/web/app/messages/vi.json`
- Move: `apps/web/src/lib/utils.ts` -> `apps/web/app/utils/cn.ts`
- Move: `apps/web/src/components/ui/*.tsx` -> `apps/web/app/components/ui/*.tsx`
- Move shared navigation/layout/feedback files listed below from `src/components` to `app/components`
- Modify: `apps/web/src/lib/web-http-client.ts`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/proxy.ts`
- Modify temporarily: all imports of the moved shared files
- Modify: `apps/web/test/localized-paths.test.ts`

Shared component moves:

```text
src/components/header.tsx                 -> app/components/navigation/Header.tsx
src/components/mobile-header.tsx          -> app/components/navigation/MobileHeader.tsx
src/components/mobile-sidebar.tsx         -> app/components/navigation/MobileSidebar.tsx
src/components/sidebar.tsx                -> app/components/navigation/Sidebar.tsx
src/components/sidebar-item.tsx           -> app/components/navigation/SidebarItem.tsx
src/components/localized-link.tsx         -> app/components/navigation/LocalizedLink.tsx
src/components/feed-wrapper.tsx           -> app/components/layout/FeedWrapper.tsx
src/components/sticky-wrapper.tsx         -> app/components/layout/StickyWrapper.tsx
src/components/scroll-to-top-button.tsx   -> app/components/navigation/ScrollToTopButton.tsx
src/components/route-skeletons.tsx        -> app/components/feedback/RouteSkeletons.tsx
```

Do not move `auth-redirector`, the three domain modals, Vocabulary components,
UserProgress, or DiscoveryTabs in this task; their owners migrate later.

**Interfaces:**
- Produces: app-owned i18n/navigation/UI imports and `reviveApiDates(value)` in the retained browser HTTP transport.
- Preserves: `webHttpClient`, `setOnUnauthenticated`, single-flight refresh, 15-second timeout, credentials, and current auth headers.

- [ ] **Step 1: Write failing architecture and date-revival tests**

Create `test/ec-feature-architecture.test.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Web shared presentation and i18n live under app", () => {
  for (const path of [
    "app/components/ui/button.tsx",
    "app/components/navigation/LocalizedLink.tsx",
    "app/components/layout/FeedWrapper.tsx",
    "app/components/feedback/RouteSkeletons.tsx",
    "app/i18n/config.ts",
    "app/i18n/paths.ts",
    "app/i18n/request.ts",
    "app/messages/en.json",
    "app/messages/vi.json",
    "app/utils/cn.ts",
  ]) assert.equal(existsSync(join(root, path)), true, `${path} must exist`);

  for (const path of ["src/components/ui", "src/lib/i18n", "src/i18n", "src/messages", "src/lib/utils.ts"])
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
});
```

Create `test/web-http-client.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { reviveApiDates } from "../src/lib/web-http-client";

test("browser API transport preserves the previous ISO date revival behavior", () => {
  const value = reviveApiDates({
    nextReviewAt: "2026-07-17T01:02:03.000Z",
    nested: [{ createdAt: "2026-07-16T01:02:03Z", label: "A1" }],
  }) as { nextReviewAt: Date; nested: Array<{ createdAt: Date; label: string }> };
  assert.equal(value.nextReviewAt instanceof Date, true);
  assert.equal(value.nested[0]?.createdAt instanceof Date, true);
  assert.equal(value.nested[0]?.label, "A1");
});
```

- [ ] **Step 2: Run tests and verify red**

```bash
pnpm --filter @repo/web exec tsx --test test/ec-feature-architecture.test.ts test/web-http-client.test.ts
```

Expected: FAIL because app-owned files and `reviveApiDates` do not exist.

- [ ] **Step 3: Move shared files and update imports**

Use `git mv` for every listed path. Replace imports globally:

```ts
@/src/components/ui/<module>  -> @/app/components/ui/<module>
@/src/components/localized-link -> @/app/components/navigation/LocalizedLink
@/src/components/feed-wrapper   -> @/app/components/layout/FeedWrapper
@/src/components/sticky-wrapper -> @/app/components/layout/StickyWrapper
@/src/lib/i18n/<module>         -> @/app/i18n/<module>
@/src/lib/utils                 -> @/app/utils/cn
@/src/config                    -> @/app/config
```

Update `next.config.ts`:

```ts
const withNextIntl = createNextIntlPlugin("./app/i18n/request.ts");
```

Update `app/i18n/request.ts` imports to `@/app/i18n/config` and load messages
from `../messages/${locale}.json`. Update `localized-paths.test.ts` and
`proxy.ts` to import `app/i18n`.

- [ ] **Step 4: Add recursive date revival to the existing browser client**

Add before interceptor registration in `src/lib/web-http-client.ts`:

```ts
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function reviveApiDates(value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE.test(value)) return new Date(value);
  if (Array.isArray(value)) return value.map(reviveApiDates);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, reviveApiDates(item)]),
    );
  }
  return value;
}
```

The success response interceptor must set `response.data = reviveApiDates(response.data)`
before returning the response. Keep the current 401 retry branch unchanged in
this task.

- [ ] **Step 5: Run narrow verification**

```bash
pnpm --filter @repo/web exec tsx --test test/ec-feature-architecture.test.ts test/web-http-client.test.ts test/localized-paths.test.ts test/proxy.test.ts
pnpm --filter @repo/web check-types
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "refactor(web): establish app-owned shared frame"
```

### Task 2: Migrate browser Auth and Providers under the Auth owner

**Files:**
- Create: `apps/web/app/features/auth/api/auth.api.ts`
- Create: `apps/web/app/features/auth/store/auth-session.store.ts`
- Create: `apps/web/app/features/auth/hooks/use-auth.ts`
- Create: `apps/web/app/features/auth/types/auth.types.ts`
- Create: `apps/web/app/features/auth/tests/auth.api.test.ts`
- Move: `apps/web/src/providers.tsx` -> `apps/web/app/providers.tsx`
- Move/rename: `apps/web/src/views/auth/SignInPage.tsx` -> `apps/web/app/views/auth/SignInView.tsx`
- Move/rename: `apps/web/src/views/auth/SignUpPage.tsx` -> `apps/web/app/views/auth/SignUpView.tsx`
- Modify: `apps/web/src/lib/web-http-client.ts`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/[locale]/(auth)/sign-in/page.tsx`
- Modify: `apps/web/app/[locale]/(auth)/sign-up/page.tsx`
- Modify: `apps/web/test/ec-feature-architecture.test.ts`
- Delete: `apps/web/src/services/auth/auth.service.ts`
- Delete: `apps/web/src/stores/auth-session.store.ts`

**Interfaces:**
- Produces: `authApi.login/register/refresh/logout`, Auth session store functions, `Providers`, and `useAuth`.
- Consumes: `webHttpClient`, `withLocale`, `useCurrentLocale`.

- [ ] **Step 1: Write the failing Auth API test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createAuthApi } from "../api/auth.api";

test("Learner Auth preserves browser endpoints and payloads", async () => {
  const requests: unknown[] = [];
  const http = {
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: { access_token: "token", user: { id: "1" } } as T };
    },
  };
  const api = createAuthApi(http);
  await api.login({ username: "learner", password: "secret" });
  await api.register({ username: "learner", email: "l@example.com", password: "secret", fullName: "Learner" });
  await api.refresh();
  await api.logout();
  assert.deepEqual(requests, [
    { method: "POST", path: "/auth/login", body: { username: "learner", password: "secret" } },
    { method: "POST", path: "/auth/register", body: { username: "learner", email: "l@example.com", password: "secret", fullName: "Learner" } },
    { method: "POST", path: "/auth/refresh", body: undefined },
    { method: "POST", path: "/auth/logout", body: undefined },
  ]);
});
```

- [ ] **Step 2: Run the test and verify red**

```bash
pnpm --filter @repo/web exec tsx --test app/features/auth/tests/auth.api.test.ts
```

Expected: FAIL because `createAuthApi` does not exist.

- [ ] **Step 3: Implement Auth ownership and locale-safe session handling**

Move `AuthUser`, request, response, and store shapes to Auth. Implement an
injectable `createAuthApi(http)` with the four existing POST endpoints and
export `authApi = createAuthApi(webHttpClient)`.

Move Providers to `app/providers.tsx` and import Auth only from
`app/features/auth`. Because Providers is mounted outside the locale-specific
`NextIntlClientProvider`, derive the locale from `usePathname()` rather than
calling `useCurrentLocale`:

```ts
const pathname = usePathname();
const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
const locale = isLocale(firstSegment) ? firstSegment : defaultLocale;
router.replace(withLocale("/sign-in", locale));
```

Before calling refresh on mount, check the same non-sensitive refresh marker
used by `proxy.ts`:

```ts
const hasRefreshSession = () =>
  typeof document !== "undefined" &&
  document.cookie.split(";").some((item) => item.trim() === "client_has_rt=1");
```

If the marker is absent, clear the local session and set status to
`unauthenticated` without sending `/auth/refresh`. Keep single-flight refresh in
the HTTP interceptor. Update that client to import store functions from
`@/app/features/auth/store/auth-session.store`.

Move the two existing form UIs to `app/views/auth`, change only imports, and
make routes thin:

```tsx
import { SignInView } from "@/app/views/auth/SignInView";
export default function SignInPage() { return <SignInView />; }
```

Use the equivalent code for Sign Up. Update root layout to
`@/app/providers`. Extend the architecture test to reject `src/services/auth`,
`src/stores/auth-session.store.ts`, and `src/views/auth`.

- [ ] **Step 4: Run narrow verification**

```bash
pnpm --filter @repo/web exec tsx --test app/features/auth/tests/auth.api.test.ts test/ec-feature-architecture.test.ts test/proxy.test.ts
pnpm --filter @repo/web check-types
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "refactor(web): migrate auth to EC client profile"
```

### Task 3: Migrate Courses and learner Progress; remove authenticated layout fetches

**Files:**
- Create: `apps/web/app/features/courses/api/course.api.ts`
- Create: `apps/web/app/features/courses/hooks/use-courses.ts`
- Create: `apps/web/app/features/courses/components/CourseCard.tsx`
- Create: `apps/web/app/features/courses/tests/course.api.test.ts`
- Create: `apps/web/app/features/progress/api/progress.api.ts`
- Create: `apps/web/app/features/progress/hooks/use-user-progress.ts`
- Create: `apps/web/app/features/placement-test/components/PlacementConfirmationGuard.tsx`
- Create: `apps/web/app/features/progress/tests/progress.api.test.ts`
- Create: `apps/web/app/components/layout/LearnerShell.tsx`
- Move/merge: `apps/web/src/views/courses/CoursesPage.tsx` and `CoursesView.tsx` -> `apps/web/app/views/courses/CoursesView.tsx`
- Move: `apps/web/src/views/courses/components/card.tsx` -> `apps/web/app/features/courses/components/CourseCard.tsx`
- Move: `apps/web/src/views/courses/hooks/useCourses.ts` -> `apps/web/app/features/courses/hooks/use-course-selection.ts`
- Modify: `apps/web/app/[locale]/(main)/courses/page.tsx`
- Modify: `apps/web/app/[locale]/(main)/layout.tsx`
- Modify: `apps/web/app/[locale]/lesson/layout.tsx`
- Delete after consumers move: duplicated Progress functions from `src/modules/progress`, `src/services/progress`, and the Course/Progress members of `src/modules/learning/queries.ts`

**Interfaces:**
- `courseApi.list(): Promise<Course[]>`, `courseApi.detail(id)`.
- `progressApi.getUserProgress`, `selectCourse`, `getCourseProgress`, `getLessonPercentage`, `completeChallenge`, `reduceHearts`, `refillHearts`, `resetLesson`.
- Query keys: `courseKeys.all`, `progressKeys.user`, `progressKeys.course`, `progressKeys.lessonPercentage`.

- [ ] **Step 1: Write failing Course and Progress API tests**

Characterize these exact calls:

```ts
// course.api.test.ts expected requests
[
  { method: "GET", path: "/courses" },
  { method: "GET", path: "/courses/7" },
]

// progress.api.test.ts expected requests
[
  { method: "GET", path: "/progress/user-progress" },
  { method: "GET", path: "/progress/course-progress" },
  { method: "GET", path: "/progress/lesson-percentage" },
  { method: "POST", path: "/progress/courses/2" },
  { method: "POST", path: "/progress/challenges/3" },
  { method: "POST", path: "/progress/hearts/3/reduce" },
  { method: "POST", path: "/progress/hearts/refill" },
  { method: "POST", path: "/progress/lessons/4/reset" },
]
```

Each test injects an Axios-shaped stub returning `{data: value}` and asserts the
adapter returns `response.data`.

- [ ] **Step 2: Run tests and verify red**

```bash
pnpm --filter @repo/web exec tsx --test app/features/courses/tests/course.api.test.ts app/features/progress/tests/progress.api.test.ts
```

Expected: FAIL because the resource APIs do not exist.

- [ ] **Step 3: Implement resource APIs and hooks**

Use one browser adapter per resource:

```ts
export const courseKeys = { all: ["courses"] as const, detail: (id: number) => ["courses", id] as const };
export const progressKeys = {
  all: ["progress"] as const,
  user: ["progress", "user"] as const,
  course: ["progress", "course"] as const,
  lessonPercentage: ["progress", "lesson-percentage"] as const,
};
```

`useSelectCourse` must invalidate `progressKeys.all` and `courseKeys.all` after
`progressApi.selectCourse(courseId)`. Other progress mutations preserve current
error unions and invalidate only the progress keys whose displayed data change.

- [ ] **Step 4: Convert Courses and protected layouts to client composition**

`CoursesView` is a Client Component. It calls `useCourses()` and
`useUserProgress()`, renders the existing route skeleton while either query is
loading, and passes `activeCourseId` into the existing Course selection UI.

The route becomes:

```tsx
import { CoursesView } from "@/app/views/courses/CoursesView";
export default function CoursesPage() { return <CoursesView />; }
```

Create `LearnerShell` as a Client Component. It waits for `useAuth().status`,
then `useUserProgress()`. If unauthenticated, render the route skeleton while
Providers performs locale-safe navigation. If progress exists but
`isPlacementTestConfirmed` is false, call
`router.replace(withLocale("/placement-test", locale))` in an effect. Otherwise
render Header, MobileHeader, ScrollToTopButton, and children.

Both `(main)/layout.tsx` and `lesson/layout.tsx` stop importing
`src/modules/learning/queries` and `next/navigation` redirects. The main layout
renders `LearnerShell`; the lesson layout renders a small client
`PlacementConfirmationGuard` around its existing full-height container.

- [ ] **Step 5: Run narrow verification and commit**

```bash
pnpm --filter @repo/web exec tsx --test app/features/courses/tests/course.api.test.ts app/features/progress/tests/progress.api.test.ts test/route-architecture.test.ts
pnpm --filter @repo/web check-types
git add apps/web
git commit -m "refactor(web): move courses and progress to client features"
```

### Task 4: Migrate Unit/Lesson learning flow to client feature Interfaces

**Files:**
- Create: `apps/web/app/features/courses/api/unit.api.ts`
- Create: `apps/web/app/features/courses/hooks/use-units.ts`
- Create: `apps/web/app/features/lessons/api/lesson.api.ts`
- Create: `apps/web/app/features/lessons/hooks/use-lesson.ts`
- Create: `apps/web/app/features/lessons/tests/lesson.api.test.ts`
- Move: `apps/web/src/views/learn/components/*` -> `apps/web/app/features/courses/components/*`
- Move: `apps/web/src/views/learn/LearnView.tsx` -> `apps/web/app/views/learn/LearnView.tsx`
- Replace: `apps/web/src/views/learn/LearnPage.tsx` with client orchestration in `LearnView`
- Move/rename: `src/views/lesson/card.tsx` -> `app/features/lessons/components/LessonCard.tsx`
- Move/rename: `src/views/lesson/challenge.tsx` -> `app/features/lessons/components/LessonChallenge.tsx`
- Move/rename: `src/views/lesson/footer.tsx` -> `app/features/lessons/components/LessonFooter.tsx`
- Move/rename: `src/views/lesson/header.tsx` -> `app/features/lessons/components/LessonHeader.tsx`
- Move/rename: `src/views/lesson/question-bubble.tsx` -> `app/features/lessons/components/QuestionBubble.tsx`
- Move/rename: `src/views/lesson/QuizView.tsx` -> `app/features/lessons/components/LessonQuiz.tsx`
- Move/rename: `src/views/lesson/LessonCompleteView.tsx` -> `app/features/lessons/components/LessonComplete.tsx`
- Move/rename: `src/views/lesson/hooks/useQuiz.ts` -> `app/features/lessons/hooks/use-lesson-quiz.ts`
- Move/rename: `src/views/lesson/result-card.tsx` -> `app/components/feedback/SessionResultItem.tsx`
- Create: `apps/web/app/views/lessons/LessonView.tsx`
- Modify: `apps/web/app/[locale]/(main)/learn/page.tsx`
- Modify: `apps/web/app/[locale]/lesson/page.tsx`
- Modify: `apps/web/app/[locale]/lesson/[lessonId]/page.tsx`
- Delete after consumers move: remaining Unit/Lesson members of `src/modules/learning/queries.ts`

**Interfaces:**
- `unitApi.list(): Promise<UnitWithLessons[]>`.
- `lessonApi.get(id?: number): Promise<LessonDetails | null>`.
- `useUnits`, `useLesson(id)`, and existing lesson-session mutations through `progressApi`.

- [ ] **Step 1: Write failing resource tests**

Create a table-driven test that asserts:

```ts
await unitApi.list();      // GET /units
await lessonApi.get();     // GET /lessons
await lessonApi.get(7);    // GET /lessons?id=7
```

Expected recorded paths are exactly `/units`, `/lessons`, and `/lessons?id=7`.

- [ ] **Step 2: Run red, implement adapters, run green**

```bash
pnpm --filter @repo/web exec tsx --test app/features/lessons/tests/lesson.api.test.ts
```

Implement `unitKeys`, `lessonKeys`, `useUnits`, and `useLesson` using TanStack
Query, then rerun the same command. Expected: PASS.

- [ ] **Step 3: Convert Learn and Lesson Views**

`LearnView` reads the `unit` search param with `useSearchParams`, calls
`useUserProgress`, `useUnits`, `useCourseProgress`, and
`useLessonPercentage`, then preserves the existing placement-test redirect and
existing JSX. It uses client `useTranslations`, not `getLocale` or
`next-intl/server`.

`LessonView` accepts `lessonId?: number`, calls `useLesson`, `useUnits`, and
`useUserProgress`, computes the existing completed percentage and next lesson,
then renders the migrated Quiz component. While loading it renders
`SessionPageSkeleton`; missing data navigates to locale-aware `/learn`.

Routes stay data-free:

```tsx
// lesson/page.tsx
import { LessonView } from "@/app/views/lessons/LessonView";
export default function LessonPage() { return <LessonView />; }

// lesson/[lessonId]/page.tsx
import { LessonView } from "@/app/views/lessons/LessonView";
export default async function LessonByIdPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <LessonView lessonId={Number(lessonId)} />;
}
```

Update the migrated quiz imports to the exact PascalCase files listed above.
Import `MAX_HEARTS` directly from `@repo/shared/progress` in
`use-lesson-quiz.ts`; do not recreate the root `src/constants.ts` barrel. Keep
only the route-level `LessonView` under `app/views/lessons`.

- [ ] **Step 4: Verify and commit**

```bash
pnpm --filter @repo/web exec tsx --test app/features/lessons/tests/lesson.api.test.ts test/route-architecture.test.ts
pnpm --filter @repo/web check-types
git add apps/web
git commit -m "refactor(web): migrate learner course and lesson flow"
```

### Task 5: Migrate Dashboard and Leaderboard read models

**Files:**
- Create: `apps/web/app/features/dashboard/api/dashboard.api.ts`
- Create: `apps/web/app/features/dashboard/hooks/use-dashboard.ts`
- Create: `apps/web/app/features/dashboard/tests/dashboard.api.test.ts`
- Create: `apps/web/app/features/leaderboard/api/leaderboard.api.ts`
- Create: `apps/web/app/features/leaderboard/hooks/use-leaderboard.ts`
- Create: `apps/web/app/features/review/api/review.api.ts`
- Create: `apps/web/app/features/review/hooks/use-review.ts`
- Create: `apps/web/app/features/review/tests/review.api.test.ts`
- Move/rename: `src/views/dashboard/DashboardPage.tsx` -> `app/views/dashboard/DashboardView.tsx`
- Move/rename: `src/views/leaderboard/LeaderboardPage.tsx` -> `app/views/leaderboard/LeaderboardView.tsx`
- Modify: Dashboard and Leaderboard routes
- Delete: `src/modules/dashboard/queries.ts` and the Leaderboard member of the legacy learning query module

**Interfaces:**
- `dashboardApi.get(): GET /dashboard`.
- `leaderboardApi.list(): GET /leaderboard`.

- [ ] **Step 1: Characterize both GET requests**

Create pure adapter tests that inject GET stubs and assert these exact paths and
returned `response.data` values:

```text
GET /dashboard
GET /leaderboard
GET /review/daily/summary
```

- [ ] **Step 2: Run red, implement APIs/hooks, run green**

```bash
pnpm --filter @repo/web exec tsx --test app/features/dashboard/tests/dashboard.api.test.ts
```

Expected before implementation: FAIL. After `dashboardApi`, `leaderboardApi`,
`useDashboard`, and `useLeaderboard` exist: PASS.

- [ ] **Step 3: Convert Views without changing presentation**

Dashboard becomes a Client View using `useTranslations("dashboard")`,
`useDashboard`, `useUserProgress`, and the Review summary hook produced in Task
7. To keep this task independently compilable, create the Review summary API
and `useDailyReviewSummary` in Task 5 with only `GET /review/daily/summary`; Task
7 extends the same resource file with challenges. Replace server redirect with
a locale-aware client effect to `/courses`.

Leaderboard becomes a Client View using `useLeaderboard` and existing JSX.
Routes import the new Views directly.

- [ ] **Step 4: Verify and commit**

```bash
pnpm --filter @repo/web exec tsx --test app/features/dashboard/tests/dashboard.api.test.ts test/route-architecture.test.ts
pnpm --filter @repo/web check-types
git add apps/web
git commit -m "refactor(web): migrate dashboard and leaderboard features"
```

### Task 6: Migrate Topics, Vocabulary, and Saved Words

**Files:**
- Create: `apps/web/app/features/topics/api/topic.api.ts`
- Create: `apps/web/app/features/topics/hooks/use-topics.ts`
- Create: `apps/web/app/features/topics/components/DiscoveryTabs.tsx`
- Create: `apps/web/app/features/topics/tests/topic.api.test.ts`
- Create: `apps/web/app/features/vocabulary/api/vocabulary.api.ts`
- Create: `apps/web/app/features/vocabulary/hooks/use-vocabulary.ts`
- Create: `apps/web/app/features/vocabulary/components/VocabularyCard.tsx`
- Create: `apps/web/app/features/vocabulary/components/VocabularyAudioButton.tsx`
- Create: `apps/web/app/features/vocabulary/vocabulary-review-status.ts`
- Create: `apps/web/app/features/vocabulary/tests/vocabulary.api.test.ts`
- Move/rename: `src/views/topics/TopicsPage.tsx` -> `app/views/topics/TopicsView.tsx`
- Move/rename: `src/views/topics/TopicDetailPage.tsx` -> `app/views/topics/TopicDetailView.tsx`
- Move/rename: `src/views/saved-words/SavedWordsPage.tsx` -> `app/views/saved-words/SavedWordsView.tsx`
- Move/rename: `src/views/saved-words/saved-words-explorer.tsx` -> `app/features/vocabulary/components/SavedWordsExplorer.tsx`
- Move: `src/components/user-progress.tsx` -> `app/features/progress/components/UserProgress.tsx`
- Modify: Topics and Saved Words routes
- Delete after migration: `src/modules/topics`, Vocabulary members in `src/modules/learning`, duplicate `src/modules/vocabulary` mutations, and `src/services/vocabulary`

**Interfaces:**
- Topic: `list(): GET /topics`, `detail(slug, level?): GET /topics/:slug?level=`.
- Vocabulary: `listSaved(): GET /vocabulary/saved-words`, `toggleSaved(id)`, `recordReview(id, correct)`, `recordFlashcard(id, rating)`.

- [ ] **Step 1: Write failing Topic and Vocabulary API tests**

Assert exact encoded requests:

```ts
GET  /topics
GET  /topics/travel?level=A1
GET  /vocabulary/saved-words
POST /vocabulary/9/toggle-saved
POST /vocabulary/9/review       { correct: true }
POST /vocabulary/9/flashcard    { rating: "good" }
```

- [ ] **Step 2: Run red, implement adapters/hooks, run green**

```bash
pnpm --filter @repo/web exec tsx --test app/features/topics/tests/topic.api.test.ts app/features/vocabulary/tests/vocabulary.api.test.ts
```

Use `topicKeys` and `vocabularyKeys`. Successful saved/review/rating mutations
invalidate saved words, topics, flashcards, dashboard, and review only where the
current UI consumes changed counts.

- [ ] **Step 3: Convert the four Views**

Use `useTranslations`, `useUserProgress`, `useTopics`, `useTopic(slug, level)`,
and `useSavedWords`. Read slug/level from route props or Next navigation hooks;
do not fetch authenticated data in the route. Replace `notFound()` for a missing
authenticated Topic with the existing localized not-found View or a client
empty/error state; preserve `/topics/:slug`.

Move Vocabulary display components and review-status logic under Vocabulary.
The Task 1 date-revival test protects `nextReviewAt.getTime()` behavior.

- [ ] **Step 4: Verify and commit**

```bash
pnpm --filter @repo/web exec tsx --test app/features/topics/tests/topic.api.test.ts app/features/vocabulary/tests/vocabulary.api.test.ts test/route-architecture.test.ts
pnpm --filter @repo/web check-types
git add apps/web
git commit -m "refactor(web): migrate vocabulary discovery features"
```

### Task 7: Complete Review and migrate Flashcards

**Files:**
- Modify: `apps/web/app/features/review/api/review.api.ts`
- Modify: `apps/web/app/features/review/hooks/use-review.ts`
- Modify: `apps/web/app/features/review/tests/review.api.test.ts`
- Create: `apps/web/app/features/flashcards/api/flashcard.api.ts`
- Create: `apps/web/app/features/flashcards/hooks/use-flashcards.ts`
- Create: `apps/web/app/features/flashcards/flashcard-deck.ts`
- Create: `apps/web/app/features/flashcards/tests/flashcard.api.test.ts`
- Move/rename: `src/views/review/ReviewPage.tsx` -> `app/views/review/ReviewView.tsx`
- Move/rename: `src/views/saved-words/review/SavedWordsReviewPage.tsx` -> `app/views/review/SavedWordsReviewView.tsx`
- Move/rename: `src/views/review/daily-review-quiz.tsx` -> `app/features/review/components/DailyReviewQuiz.tsx`
- Move/rename: `src/views/saved-words/review/review-quiz.tsx` -> `app/features/review/components/SavedWordsReviewQuiz.tsx`
- Move/rename: `src/views/flashcards/FlashcardsPage.tsx` -> `app/views/flashcards/FlashcardsView.tsx`
- Move/rename: `src/views/flashcards/FlashcardSessionPage.tsx` -> `app/views/flashcards/FlashcardSessionView.tsx`
- Move/rename: `src/views/flashcards/flashcard-session.tsx` -> `app/features/flashcards/components/FlashcardSession.tsx`
- Delete: `src/modules/review`, `src/modules/flashcards`, and `src/modules/vocabulary/review-session.ts`

**Interfaces:**
- Review: daily summary/challenges and saved summary/challenges with `mode=all|due`.
- Flashcards: summary and session items with encoded `deck`.

- [ ] **Step 1: Characterize all read endpoints**

Tests assert:

```text
GET /review/daily/summary
GET /review/daily/challenges
GET /review/saved/summary
GET /review/saved/challenges?mode=due
GET /flashcards/summary
GET /flashcards/session?deck=saved
```

Also unit-test `normalizeFlashcardDeck` for `due`, `saved`, `weak`, A1-B2, and an
invalid value falling back to `due`.

- [ ] **Step 2: Run red, implement APIs/hooks/helpers, run green**

```bash
pnpm --filter @repo/web exec tsx --test app/features/review/tests/review.api.test.ts app/features/flashcards/tests/flashcard.api.test.ts
```

Expected after implementation: PASS.

- [ ] **Step 3: Convert Views and keep session ownership local**

Review and Flashcard Views become Client Components, use client translations,
wait for query data, and preserve current redirects/empty states. Move
`daily-review-quiz.tsx` under Review, `review-quiz.tsx` under Review, and
`flashcard-session.tsx` under Flashcards. Shared visual result rows used by more
than one independent learning feature go under
`app/components/feedback/SessionResultItem.tsx`; feature state and persistence
must not move there.

- [ ] **Step 4: Verify and commit**

```bash
pnpm --filter @repo/web exec tsx --test app/features/review/tests/review.api.test.ts app/features/flashcards/tests/flashcard.api.test.ts test/route-architecture.test.ts
pnpm --filter @repo/web check-types
git add apps/web
git commit -m "refactor(web): migrate review and flashcards features"
```

### Task 8: Migrate Practice modes and session-result persistence

**Files:**
- Create: `apps/web/app/features/practice/api/practice.api.ts`
- Create: `apps/web/app/features/practice/hooks/use-practice.ts`
- Create: `apps/web/app/features/practice/practice-level.ts`
- Create: `apps/web/app/features/practice/types/practice-session.types.ts`
- Create: `apps/web/app/features/practice/tests/practice.api.test.ts`
- Move/rename: `src/views/practice/PracticePage.tsx` -> `app/views/practice/PracticeView.tsx`
- Move/rename: `src/views/practice/fill-blank/FillBlankPracticePage.tsx` -> `app/views/practice/FillBlankPracticeView.tsx`
- Move/rename: `src/views/practice/listening/ListeningPracticePage.tsx` -> `app/views/practice/ListeningPracticeView.tsx`
- Move/rename: `src/views/practice/dictation/DictationPracticePage.tsx` -> `app/views/practice/DictationPracticeView.tsx`
- Move/rename: `src/views/practice/weak-words/WeakWordsPracticePage.tsx` -> `app/views/practice/WeakWordsPracticeView.tsx`
- Move: each mode's `practice-quiz.tsx` -> matching `app/features/practice/<mode>/PracticeQuiz.tsx`
- Move: `src/views/practice/practice-session-shell.tsx` -> `app/features/practice/components/PracticeSessionShell.tsx`
- Move: `src/views/practice/practice-result.tsx` -> `app/features/practice/components/PracticeResult.tsx`
- Move: `src/views/practice/practice-unit.tsx` -> `app/features/practice/components/PracticeUnit.tsx`
- Move: `src/views/practice/practice-lesson-button.tsx` -> `app/features/practice/components/PracticeLessonButton.tsx`
- Move: `src/views/practice/practice-config.ts` -> `app/features/practice/practice-config.ts`
- Move: `src/components/modals/practice-modal.tsx` -> `app/features/practice/components/PracticeModal.tsx`
- Move: `src/stores/use-practice-modal.ts` -> `app/features/practice/store/practice-modal.store.ts`
- Delete: `src/modules/practice` and `src/services/practice`

**Interfaces:**
- Summary/challenge reads for fill-blank, listening, dictation, and weak words.
- `recordSession(input): POST /practice/sessions`.
- `PRACTICE_CEFR_LEVELS`, `PRACTICE_WORDS_PER_LESSON`, level/lesson normalizers.

- [ ] **Step 1: Write the failing table-driven Practice API test**

The test must cover:

```text
GET  /practice/fill-blank/summary
GET  /practice/fill-blank/challenges?level=A1&lesson=2
GET  /practice/listening/summary
GET  /practice/listening/challenges?level=A2&lesson=3
GET  /practice/dictation/summary
GET  /practice/dictation/challenges?level=B1&lesson=4
GET  /practice/weak-words/summary
GET  /practice/weak-words/challenges
POST /practice/sessions
```

Assert `normalizePracticeCefrLevel("C1") === undefined` and invalid lesson
numbers fall back to `1`.

- [ ] **Step 2: Run red, implement API/helper/hooks, run green**

```bash
pnpm --filter @repo/web exec tsx --test app/features/practice/tests/practice.api.test.ts
```

Expected after implementation: PASS.

- [ ] **Step 3: Move Practice UI by real workflow boundary**

Use this physical shape:

```text
app/features/practice/
  api/practice.api.ts
  fill-blank/
  listening/
  dictation/
  weak-words/
  components/
  hooks/
  store/
  types/
  practice-level.ts
  tests/
```

Move existing quiz components and session state into the matching workflow
folder. Keep route-level `PracticeView`, `FillBlankPracticeView`,
`ListeningPracticeView`, `DictationPracticeView`, and
`WeakWordsPracticeView` under `app/views/practice`. Routes import those Views,
not feature internals.

- [ ] **Step 4: Verify and commit**

```bash
pnpm --filter @repo/web exec tsx --test app/features/practice/tests/practice.api.test.ts test/route-architecture.test.ts
pnpm --filter @repo/web check-types
git add apps/web
git commit -m "refactor(web): migrate practice workflows"
```

### Task 9: Migrate Placement Test and onboarding

**Files:**
- Create: `apps/web/app/features/placement-test/api/placement-test.api.ts`
- Create: `apps/web/app/features/placement-test/hooks/use-placement-test.ts`
- Create: `apps/web/app/features/placement-test/types/placement-test.types.ts`
- Create: `apps/web/app/features/placement-test/tests/placement-test.api.test.ts`
- Move: `src/views/placement-test/PlacementTestView.tsx` -> `app/views/placement-test/PlacementTestView.tsx`
- Move: `src/views/placement-test/hooks/usePlacementTest.ts` -> `app/features/placement-test/hooks/use-placement-test.ts`
- Move: `src/views/placement-test/components/new-user-onboarding.tsx` -> `app/features/placement-test/onboarding/NewUserOnboarding.tsx`
- Move: `src/views/placement-test/components/steps/LanguageStep.tsx` -> `app/features/placement-test/onboarding/LanguageStep.tsx`
- Move: `src/views/placement-test/components/steps/GoalStep.tsx` -> `app/features/placement-test/onboarding/GoalStep.tsx`
- Move: `src/views/placement-test/components/steps/IntensityStep.tsx` -> `app/features/placement-test/onboarding/IntensityStep.tsx`
- Move: `src/views/placement-test/components/steps/LevelStep.tsx` -> `app/features/placement-test/onboarding/LevelStep.tsx`
- Modify: `apps/web/app/[locale]/placement-test/page.tsx`
- Delete: `src/modules/placement-test`, `src/services/placement-test`, and old Placement Test View files

**Interfaces:**
- `nextQuestion`, `submitAnswer`, `confirmLevel`, `reset`, and `updateOnboarding` with current request/response shapes.

- [ ] **Step 1: Write the failing Placement Test API test**

Assert these requests and bodies exactly:

```text
GET  /placement-test/question
POST /placement-test/answer      { challengeId: 7, selectedOptionId: 9 }
POST /placement-test/confirm     { level, languages, goals, intensity, primaryLanguage, customGoal }
POST /placement-test/reset
POST /placement-test/onboarding  { step, data }
```

Use `unknown` for onboarding data instead of introducing new `any`.

- [ ] **Step 2: Run red, implement API/hook, run green**

```bash
pnpm --filter @repo/web exec tsx --test app/features/placement-test/tests/placement-test.api.test.ts
```

Expected after implementation: PASS.

- [ ] **Step 3: Convert initial server fetch to client query**

`PlacementTestView` calls the feature hook for its initial question. While
loading it renders the existing session skeleton. A `CONFIRMED` response causes
a locale-aware client replacement to `/learn`; an unauthenticated response is
handled once by Providers/HTTP transport. Keep current onboarding steps and
mutation payloads. The initial query uses
`enabled: useAuth().status === "authenticated"` so it cannot race the mount-time
refresh operation.

The route becomes:

```tsx
import { PlacementTestView } from "@/app/views/placement-test/PlacementTestView";
export default function PlacementTestPage() { return <PlacementTestView />; }
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm --filter @repo/web exec tsx --test app/features/placement-test/tests/placement-test.api.test.ts test/route-architecture.test.ts
pnpm --filter @repo/web check-types
git add apps/web
git commit -m "refactor(web): migrate placement test to client feature"
```

### Task 10: Move remaining Views, delete server-auth legacy, and enforce the profile

**Files:**
- Move: `src/views/marketing/*` -> `app/views/marketing/*`
- Move: `src/views/errors/LocaleError.tsx` -> `app/views/errors/LocaleError.tsx`
- Move: `src/components/modals/hearts-modal.tsx` -> `app/features/progress/components/HeartsModal.tsx`
- Move: `src/stores/use-hearts-modal.ts` -> `app/features/progress/store/hearts-modal.store.ts`
- Move: `src/components/modals/exit-modal.tsx` -> `app/features/lessons/components/ExitModal.tsx`
- Move: `src/stores/use-exit-modal.ts` -> `app/features/lessons/store/exit-modal.store.ts`
- Modify: every route under `apps/web/app` to import `@/app/views` or app-owned shared components
- Modify: `apps/web/test/route-architecture.test.ts`
- Modify: `apps/web/test/ec-feature-architecture.test.ts`
- Modify: `docs/frontend-folder-structure.md`
- Modify: `docs/architecture/codebase-structure.md`
- Modify: `AGENTS.md`
- Delete: `apps/web/src/lib/api-client.ts`
- Delete: `apps/web/src/lib/client-api-request.ts`
- Delete: `apps/web/src/lib/admin.ts`
- Delete: `apps/web/src/components/auth-redirector.tsx`
- Delete: `apps/web/src/views/index.ts`
- Delete: `apps/web/src/constants.ts` after `useQuiz` imports `MAX_HEARTS` directly from `@repo/shared/progress`
- Delete all remaining files under `apps/web/src/modules`, `src/services`, `src/views`, `src/stores`, and domain `src/components`

**Interfaces:**
- Consumes: every feature Interface produced in Tasks 1-9.
- Produces: architecture gates that make the EC client profile the only accepted Web domain layout.

- [ ] **Step 1: Replace the old route architecture assertion**

The current test incorrectly rejects imports from `@/app`. Replace it with:

```ts
test("localized learner routes compose app Views instead of legacy src Views", () => {
  const localizedDirectory = join(appDirectory, "[locale]");
  const routeFiles = collectTypeScriptFiles(localizedDirectory)
    .filter((file) => /(?:page|layout|error)\.tsx$/.test(file));

  for (const file of routeFiles) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("@/src/views/"), false, `${file} imports a legacy View`);
    assert.equal(source.includes("@/src/modules/"), false, `${file} imports a legacy module`);
    assert.equal(source.includes("@/src/services/"), false, `${file} imports a legacy service`);
  }
});
```

Keep the existing test that rejects duplicate non-localized learner route trees.

- [ ] **Step 2: Add the final forbidden-root and server-auth scan**

Add to `ec-feature-architecture.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("Web domain code no longer uses legacy technical buckets or authenticated server HTTP", () => {
  for (const path of ["src/modules", "src/services", "src/views", "src/stores"])
    assert.deepEqual(filesUnder(join(root, path)), [], `${path} must be empty`);

  for (const path of ["src/lib/api-client.ts", "src/lib/client-api-request.ts", "src/components/auth-redirector.tsx"])
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);

  for (const file of filesUnder(join(root, "app")).filter((path) => /\.(ts|tsx)$/.test(path))) {
    const normalizedFile = file.replaceAll("\\", "/");
    const source = readFileSync(file, "utf8");
    if (normalizedFile.endsWith("app/i18n/request.ts") || normalizedFile.endsWith("app/i18n/server.ts")) continue;
    assert.equal(source.includes("next/headers"), false, `${file} performs server-only authenticated work`);
    assert.equal(source.includes("@/src/modules/"), false, `${file} imports legacy modules`);
    assert.equal(source.includes("@/src/services/"), false, `${file} imports legacy services`);
    assert.equal(source.includes("@/src/views/"), false, `${file} imports legacy Views`);
    assert.equal(source.includes("@/src/stores/"), false, `${file} imports legacy stores`);
    assert.equal(/router\.(?:push|replace)\(\s*["']\//u.test(source), false, `${file} navigates without locale ownership`);
  }
});
```

- [ ] **Step 3: Run the tests and remove only reported leftovers**

```bash
pnpm --filter @repo/web test
```

Expected before cleanup: FAIL with each remaining old file/import. Move a real
shared UI file to `app/components`; move domain code to its feature owner;
delete unused facades. Do not move domain code into `app/utils`, `app/hooks`,
`app/schema`, or `app/store` to satisfy the scan.

- [ ] **Step 4: Update frontend architecture documentation**

Document the selected Web flow exactly:

```text
localized route -> app/views -> app/features hook -> resource .api.ts -> src/lib/web-http-client.ts
```

State that Web authenticated APIs are browser-only, `src/lib` is a narrow
transport exception, i18n server files are framework infrastructure, and Admin
uses the same capability/View ownership rule. Remove any documentation that
recommends `platform`, `lib/http`, global domain `api`, or parallel
`.server.ts`/`.client.ts` resource adapters for this repository profile.

- [ ] **Step 5: Run all Web gates**

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
pnpm architecture:check
```

Expected: every command exits 0. Record but do not broaden scope for unrelated
pre-existing warnings; introduce no new warning.

- [ ] **Step 6: Inspect and commit**

```bash
git diff --check
git status --short
git add apps/web docs/frontend-folder-structure.md docs/architecture/codebase-structure.md AGENTS.md
git commit -m "test(web): enforce EC client feature profile"
```
