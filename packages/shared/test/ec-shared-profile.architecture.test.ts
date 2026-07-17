import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = join(import.meta.dirname, "../../..");
const sharedRoot = join(repoRoot, "packages/shared");

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

test("application source imports only the EC shared root interface", () => {
  for (const root of ["apps/api/src", "apps/admin/app", "apps/web/app"]) {
    for (const file of filesUnder(join(repoRoot, root))) {
      const source = readFileSync(file, "utf8");
      assert.equal(source.includes("@repo/shared/"), false, file);
    }
  }
});

test("shared has no transitional contract layout", () => {
  for (const path of [
    "src/contracts.ts",
    "src/contracts",
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
    readFileSync(join(sharedRoot, "package.json"), "utf8")
  ) as {
    exports: Record<string, unknown>;
    dependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(packageJson.exports), ["."]);
  assert.equal(packageJson.dependencies?.zod, undefined);
});
