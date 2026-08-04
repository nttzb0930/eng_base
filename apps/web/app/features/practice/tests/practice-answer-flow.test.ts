import assert from "node:assert/strict";
import test from "node:test";

import { shouldAdvanceAfterFeedback } from "../practice-answer-flow";

test("practice advances after either correct or incorrect feedback", () => {
  assert.equal(shouldAdvanceAfterFeedback("correct"), true);
  assert.equal(shouldAdvanceAfterFeedback("wrong"), true);
});

test("practice does not advance before an answer is checked", () => {
  assert.equal(shouldAdvanceAfterFeedback("none"), false);
});
