import assert from "node:assert/strict";
import test from "node:test";

import type { ToeicWritingPartOneTaskSummary } from "@repo/shared";

const modulePath = "../toeic-writing-catalog.utils.ts";

function task(
  id: number,
  pattern: string | null
): ToeicWritingPartOneTaskSummary {
  return {
    id,
    part: 1,
    order: id,
    difficulty: "EASY",
    contentVersion: String(id).padStart(64, "0"),
    submitted: false,
    hasDraft: false,
    requiredWords: [{ en: "woman", vi: null }],
    pattern,
  };
}

test("Writing pattern filters keep stable first-appearance order and counts", async () => {
  const catalogUtils = await import(modulePath).catch(() => null);
  assert.ok(catalogUtils, "catalog utilities module must exist");

  const tasks = [
    task(1, " N + N "),
    task(2, "V + N"),
    task(3, "N + N"),
    task(4, ""),
    task(5, null),
  ];

  assert.deepEqual(catalogUtils.buildToeicWritingPatternFilters(tasks), [
    { value: null, count: 5 },
    { value: "N + N", count: 2 },
    { value: "V + N", count: 1 },
  ]);
});

test("Writing pattern selection filters by normalized value", async () => {
  const catalogUtils = await import(modulePath).catch(() => null);
  assert.ok(catalogUtils, "catalog utilities module must exist");

  const tasks = [task(1, " N + N "), task(2, "V + N"), task(3, null)];

  assert.deepEqual(
    catalogUtils
      .filterToeicWritingPartOneTasks(tasks, "N + N")
      .map((item: ToeicWritingPartOneTaskSummary) => item.id),
    [1]
  );
  assert.deepEqual(
    catalogUtils
      .filterToeicWritingPartOneTasks(tasks, null)
      .map((item: ToeicWritingPartOneTaskSummary) => item.id),
    [1, 2, 3]
  );
});
