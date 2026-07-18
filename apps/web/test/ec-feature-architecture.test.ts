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
    "app/components/ui/avatar.tsx",
    "app/components/ui/dialog.tsx",
    "app/components/ui/separator.tsx",
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

test("Web reusable Radix primitives are imported from the shared UI package", () => {
  for (const path of [
    "app/components/ui/avatar.tsx",
    "app/components/ui/dialog.tsx",
    "app/components/ui/separator.tsx",
  ]) {
    const source = readFileSync(join(root, path), "utf8");
    assert.equal(source.includes('from "@repo/ui"'), true, `${path} must re-export @repo/ui primitives`);
    assert.equal(source.includes("@radix-ui/"), false, `${path} must not own shared Radix implementation`);
  }
});

test("Web root metadata is declared directly in the root layout", () => {
  assert.equal(existsSync(join(root, "app/config")), false, "app/config must not own root metadata");

  const layoutSource = readFileSync(join(root, "app/layout.tsx"), "utf8");
  assert.equal(layoutSource.includes("export const metadata"), true, "app/layout.tsx must export metadata");
  assert.equal(layoutSource.includes("@/app/config"), false, "app/layout.tsx must not import generic app config");
});

test("Web default test command includes root and feature test seams", () => {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const rootTests = filesUnder(join(root, "test")).filter((path) => path.endsWith(".test.ts"));
  const featureTests = filesUnder(join(root, "app")).filter((path) => path.endsWith(".test.ts"));

  assert.ok(rootTests.length > 0, "Web root test seam must contain tests");
  assert.ok(featureTests.length > 0, "Web feature test seam must contain tests");
  assert.equal(
    packageJson.scripts?.test,
    'tsx --test "test/**/*.test.ts" "app/**/*.test.ts"',
  );
});

test("active architecture docs describe the current frontend profile", () => {
  const workspaceRoot = join(root, "..", "..");
  const activeDocs = [
    "AGENTS.md",
    "CONTEXT.md",
    "docs/architecture/codebase-structure.md",
    "docs/frontend-api-calls.md",
    "docs/overview.md",
  ];
  const staleStatements = [
    "src/lib/web-http-client.ts",
    "src/services/http/admin-http-client.ts",
    "@repo/shared/courses",
    "do not provide `packages/hooks` or `packages/ui`",
  ];

  for (const path of activeDocs) {
    const source = readFileSync(join(workspaceRoot, path), "utf8");
    for (const statement of staleStatements) {
      assert.equal(source.includes(statement), false, `${path} contains stale '${statement}'`);
    }
  }
});

test("Web Auth follows the EC client feature profile", () => {
  for (const path of [
    "app/features/auth/api/auth.api.ts",
    "app/features/auth/api/web-http-client.ts",
    "app/features/auth/hooks/use-auth.ts",
    "app/features/auth/session/auth-session-bootstrap.ts",
    "app/features/auth/store/auth-session.store.ts",
    "app/features/auth/types/auth.types.ts",
    "app/providers.tsx",
    "app/views/auth/SignInView.tsx",
    "app/views/auth/SignUpView.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  assert.equal(
    existsSync(join(root, "app/features/auth/components/AuthSessionProvider.tsx")),
    false,
    "Auth bootstrap stays behind the root Providers module",
  );

  for (const path of [
    "src/services/auth",
    "src/lib/web-http-client.ts",
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

test("Web Learning Session owns the shared learner lifecycle", () => {
  for (const path of [
    "app/features/learning-session/learning-session-state.ts",
    "app/features/learning-session/use-learning-session.ts",
    "app/features/learning-session/tests/learning-session-state.test.ts",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  for (const file of filesUnder(join(root, "app")).filter((path) => /\.(ts|tsx)$/.test(path))) {
    if (file.includes(`${join("learning-session", "tests")}`)) continue;
    const source = readFileSync(file, "utf8");
    assert.equal(
      source.includes("features/learning-session/tests"),
      false,
      `${file} imports private Learning Session tests`,
    );
  }
});

test("Practice and Review adapters use the Learning Session interface", () => {
  const adapters = [
    "app/features/practice/fill-blank/PracticeQuiz.tsx",
    "app/features/practice/listening/PracticeQuiz.tsx",
    "app/features/practice/dictation/PracticeQuiz.tsx",
    "app/features/practice/weak-words/PracticeQuiz.tsx",
    "app/features/review/components/DailyReviewQuiz.tsx",
    "app/features/review/components/SavedWordsReviewQuiz.tsx",
  ];

  for (const path of adapters) {
    const source = readFileSync(join(root, path), "utf8");
    assert.equal(source.includes("useLearningSession"), true, `${path} must use Learning Session`);
    assert.equal(source.includes("const [status, setStatus]"), false, `${path} owns feedback state`);
    assert.equal(
      source.includes("const [correctCount, setCorrectCount]"),
      false,
      `${path} owns correct count`,
    );
    assert.equal(
      source.includes("const [wrongCount, setWrongCount]"),
      false,
      `${path} owns wrong count`,
    );
    assert.equal(
      source.includes("const [reviewedItems, setReviewedItems]"),
      false,
      `${path} owns reviewed items`,
    );
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
    assert.equal(source.includes("@/src/lib/"), false, `${file} imports legacy lib`);
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
