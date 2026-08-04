import assert from "node:assert/strict";
import test from "node:test";

import { inventoryToeicVocabularyCache } from "./toeic-vocabulary-cache.inventory.js";

test("deduplicates question ids and respects bounded worker concurrency", async () => {
  let active = 0;
  let maximumActive = 0;
  const batches: string[][] = [];

  const result = await inventoryToeicVocabularyCache({
    questionIds: ["q1", "q2", "q1", "q3", "q4", "q5"],
    batchSize: 2,
    workers: 2,
    source: {
      async readReady(questionIds) {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        batches.push(questionIds);
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return questionIds.map((questionId) => ({
          questionId,
          vocabulary: [{ word: questionId }],
        }));
      },
    },
  });

  assert.equal(maximumActive, 2);
  assert.deepEqual(batches, [["q1", "q2"], ["q3", "q4"], ["q5"]]);
  assert.equal(result.questionCount, 5);
  assert.equal(result.readyCount, 5);
  assert.equal(result.missingCount, 0);
});

test("resumes completed question ids and reports cache misses", async () => {
  const requested: string[][] = [];
  const result = await inventoryToeicVocabularyCache({
    questionIds: ["q1", "q2", "q3"],
    batchSize: 2,
    workers: 1,
    completed: {
      q1: [{ word: "cached" }],
    },
    source: {
      async readReady(questionIds) {
        requested.push(questionIds);
        return questionIds.includes("q2")
          ? [{ questionId: "q2", vocabulary: [{ word: "ready" }] }]
          : [];
      },
    },
  });

  assert.deepEqual(requested, [["q2", "q3"]]);
  assert.equal(result.readyCount, 2);
  assert.deepEqual(result.missingQuestionIds, ["q3"]);
});

test("does not query previously completed cache misses when resuming", async () => {
  const requested: string[][] = [];
  const result = await inventoryToeicVocabularyCache({
    questionIds: ["q1", "q2"],
    batchSize: 10,
    workers: 1,
    queriedQuestionIds: ["q1"],
    source: {
      async readReady(questionIds) {
        requested.push(questionIds);
        return [];
      },
    },
  });

  assert.deepEqual(requested, [["q2"]]);
  assert.deepEqual(result.missingQuestionIds, ["q1", "q2"]);
});
