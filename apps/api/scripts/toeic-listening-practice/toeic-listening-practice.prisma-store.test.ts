import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { createPrismaToeicListeningImportStore } from "./toeic-listening-practice.prisma-store.js";
import type { ToeicListeningPracticeTest } from "./toeic-listening-practice.types.js";

const source = readFileSync(
  resolve(__dirname, "toeic-listening-practice.prisma-store.ts"),
  "utf8"
);

const content: ToeicListeningPracticeTest = {
  schemaVersion: 1,
  source: "dautoeic",
  sourceSetId: "set-2026",
  sourceSetName: "2026",
  sourceTestId: "test-1",
  listeningSourceVersion: "b".repeat(64),
  title: "Test 1",
  parts: [],
  media: [],
};

test("Listening store augments an exact existing Reading test atomically", () => {
  assert.match(source, /source_source_test_id/u);
  assert.match(source, /source_set_id !== content\.sourceSetId/u);
  assert.doesNotMatch(source, /toeic_tests\.create\(/u);
  assert.match(source, /prisma\.\$transaction/u);
  assert.match(source, /listening_source_version/u);
  assert.match(source, /listening_status: "PUBLISHED"/u);
});

test("Listening replacement is scoped to Parts 1 through 4", () => {
  assert.match(source, /const parts = \[1, 2, 3, 4\]/u);
  assert.match(source, /part: \{ in: parts \}/u);
  assert.doesNotMatch(source, /^\s+source_version:/mu);
});

test("imports a changed Listening test with the offline transaction budget", async () => {
  let transactionOptions: Record<string, unknown> | undefined;
  const prisma = {
    toeic_tests: {
      findUnique: async () => ({
        id: 11,
        listening_source_version: "a".repeat(64),
        toeic_test_sets: { source_set_id: "set-2026" },
      }),
    },
    $transaction: async (
      _callback: (client: unknown) => Promise<unknown>,
      options?: Record<string, unknown>
    ) => {
      transactionOptions = options;
    },
  } as unknown as PrismaClient;
  const store = createPrismaToeicListeningImportStore(prisma);

  const result = await store.importOne(content);

  assert.equal(result, "UPDATED");
  assert.deepEqual(transactionOptions, {
    maxWait: 10_000,
    timeout: 120_000,
  });
});
