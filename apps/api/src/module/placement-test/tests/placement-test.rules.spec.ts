import assert from "node:assert/strict";
import test from "node:test";

import {
  levelFallbacks,
  nextTheta,
  placementResult,
  questionType,
} from "../use-cases/placement-test.rules";

test("placement rules preserve question phases and theta bounds", () => {
  assert.equal(questionType(0), "SELECT");
  assert.equal(questionType(5), "ASSIST");
  assert.equal(questionType(10), "SELECT");
  assert.equal(nextTheta(3.8, 0, true), 4);
  assert.equal(nextTheta(1.1, 0, false), 1);
});

test("placement result preserves buffer and recommendation policy", () => {
  const buffer = placementResult([
    1, 1, 1, 1, 1, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5,
  ]);
  assert.deepEqual(buffer, {
    finalScore: 2.5,
    bufferOptions: ["A2", "B1"],
    inBufferZone: true,
    recommendedLevel: "A1",
  });
  assert.equal(
    placementResult([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3.2, 3.2, 3.2, 3.2, 3.2])
      .recommendedLevel,
    "B1"
  );
});

test("placement level fallbacks keep the target first and unique", () => {
  assert.deepEqual(levelFallbacks(3), {
    targetLevel: "B1",
    levels: ["B1", "A2", "B2", "A1"],
  });
});
