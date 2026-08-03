import assert from "node:assert/strict";
import test from "node:test";

import {
  getPartOneGradePresentation,
  validatePartOneEditorResponse,
} from "../toeic-writing-part-one-grading";

test("Part 1 editor blocks grading and returns localized wire issue codes", () => {
  const result = validatePartOneEditorResponse("woman cooks dinner", [
    "woman",
    "food",
  ]);

  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, [
    { code: "UPPERCASE_START_REQUIRED" },
    { code: "TERMINAL_PUNCTUATION_REQUIRED" },
    { code: "REQUIRED_WORD_MISSING", keyword: "food" },
  ]);
});

test("0-2 scores show a correction while 3 shows an improvement", () => {
  assert.equal(getPartOneGradePresentation(2), "CORRECTION");
  assert.equal(getPartOneGradePresentation(3), "IMPROVEMENT");
});
