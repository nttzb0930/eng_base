import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

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

test("Web domain code no longer uses legacy technical buckets or authenticated server HTTP", () => {
  for (const path of ["src/modules", "src/services", "src/views", "src/stores"]) {
    assert.deepEqual(filesUnder(join(root, path)), [], `${path} must be empty`);
  }

  for (const path of [
    "src/lib/api-client.ts",
    "src/lib/client-api-request.ts",
    "src/components/auth-redirector.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
  }

  for (const file of filesUnder(join(root, "app")).filter((path) => /\.(ts|tsx)$/.test(path))) {
    const normalizedFile = file.replaceAll("\\", "/");
    const source = readFileSync(file, "utf8");

    if (normalizedFile.endsWith("app/i18n/request.ts") || normalizedFile.endsWith("app/i18n/server.ts")) {
      continue;
    }

    assert.equal(source.includes("next/headers"), false, `${file} performs server-only authenticated work`);
    assert.equal(source.includes("@/src/modules/"), false, `${file} imports legacy modules`);
    assert.equal(source.includes("@/src/services/"), false, `${file} imports legacy services`);
    assert.equal(source.includes("@/src/views/"), false, `${file} imports legacy Views`);
    assert.equal(source.includes("@/src/stores/"), false, `${file} imports legacy stores`);
    assert.equal(
      /router\.(?:push|replace)\(\s*["']\//u.test(source),
      false,
      `${file} navigates without locale ownership`,
    );
  }
});
