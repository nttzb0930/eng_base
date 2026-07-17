import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

test("shared Admin presentation primitives live under app", () => {
  for (const path of [
    "app/components/ui/button.tsx",
    "app/components/data-table/data-table-card.tsx",
    "app/components/feedback/TableSkeleton.tsx",
    "app/hooks/use-debounce.ts",
    "app/hooks/use-table-controls.ts",
    "app/utils/cn.ts",
    "app/providers.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  for (const path of [
    "components/ui",
    "src/components/data-table",
    "src/components/providers.tsx",
    "src/hooks/use-debounce.ts",
    "src/hooks/use-table-controls.ts",
    "src/lib/utils.ts",
  ]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
  }
});

test("shared Admin presentation imports use app-owned paths", () => {
  const sourceFiles = [
    ...filesUnder(join(root, "app")),
    ...filesUnder(join(root, "src", "views")),
  ].filter((file) => /\.(ts|tsx)$/.test(file));

  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("@/components/ui/"), false, `${file} imports legacy UI primitives`);
    assert.equal(source.includes("@/src/components/data-table"), false, `${file} imports legacy data table`);
    assert.equal(source.includes("@/src/components/providers"), false, `${file} imports legacy providers`);
    assert.equal(source.includes("@/src/hooks/"), false, `${file} imports legacy hooks`);
    assert.equal(source.includes("@/lib/utils"), false, `${file} imports legacy utils`);
  }
});

test("Admin architecture check includes every architecture test", () => {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(packageJson.scripts?.["architecture:check"], 'tsx --test "test/*architecture.test.ts"');
});

test("Admin Auth follows the EC feature and view profile", () => {
  assert.equal(existsSync(join(root, "app/features/auth/api/auth.api.ts")), true);
  assert.equal(existsSync(join(root, "app/features/auth/hooks/use-admin-login.ts")), true);
  assert.equal(existsSync(join(root, "app/features/auth/components/AuthGuard.tsx")), true);
  assert.equal(existsSync(join(root, "app/features/auth/types/auth.types.ts")), true);
  assert.equal(existsSync(join(root, "app/views/auth/LoginView.tsx")), true);
  assert.equal(existsSync(join(root, "src/services/auth")), false);
  assert.equal(existsSync(join(root, "src/views/login")), false);
  assert.equal(existsSync(join(root, "components/auth/AuthGuard.tsx")), false);
});

test("Admin Users follows the EC feature and view profile", () => {
  assert.equal(existsSync(join(root, "app/features/users/api/user.api.ts")), true);
  assert.equal(existsSync(join(root, "app/features/users/hooks/use-users.ts")), true);
  assert.equal(existsSync(join(root, "app/features/users/types/user-management.types.ts")), true);
  assert.equal(existsSync(join(root, "app/views/users/UsersView.tsx")), true);
  assert.equal(existsSync(join(root, "src/services/users")), false);
  assert.equal(existsSync(join(root, "src/views/users")), false);

  const routeSource = readFileSync(join(root, "app/(dashboard)/users/page.tsx"), "utf8");
  assert.equal(routeSource.includes("@/app/views/users/UsersView"), true);
  assert.equal(routeSource.includes("@/src/views/users"), false);
});

test("Admin Practice Sessions follows the Practice owner profile", () => {
  assert.equal(existsSync(join(root, "app/features/practice/api/practice-session.api.ts")), true);
  assert.equal(existsSync(join(root, "app/features/practice/hooks/use-practice-sessions.ts")), true);
  assert.equal(existsSync(join(root, "app/features/practice/types/practice-session.types.ts")), true);
  assert.equal(existsSync(join(root, "app/views/practice-sessions/PracticeSessionsView.tsx")), true);
  assert.equal(existsSync(join(root, "src/services/practice-sessions")), false);
  assert.equal(existsSync(join(root, "src/views/practice-sessions")), false);
  assert.equal(existsSync(join(root, "app/features/practice-sessions")), false);

  const routeSource = readFileSync(join(root, "app/(dashboard)/practice-sessions/page.tsx"), "utf8");
  assert.equal(routeSource.includes("@/app/views/practice-sessions/PracticeSessionsView"), true);
  assert.equal(routeSource.includes("@/src/views/practice-sessions"), false);
});
