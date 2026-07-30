import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Admin Reading route remains a thin feature/view adapter", () => {
  const route = readFileSync(
    join(root, "app/(dashboard)/reading-passages/page.tsx"),
    "utf8"
  );
  const view = readFileSync(
    join(root, "app/views/reading-passages/ReadingPassagesView.tsx"),
    "utf8"
  );

  assert.match(route, /ReadingPassagesView/u);
  assert.doesNotMatch(route, /use client|useQuery|useMutation/u);
  assert.ok(route.split(/\r?\n/u).length < 10);
  assert.match(view, /ReadingPassagesScreen/u);
  assert.doesNotMatch(view, /use client|useQuery|useMutation/u);
});

test("Admin Reading consumes contracts through the Shared root interface", () => {
  for (const path of [
    "app/features/reading/api/reading-passage.api.ts",
    "app/features/reading/hooks/use-reading-passages.ts",
    "app/features/reading/components/ReadingPassagesScreen.tsx",
  ]) {
    const source = readFileSync(join(root, path), "utf8");
    assert.doesNotMatch(source, /from\s+["']@repo\/shared\//u);
  }
});
