import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  for (const path of ["src/components/ui", "src/lib/i18n", "src/i18n", "src/messages", "src/lib/utils.ts"]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
  }
});

test("Web Auth follows the EC client feature profile", () => {
  for (const path of [
    "app/features/auth/api/auth.api.ts",
    "app/features/auth/hooks/use-auth.ts",
    "app/features/auth/store/auth-session.store.ts",
    "app/features/auth/types/auth.types.ts",
    "app/providers.tsx",
    "app/views/auth/SignInView.tsx",
    "app/views/auth/SignUpView.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  for (const path of [
    "src/services/auth",
    "src/stores/auth-session.store.ts",
    "src/providers.tsx",
    "src/views/auth",
  ]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
  }
});

test("Web Courses and Progress use client feature owners", () => {
  for (const path of [
    "app/features/courses/api/course.api.ts",
    "app/features/courses/hooks/use-courses.ts",
    "app/features/courses/components/CourseCard.tsx",
    "app/features/progress/api/progress.api.ts",
    "app/features/progress/hooks/use-user-progress.ts",
    "app/components/layout/LearnerShell.tsx",
    "app/views/courses/CoursesView.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  const coursesRoute = join(root, "app/[locale]/(main)/courses/page.tsx");
  assert.equal(existsSync(coursesRoute), true);
  assert.equal(existsSync(join(root, "src/views/courses")), false);

  for (const path of [
    "app/[locale]/(main)/courses/page.tsx",
    "app/[locale]/(main)/layout.tsx",
    "app/[locale]/lesson/layout.tsx",
  ]) {
    const source = readFileSync(join(root, path), "utf8");
    assert.equal(source.includes("@/src/views/courses"), false, `${path} imports legacy Courses View`);
    assert.equal(source.includes("@/src/modules/learning/queries"), false, `${path} imports server learning queries`);
    assert.equal(source.includes("@/src/services/progress"), false, `${path} imports legacy Progress services`);
  }
});
