import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Reading authoring route stays thin and is reachable from Admin navigation", () => {
  const route = read("app/(dashboard)/reading-passages/page.tsx");
  const view = read("app/views/reading-passages/ReadingPassagesView.tsx");
  const navigation = read("app/components/layout/admin-navigation.ts");

  assert.match(route, /ReadingPassagesView/);
  assert.doesNotMatch(route, /use client/);
  assert.match(view, /ReadingPassagesScreen/);
  assert.match(navigation, /\/reading-passages/);
});

test("Reading authoring UI preserves A1 scope and nested question contract", () => {
  const screen = read(
    "app/features/reading/components/ReadingPassagesScreen.tsx"
  );

  assert.match(screen, /READING_CEFR_LEVELS/);
  assert.match(screen, /disabled=\{isEditing\}/);
  assert.match(screen, /useReadingTopicOptions/);
  assert.match(screen, /type="radio"/);
  assert.match(screen, /questions:\s*normalizeQuestions/);
  assert.match(screen, /useSetReadingPublication/);
  assert.match(screen, /Thêm câu hỏi/);
  assert.match(screen, /Thêm đáp án/);
});
