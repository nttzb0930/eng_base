import assert from "node:assert/strict";
import test from "node:test";

import type {
  ToeicDictationCheckSegment,
  ToeicDictationWordResult,
} from "@repo/shared";

import { mergeToeicDictationCheckFeedback } from "../toeic-dictation-check-feedback";

test("check feedback keeps visible segments and pairs results with hidden words", () => {
  const segments: ToeicDictationCheckSegment[] = [
    { segmentIndex: 0, wordIndex: 0, length: 3, text: "The", hidden: false },
    { segmentIndex: 1, wordIndex: 1, length: 5, text: null, hidden: true },
    { segmentIndex: 2, wordIndex: null, length: null, text: " is ", hidden: false },
    { segmentIndex: 3, wordIndex: 2, length: 5, text: null, hidden: true },
  ];
  const words: ToeicDictationWordResult[] = [
    { status: "CORRECT", expected: "woman", actual: "woman" },
    { status: "MISSING", expected: "carrying", actual: null },
  ];

  const feedback = mergeToeicDictationCheckFeedback(segments, words);

  assert.equal(feedback[0]?.result, null);
  assert.equal(feedback[0]?.hiddenIndex, null);
  assert.equal(feedback[1]?.result?.expected, "woman");
  assert.equal(feedback[1]?.hiddenIndex, 0);
  assert.equal(feedback[2]?.text, " is ");
  assert.equal(feedback[3]?.result?.status, "MISSING");
  assert.equal(feedback[3]?.hiddenIndex, 1);
});
