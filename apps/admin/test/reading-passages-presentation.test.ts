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
  const screen = read("app/features/reading/components/ReadingPassagesScreen.tsx");
  const editor = read(
    "app/features/reading/components/passage/ReadingPassageEditorDialog.tsx",
  );
  const fields = read(
    "app/features/reading/components/passage/ReadingPassageFields.tsx",
  );
  const question = read(
    "app/features/reading/components/passage/ReadingQuestionEditor.tsx",
  );
  const option = read(
    "app/features/reading/components/passage/ReadingOptionEditor.tsx",
  );
  const authoring = [editor, fields, question, option].join("\n");

  assert.match(fields, /READING_CEFR_LEVELS/);
  assert.match(fields, /disabled=\{Boolean\(passage\)\}/);
  assert.match(screen, /useReadingTopicOptions/);
  assert.match(option, /RadioGroupItem/);
  assert.match(editor, /questions:\s*normalizeQuestions/);
  assert.match(screen, /useSetReadingPublication/);
  assert.match(authoring, /Thêm câu hỏi/);
  assert.match(authoring, /Thêm đáp án/);
});
