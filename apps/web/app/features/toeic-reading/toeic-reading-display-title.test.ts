import assert from "node:assert/strict";
import test from "node:test";

import { toeicReadingDisplayTitle } from "./toeic-reading-display-title";

test("does not expose a source UUID in a learner-facing test title", () => {
  assert.equal(
    toeicReadingDisplayTitle({
      sourceSetName: "c9b365d2-4035-40a0-be44-2380359266eb",
      testTitle: "Test 10",
    }),
    "Test 10"
  );
});

test("keeps a valid source-set label in a learner-facing test title", () => {
  assert.equal(
    toeicReadingDisplayTitle({
      sourceSetName: "2026",
      testTitle: "Test 10",
    }),
    "2026 / Test 10"
  );
});
