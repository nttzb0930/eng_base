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
    "app/components/ui/avatar.tsx",
    "app/components/ui/dialog.tsx",
    "app/components/ui/separator.tsx",
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

test("Admin dashboard route composes the deep Admin shell", () => {
  for (const path of [
    "app/components/layout/admin-navigation.ts",
    "app/components/layout/AdminSidebar.tsx",
    "app/components/layout/AdminNavbar.tsx",
    "app/components/layout/AdminShell.tsx",
    "app/store/sidebar.store.ts",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  const layoutPath = join(root, "app/(dashboard)/layout.tsx");
  const source = readFileSync(layoutPath, "utf8");
  assert.equal(source.includes("@/app/components/layout/AdminShell"), true);
  assert.equal(source.includes("localStorage"), false, "route layout owns Auth storage");
  assert.equal(source.includes("navItems"), false, "route layout owns navigation");
  assert.equal(source.includes("getPageTitle"), false, "route layout owns title mapping");
  assert.ok(source.split(/\r?\n/u).length < 30, "dashboard route layout must stay thin");
});

test("Admin reusable Radix primitives are imported from the shared UI package", () => {
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

test("Admin Tailwind scans shared UI primitive sources", () => {
  const source = readFileSync(join(root, "tailwind.config.ts"), "utf8");

  assert.equal(
    source.includes("../../packages/ui/src/**/*.{ts,tsx}"),
    true,
    "shared dialog classes must be present in the Admin CSS build",
  );
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

test("Admin production build pins the production Node environment", () => {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.build,
    "dotenv -e ../../.env -v NODE_ENV=production -- next build --turbopack",
  );
});

test("Admin Auth follows the frontend feature/view profile", () => {
  assert.equal(existsSync(join(root, "app/features/auth/api/auth.api.ts")), true);
  assert.equal(existsSync(join(root, "app/features/auth/api/http-client.ts")), true);
  assert.equal(existsSync(join(root, "app/features/auth/api/admin-http-client.ts")), true);
  assert.equal(existsSync(join(root, "app/features/auth/hooks/use-admin-login.ts")), true);
  assert.equal(existsSync(join(root, "app/features/auth/components/AuthGuard.tsx")), true);
  assert.equal(existsSync(join(root, "app/features/auth/types/auth.types.ts")), true);
  assert.equal(existsSync(join(root, "app/views/auth/LoginView.tsx")), true);
  assert.equal(existsSync(join(root, "src/services/auth")), false);
  assert.equal(existsSync(join(root, "src/lib/http-client.ts")), false);
  assert.deepEqual(filesUnder(join(root, "src/services/http")), [], "src/services/http must be empty");
  assert.equal(existsSync(join(root, "src/views/login")), false);
  assert.equal(existsSync(join(root, "components/auth/AuthGuard.tsx")), false);
});

test("Admin Users follows the frontend feature/view profile", () => {
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

test("Admin Settings follows the frontend feature/view profile", () => {
  assert.equal(existsSync(join(root, "app/features/settings/api/setting.api.ts")), true);
  assert.equal(existsSync(join(root, "app/features/settings/hooks/use-setting.ts")), true);
  assert.equal(existsSync(join(root, "app/views/settings/SettingsView.tsx")), true);
  assert.equal(existsSync(join(root, "src/services/settings")), false);
  assert.equal(existsSync(join(root, "src/views/settings")), false);

  const routeSource = readFileSync(join(root, "app/(dashboard)/settings/page.tsx"), "utf8");
  assert.equal(routeSource.includes("@/app/views/settings/SettingsView"), true);
  assert.equal(routeSource.includes("@/src/views/settings"), false);
});

test("Admin has no legacy capability implementation or imports", () => {
  for (const path of [
    "src/services/auth",
    "src/services/users",
    "src/services/practice-sessions",
    "src/services/settings",
    "src/views/login",
    "src/views/users",
    "src/views/practice-sessions",
    "src/views/settings",
  ]) {
    assert.deepEqual(filesUnder(join(root, path)), [], `${path} must be empty`);
  }

  const appSources = filesUnder(join(root, "app")).filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of appSources) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("@/src/views/"), false, `${file} imports legacy View code`);
    assert.equal(source.includes("@/src/lib/"), false, `${file} imports legacy lib`);
    assert.equal(source.includes("@/src/services/http"), false, `${file} imports legacy HTTP service`);
    assert.equal(source.includes("@/src/services/auth"), false, `${file} imports legacy Auth`);
    assert.equal(source.includes("@/src/services/users"), false, `${file} imports legacy Users`);
    assert.equal(source.includes("@/src/services/practice-sessions"), false, `${file} imports legacy Practice`);
    assert.equal(source.includes("@/src/services/settings"), false, `${file} imports legacy Settings`);
  }
});
