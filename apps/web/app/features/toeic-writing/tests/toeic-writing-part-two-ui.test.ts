import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  getPartTwoEditorMetrics,
  resolvePartTwoEditorChange,
} from "../toeic-writing-coaching-state";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("Part 2 editor enforces readiness, word, and character limits", () => {
  assert.deepEqual(getPartTwoEditorMetrics("one two"), {
    wordCount: 2,
    characterCount: 7,
    ready: false,
  });
  assert.equal(getPartTwoEditorMetrics("word ".repeat(50)).ready, true);
  assert.equal(
    resolvePartTwoEditorChange("kept", "word ".repeat(301)).value,
    "kept"
  );
  assert.equal(
    resolvePartTwoEditorChange("kept", "x".repeat(2_201)).value,
    "kept"
  );
});

test("Part 2 workspace owns lazy authored and community panels", () => {
  const files = [
    "ToeicWritingPartTwoWorkspace.tsx",
    "ToeicWritingOutlinePanel.tsx",
    "ToeicWritingVocabularyPanel.tsx",
    "ToeicWritingSamplePanel.tsx",
    "ToeicWritingCommunityPanel.tsx",
  ];
  for (const file of files) {
    assert.equal(
      existsSync(
        resolve(process.cwd(), "app/features/toeic-writing/components", file)
      ),
      true,
      file
    );
  }
  if (
    files.some(
      (file) =>
        !existsSync(
          resolve(process.cwd(), "app/features/toeic-writing/components", file)
        )
    )
  )
    return;

  const workspace = read(
    "app/features/toeic-writing/components/ToeicWritingPartTwoWorkspace.tsx"
  );
  assert.match(workspace, /OUTLINE/u);
  assert.match(workspace, /VOCABULARY/u);
  assert.match(workspace, /SAMPLE/u);
  assert.match(workspace, /useToeicWritingCommunity/u);
  assert.match(workspace, /shouldConfirmCommunityRestore/u);
  assert.match(workspace, /lg:grid-cols-2/u);
  assert.match(workspace, /rounded-md/u);
});

test("Part 2 prompt always renders English before Vietnamese", () => {
  const source = read(
    "app/features/toeic-writing/components/ToeicWritingPromptPane.tsx"
  );
  const partTwoSource = source.slice(source.indexOf("function PartTwoPrompt"));
  assert.ok(
    partTwoSource.indexOf("promptEn") < partTwoSource.indexOf("promptVi")
  );
  assert.doesNotMatch(partTwoSource, /locale\s*===\s*["']vi["']/u);
});
