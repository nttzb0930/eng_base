import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("candidate route stays thin and source HTML is never rendered as markup", () => {
  const page = read("app/(dashboard)/reading-source-candidates/page.tsx");
  const view = read("app/views/reading-source-candidates/ReadingSourceCandidatesView.tsx");
  const review = read(
    "app/features/reading-source-candidates/components/ReadingSourceCandidateReviewDialog.tsx",
  );
  const navigation = read("app/components/layout/admin-navigation.ts");

  assert.match(page, /ReadingSourceCandidatesView/u);
  assert.doesNotMatch(page, /use client|useState|fetch\(/u);
  assert.match(view, /ReadingSourceCandidatesScreen/u);
  assert.doesNotMatch(review, /dangerouslySetInnerHTML/u);
  assert.match(navigation, /\/reading-source-candidates/u);
});
