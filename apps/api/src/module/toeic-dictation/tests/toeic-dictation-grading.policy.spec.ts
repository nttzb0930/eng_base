import assert from "node:assert/strict";
import test from "node:test";

import {
  buildToeicDictationCheckSegments,
  gradeToeicDictation,
  gradeToeicDictationCheck,
  normalizeDictationText,
  revealToeicDictationCheckSegments,
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

test("dictation check masks the requested percentage without exposing answers", () => {
  const segments = buildToeicDictationCheckSegments("The quick brown fox jumps.", 10, 50);
  assert.equal(segments.filter((segment) => segment.hidden).length, 3);
  assert.equal(segments.filter((segment) => segment.hidden).every((segment) => segment.text === null), true);
  assert.equal(segments.some((segment) => !segment.hidden && segment.text !== null), true);
});

test("dictation check reveals only the requested number of hidden words", () => {
  const segments = buildToeicDictationCheckSegments("The quick brown fox jumps.", 10, 100);
  const revealed = revealToeicDictationCheckSegments(
    "The quick brown fox jumps.",
    segments,
    2,
  );

  assert.equal(
    revealed.filter((segment) => segment.hidden && segment.text !== null).length,
    2,
  );
  assert.equal(
    revealed.filter((segment) => segment.hidden && segment.text === null).length,
    3,
  );
});

test("dictation check reveals a selected hidden word without exposing the others", () => {
  const transcript = "The quick brown fox jumps.";
  const segments = buildToeicDictationCheckSegments(transcript, 10, 100);
  const revealed = revealToeicDictationCheckSegments(transcript, segments, 0, [3]);

  assert.equal(revealed[6]?.text, "fox");
  assert.equal(
    revealed.filter((segment) => segment.hidden && segment.text !== null).length,
    1
  );
});

test("dictation check grades the hidden words only", () => {
  const result = gradeToeicDictationCheck("The quick brown fox jumps.", "The quick brown fox jumps", 10, 100);
  assert.equal(result.accuracy, 100);
  assert.equal(result.mastered, true);
});
