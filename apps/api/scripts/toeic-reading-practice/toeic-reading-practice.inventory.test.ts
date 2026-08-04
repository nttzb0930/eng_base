import assert from "node:assert/strict";
import test from "node:test";

import { inventoryToeicReadingPractice } from "./toeic-reading-practice.inventory.js";
import type {
  ToeicQuestionIndexRow,
  ToeicReadingSource,
} from "./toeic-reading-practice.types.js";

function questionIndex(testId: string): ToeicQuestionIndexRow[] {
  return Array.from({ length: 100 }, (_, index) => {
    const sourceNumber = index + 101;
    return {
      sourceQuestionId: `${testId}-q-${sourceNumber}`,
      sourceTestId: testId,
      part: sourceNumber <= 130 ? 5 : sourceNumber <= 146 ? 6 : 7,
      sourceNumber,
      passageId:
        sourceNumber <= 130 ? null : `${testId}-p-${Math.floor(index / 4)}`,
      imageUrl: null,
    };
  });
}

test("selects the newest 10 public 2026 tests and reports 1,000 questions", async () => {
  const tests = Array.from({ length: 12 }, (_, index) => ({
    sourceTestId: `test-${String(index + 1).padStart(2, "0")}`,
    sourceSetId: "set-2026",
    title: `Test ${index + 1}`,
    order: index + 1,
    free: true,
    hidden: false,
    updatedAt: null,
  }));
  tests.push({
    sourceTestId: "hidden",
    sourceSetId: "set-2026",
    title: "Hidden",
    order: 99,
    free: true,
    hidden: true,
    updatedAt: null,
  });
  tests.push({
    sourceTestId: "premium",
    sourceSetId: "set-2026",
    title: "Premium",
    order: 98,
    free: false,
    hidden: false,
    updatedAt: null,
  });
  const source = {
    listSets: async () => [
      { sourceSetId: "set-2026", name: "2026", order: 1, hidden: false },
    ],
    listTests: async () => tests,
    listQuestionIndex: async (testId: string) => questionIndex(testId),
  } as Pick<ToeicReadingSource, "listSets" | "listTests" | "listQuestionIndex">;

  const inventory = await inventoryToeicReadingPractice({
    source,
    sourceSet: "2026",
    limitTests: 10,
    observedAt: "2026-07-31T00:00:00.000Z",
  });

  assert.equal(inventory.selectedTests.length, 10);
  assert.equal(inventory.selectedTests[0]?.sourceTestId, "test-01");
  assert.equal(inventory.selectedTests[9]?.sourceTestId, "test-10");
  assert.deepEqual(inventory.questionCounts, { "5": 300, "6": 160, "7": 540 });
  assert.equal(inventory.totalQuestions, 1_000);
  assert.equal(inventory.excludedHiddenCount, 1);
  assert.equal(inventory.excludedNotFreeCount, 1);
  assert.match(inventory.inventorySha256, /^[a-f0-9]{64}$/u);
});

test("rejects an incomplete selected test before content download", async () => {
  const source = {
    listSets: async () => [
      { sourceSetId: "set-2026", name: "2026", order: 1, hidden: false },
    ],
    listTests: async () => [
      {
        sourceTestId: "test-1",
        sourceSetId: "set-2026",
        title: "Test 1",
        order: 1,
        free: true,
        hidden: false,
        updatedAt: null,
      },
    ],
    listQuestionIndex: async () => questionIndex("test-1").slice(1),
  } as Pick<ToeicReadingSource, "listSets" | "listTests" | "listQuestionIndex">;

  await assert.rejects(
    inventoryToeicReadingPractice({
      source,
      sourceSet: "2026",
      limitTests: 1,
      observedAt: "2026-07-31T00:00:00.000Z",
    }),
    /must expose 30\/16\/54 Reading questions/u
  );
});
