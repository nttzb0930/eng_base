import assert from "node:assert/strict";
import test from "node:test";

import { downloadToeicReadingPractice } from "./toeic-reading-practice.download.js";
import type {
  ToeicReadingInventory,
  ToeicReadingSource,
  ToeicReadingStorage,
} from "./toeic-reading-practice.types.js";

function rows(testId: string) {
  return Array.from({ length: 100 }, (_, index) => {
    const number = index + 101;
    const part = number <= 130 ? 5 : number <= 146 ? 6 : 7;
    return {
      id: `${testId}-q-${number}`,
      test_id: testId,
      part,
      section: `part-${part}`,
      question_number: number,
      passage_id: part === 5 ? null : `${testId}-p-${part}`,
      image_url: null,
      question_text: `Question ${number}`,
      option_a: "A",
      option_b: "B",
      option_c: "C",
      option_d: "D",
      correct_answer: "A",
      order_index: index,
      dich_nghia: null,
      explanation_vi: null,
    };
  });
}

function passages(testId: string) {
  return [6, 7].map((part) => ({
    id: `${testId}-p-${part}`,
    test_id: testId,
    part,
    passage_type: "text",
    image_url: null,
    title: `Part ${part}`,
    order_index: part,
    passage_text: `Passage ${part}`,
    passage_text_2: null,
    passage_text_3: null,
    dich_nghia: null,
  }));
}

function inventory(): ToeicReadingInventory {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceSet: "2026",
    limitTests: 1,
    observedAt: "2026-07-31T00:00:00.000Z",
    selectedTests: [
      {
        sourceTestId: "test-1",
        sourceSetId: "set-2026",
        title: "Test 1",
        order: 1,
        updatedAt: null,
        questionCounts: { "5": 30, "6": 16, "7": 54 },
        passageIds: ["test-1-p-6", "test-1-p-7"],
        imageUrls: [],
      },
    ],
    excludedHiddenCount: 0,
    excludedNotFreeCount: 0,
    questionCounts: { "5": 30, "6": 16, "7": 54 },
    totalQuestions: 100,
    inventorySha256: "a".repeat(64),
  };
}

test("downloads only approved Reading JSON and finalizes manifest last", async () => {
  const writes: Array<{ name: string; value: unknown }> = [];
  const requestedTests: string[] = [];
  const storage: Pick<
    ToeicReadingStorage,
    "readInventory" | "packageExists" | "writePackageFile"
  > = {
    readInventory: async () => inventory(),
    packageExists: async () => false,
    writePackageFile: async (
      _testId: string,
      _version: string,
      name: string,
      value: unknown
    ) => {
      writes.push({ name, value });
    },
  };
  const source: Pick<
    ToeicReadingSource,
    "readQuestions" | "readPassages" | "readPracticeStats"
  > = {
    readQuestions: async (testId: string) => {
      requestedTests.push(testId);
      return rows(testId);
    },
    readPassages: async (testId: string) => passages(testId),
    readPracticeStats: async () => null,
  };

  const result = await downloadToeicReadingPractice({
    source,
    storage,
    approvedInventorySha256: "a".repeat(64),
    now: () => new Date("2026-07-31T00:00:00.000Z"),
    license: {
      name: "Public source",
      reference: "https://source.example/mock-test",
      intendedUse: "Review before publication",
    },
  });

  assert.deepEqual(requestedTests, ["test-1"]);
  assert.deepEqual(
    writes.map((write) => write.name),
    ["content.json", "validation.json", "manifest.json"]
  );
  const manifest = writes.find((write) => write.name === "manifest.json")
    ?.value as { license?: { reference?: string } };
  assert.equal(manifest.license?.reference, "https://source.example/mock-test");
  assert.deepEqual(result.completed, ["test-1"]);
  assert.deepEqual(result.questionCounts, { "5": 30, "6": 16, "7": 54 });
});

test("rejects incomplete content without finalizing a manifest", async () => {
  const writes: string[] = [];
  const storage: Pick<
    ToeicReadingStorage,
    "readInventory" | "packageExists" | "writePackageFile"
  > = {
    readInventory: async () => inventory(),
    packageExists: async () => false,
    writePackageFile: async (
      _testId: string,
      _version: string,
      name: string
    ) => {
      writes.push(name);
    },
  };
  const source: Pick<
    ToeicReadingSource,
    "readQuestions" | "readPassages" | "readPracticeStats"
  > = {
    readQuestions: async () => rows("test-1").slice(1),
    readPassages: async () => passages("test-1"),
    readPracticeStats: async () => null,
  };

  const result = await downloadToeicReadingPractice({
    source,
    storage,
    approvedInventorySha256: "a".repeat(64),
    now: () => new Date("2026-07-31T00:00:00.000Z"),
    license: {
      name: "Public source",
      reference: "https://source.example/mock-test",
      intendedUse: "Review before publication",
    },
  });

  assert.equal(result.rejected.length, 1);
  assert.equal(writes.includes("manifest.json"), false);
});
