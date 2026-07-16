import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("shared publishes capability subpath Interfaces", () => {
  const packageJson = JSON.parse(
    readFileSync(join(import.meta.dirname, "../package.json"), "utf8")
  ) as { exports: Record<string, unknown> };

  for (const subpath of [
    "./courses",
    "./vocabulary",
    "./practice",
    "./review",
    "./placement-test",
    "./dashboard",
    "./flashcards",
    "./progress",
    "./learning",
  ]) {
    assert.ok(packageJson.exports[subpath], subpath);
  }
});
