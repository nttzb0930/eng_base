import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { createPrismaToeicReadingImportStore } from "./toeic-reading-practice.prisma-store.js";
import type { ToeicReadingPracticeTest } from "./toeic-reading-practice.types.js";

function content(sourceVersion: string): ToeicReadingPracticeTest {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceSetId: "set-2026",
    sourceTestId: "test-1",
    sourceVersion,
    title: "Test 1",
    parts: [
      {
        part: 5,
        stimuli: [],
        questions: [
          {
            sourceQuestionId: "question-101",
            sourceNumber: 101,
            stimulusId: null,
            prompt: "Question 101",
            translation: null,
            explanation: null,
            choices: [
              { label: "A", text: "A", correct: true },
              { label: "B", text: "B", correct: false },
              { label: "C", text: "C", correct: false },
              { label: "D", text: "D", correct: false },
            ],
          },
        ],
      },
    ],
    media: [],
  };
}

test("skips the same source version without opening a transaction", async () => {
  let transactions = 0;
  const prisma = {
    toeic_tests: {
      findUnique: async () => ({ id: 11, source_version: "a".repeat(64) }),
    },
    $transaction: async () => {
      transactions += 1;
    },
  } as unknown as PrismaClient;
  const store = createPrismaToeicReadingImportStore(prisma);

  const result = await store.importOne({
    courseId: 7,
    content: content("a".repeat(64)),
    practiceStats: [],
  });

  assert.equal(result, "SKIPPED");
  assert.equal(transactions, 0);
});

test("replaces a changed test in one transaction and republishes it", async () => {
  let transactions = 0;
  const updates: Array<Record<string, unknown>> = [];
  const questionCreates: Array<Record<string, unknown>> = [];
  const transaction = {
    toeic_test_sets: {
      upsert: async () => ({ id: 21 }),
    },
    toeic_media_assets: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async () => ({ count: 0 }),
    },
    toeic_questions: {
      deleteMany: async () => ({ count: 1 }),
      create: async (input: { data: Record<string, unknown> }) => {
        questionCreates.push(input.data);
        return { id: 31 };
      },
    },
    toeic_stimuli: {
      deleteMany: async () => ({ count: 0 }),
      create: async () => ({ id: 41 }),
    },
    toeic_tests: {
      update: async (input: { data: Record<string, unknown> }) => {
        updates.push(input.data);
        return { id: 11 };
      },
      create: async () => ({ id: 11 }),
    },
  };
  const prisma = {
    toeic_tests: {
      findUnique: async () => ({ id: 11, source_version: "a".repeat(64) }),
    },
    $transaction: async (
      callback: (client: typeof transaction) => Promise<unknown>
    ) => {
      transactions += 1;
      return callback(transaction);
    },
  } as unknown as PrismaClient;
  const publishedAt = new Date("2026-07-31T00:00:00.000Z");
  const store = createPrismaToeicReadingImportStore(prisma, () => publishedAt);

  const result = await store.importOne({
    courseId: 7,
    content: content("b".repeat(64)),
    practiceStats: [
      {
        sourceItemId: "question-101",
        part: 5,
        difficultyLevel: 3,
        errorRate: 42,
        totalAttempts: 10,
      },
    ],
  });

  assert.equal(result, "UPDATED");
  assert.equal(transactions, 1);
  assert.deepEqual(updates[0], {
    test_set_id: 21,
    source_version: "b".repeat(64),
    title: "Test 1",
    status: "PUBLISHED",
    published_at: publishedAt,
  });
  assert.equal(questionCreates[0]?.difficulty_level, 3);
  assert.equal(questionCreates[0]?.error_rate, 42);
  assert.equal(questionCreates[0]?.total_attempts, 10);
});
