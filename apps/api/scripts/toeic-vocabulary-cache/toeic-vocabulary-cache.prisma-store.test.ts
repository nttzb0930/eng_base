import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { createPrismaToeicVocabularyCacheImportStore } from "./toeic-vocabulary-cache.prisma-store.js";

const input = {
  source: "dautoeic" as const,
  sourceTestIds: ["test-1"],
  inventorySha256: "a".repeat(64),
  entries: { "source-question-1": [{ word: "lift" }] },
};

test("skips an inventory already applied to every matching question", async () => {
  let transactionCalled = false;
  const prisma = {
    toeic_questions: {
      findMany: () =>
        Promise.resolve([{ id: 11, source_question_id: "source-question-1" }]),
    },
    toeic_question_vocabulary_cache: {
      count: () => Promise.resolve(1),
    },
    $transaction: () => {
      transactionCalled = true;
      return Promise.resolve();
    },
  } as unknown as PrismaClient;

  const result =
    await createPrismaToeicVocabularyCacheImportStore(prisma).replace(input);

  assert.equal(result, "SKIPPED");
  assert.equal(transactionCalled, false);
});

test("atomically replaces cache payloads for resolved source questions", async () => {
  let deleted: unknown;
  let created: unknown;
  const transaction = {
    toeic_question_vocabulary_cache: {
      deleteMany: (args: unknown) => {
        deleted = args;
        return Promise.resolve({ count: 1 });
      },
      createMany: (args: unknown) => {
        created = args;
        return Promise.resolve({ count: 1 });
      },
    },
  };
  const prisma = {
    toeic_questions: {
      findMany: () =>
        Promise.resolve([{ id: 11, source_question_id: "source-question-1" }]),
    },
    toeic_question_vocabulary_cache: {
      count: () => Promise.resolve(0),
    },
    $transaction: (run: (value: typeof transaction) => Promise<void>) =>
      run(transaction),
  } as unknown as PrismaClient;

  const result =
    await createPrismaToeicVocabularyCacheImportStore(prisma).replace(input);

  assert.equal(result, "UPDATED");
  assert.deepEqual(deleted, { where: { question_id: { in: [11] } } });
  assert.deepEqual(created, {
    data: [
      {
        question_id: 11,
        vocabulary: [{ word: "lift" }],
        source_inventory_sha256: "a".repeat(64),
      },
    ],
  });
});
