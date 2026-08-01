import assert from "node:assert/strict";
import test from "node:test";

import {
  gradeToeicDictation,
  normalizeDictationText,
} from "../toeic-dictation-grading.policy.js";

test("dictation normalization ignores case, punctuation, and repeated whitespace", () => {
  assert.deepEqual(
    normalizeDictationText("  She's  ready, now! "),
    ["shes", "ready", "now"],
  );
});

test("dictation grading aligns ordered words and reports missing/extra words", () => {
  const result = gradeToeicDictation(
    "The team will review the report today",
    "The team review report tomorrow",
  );

  assert.equal(result.totalWords, 7);
  assert.equal(result.wordsCorrect, 4);
  assert.equal(result.accuracy, 57);
  assert.equal(result.mastered, false);
  assert.ok(result.words.some((word) => word.status === "MISSING"));
  assert.ok(result.words.some((word) => word.status === "EXTRA"));
});

test("dictation mastery is reached at exactly 90 percent", () => {
  const result = gradeToeicDictation(
    "one two three four five six seven eight nine ten",
    "one two three four five six seven eight nine",
  );

  assert.equal(result.wordsCorrect, 9);
  assert.equal(result.accuracy, 90);
  assert.equal(result.mastered, true);
});

test("empty dictation input is never mastered", () => {
  const result = gradeToeicDictation("A short sentence", "");
  assert.equal(result.wordsCorrect, 0);
  assert.equal(result.accuracy, 0);
  assert.equal(result.mastered, false);
});
