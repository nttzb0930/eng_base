import assert from "node:assert/strict";
import test from "node:test";

import {
  formatActivityWeekday,
  summarizeWeeklyActivity,
} from "../dashboard-presentation";

test("summarizes active days and reviewed words", () => {
  const summary = summarizeWeeklyActivity([
    {
      date: "2026-07-19",
      sessionCount: 2,
      wordCount: 12,
      accuracy: 80,
    },
    {
      date: "2026-07-20",
      sessionCount: 0,
      wordCount: 0,
      accuracy: 0,
    },
  ]);

  assert.deepEqual(summary, { activeDays: 1, reviewedWords: 12 });
});

test("formats a date-only activity key without local timezone drift", () => {
  assert.equal(formatActivityWeekday("2026-07-20", "en"), "M");
});
