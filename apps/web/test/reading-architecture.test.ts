import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Web Reading routes are thin view adapters", () => {
  const routes = [
    ["app/[locale]/(main)/reading/page.tsx", "ReadingListView"],
    ["app/[locale]/(session)/reading/[slug]/page.tsx", "ReadingSessionView"],
    [
      "app/[locale]/(session)/reading/results/[attemptId]/page.tsx",
      "ReadingResultView",
    ],
  ] as const;

  for (const [path, view] of routes) {
    const source = readFileSync(join(root, path), "utf8");
    assert.match(source, new RegExp(view, "u"));
    assert.doesNotMatch(source, /use client/u);
    assert.doesNotMatch(source, /useQuery|useMutation|webHttpClient/u);
    assert.ok(source.split(/\r?\n/u).length < 20, `${path} must stay thin`);
  }
});

test("Web Reading consumes contracts through the Shared root interface", () => {
  for (const path of [
    "app/features/reading/api/reading.api.ts",
    "app/features/reading/hooks/use-reading.ts",
    "app/features/reading/components/ReadingQuestion.tsx",
  ]) {
    const source = readFileSync(join(root, path), "utf8");
    assert.doesNotMatch(source, /from\s+["']@repo\/shared\//u);
  }
});
