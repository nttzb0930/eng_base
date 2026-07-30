import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDashboardStreak,
  type DashboardLearningDay,
} from "../use-cases/dashboard-streak.policy";

const now = new Date("2026-07-24T12:00:00.000Z");
const day = (
  date: string,
  time = "10:00:00.000Z"
): DashboardLearningDay => ({
  date,
  lastLearningAt: new Date(`${date}T${time}`),
});

test("empty activity returns zero streaks and null last learning", () => {
  assert.deepEqual(calculateDashboardStreak([], now), {
    currentStreak: 0,
    longestStreak: 0,
    lastLearningAt: null,
    timeZone: "UTC",
  });
});

test("duplicate dates count once and keep the latest timestamp", () => {
  assert.deepEqual(
    calculateDashboardStreak(
      [
        day("2026-07-23", "08:00:00.000Z"),
        day("2026-07-23", "18:00:00.000Z"),
        day("2026-07-24"),
      ],
      now
    ),
    {
      currentStreak: 2,
      longestStreak: 2,
      lastLearningAt: new Date("2026-07-24T10:00:00.000Z"),
      timeZone: "UTC",
    }
  );
});

test("today and previous consecutive days form current streak", () => {
  const result = calculateDashboardStreak(
    [day("2026-07-22"), day("2026-07-23"), day("2026-07-24")],
    now
  );

  assert.equal(result.currentStreak, 3);
  assert.equal(result.longestStreak, 3);
});

test("yesterday keeps current streak active", () => {
  const result = calculateDashboardStreak(
    [day("2026-07-21"), day("2026-07-22"), day("2026-07-23")],
    now
  );

  assert.equal(result.currentStreak, 3);
  assert.equal(
    result.lastLearningAt?.toISOString(),
    "2026-07-23T10:00:00.000Z"
  );
});

test("a gap before yesterday resets current streak to zero", () => {
  const result = calculateDashboardStreak(
    [day("2026-07-20"), day("2026-07-21"), day("2026-07-22")],
    now
  );

  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 3);
});

test("longest streak can be older than current streak", () => {
  const result = calculateDashboardStreak(
    [
      day("2026-07-10"),
      day("2026-07-11"),
      day("2026-07-12"),
      day("2026-07-13"),
      day("2026-07-14"),
      day("2026-07-23"),
      day("2026-07-24"),
    ],
    now
  );

  assert.equal(result.currentStreak, 2);
  assert.equal(result.longestStreak, 5);
});

test("input order does not affect the result", () => {
  const activity = [
    day("2026-07-24"),
    day("2026-07-22"),
    day("2026-07-23"),
  ];

  assert.deepEqual(
    calculateDashboardStreak(activity, now),
    calculateDashboardStreak([...activity].reverse(), now)
  );
});
