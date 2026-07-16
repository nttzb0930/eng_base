import assert from "node:assert/strict";
import test from "node:test";

import { getVocabularyReviewSchedule } from "../use-cases/vocabulary-review-schedule";

test("review scheduling resets failed words and advances successful words", () => {
  const now = new Date("2026-07-16T00:00:00.000Z");
  const current = {
    ease_factor: 2.5,
    interval_days: 6,
    repetition_count: 2,
  };

  const failed = getVocabularyReviewSchedule(current, "again", now);
  const successful = getVocabularyReviewSchedule(current, "good", now);

  assert.deepEqual(failed, {
    correctIncrement: 0,
    wrongIncrement: 1,
    easeFactor: 2.3,
    intervalDays: 1,
    repetitionCount: 0,
    masteryLevel: "learning",
    nextReviewAt: new Date("2026-07-17T00:00:00.000Z"),
  });
  assert.equal(successful.correctIncrement, 1);
  assert.equal(successful.repetitionCount, 3);
  assert.equal(successful.intervalDays, 15);
  assert.equal(successful.masteryLevel, "review");
});
