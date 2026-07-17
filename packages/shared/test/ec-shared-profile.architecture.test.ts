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

test("application source imports only the EC shared root interface", () => {
  for (const root of ["apps/api/src", "apps/admin/app", "apps/web/app"]) {
    for (const file of filesUnder(join(repoRoot, root))) {
      const source = readFileSync(file, "utf8");
      assert.equal(source.includes("@repo/shared/"), false, file);
    }
  }
});
