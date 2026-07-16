import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceRoot = join(import.meta.dirname, "..", "src");

test("Admin delivery belongs to its business owner", () => {
  const adminRoot = join(sourceRoot, "module/admin");
  const adminFiles = existsSync(adminRoot)
    ? readdirSync(adminRoot, { recursive: true }).filter((path) =>
        String(path).endsWith(".ts")
      )
    : [];
  assert.deepEqual(adminFiles, []);
  assert.ok(
    existsSync(join(sourceRoot, "module/user/admin-users.controller.ts"))
  );
  assert.ok(
    existsSync(
      join(
        sourceRoot,
        "module/practice/admin-practice-sessions.controller.ts"
      )
    )
  );
  assert.ok(
    existsSync(join(sourceRoot, "module/settings/admin-settings.controller.ts"))
  );
});
