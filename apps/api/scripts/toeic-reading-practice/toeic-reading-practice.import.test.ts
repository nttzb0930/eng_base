import assert from "node:assert/strict";
import test from "node:test";

import { withSourceVersion } from "./toeic-reading-practice.canonical.js";
import {
  importToeicReadingPractice,
  type ToeicReadingImportStore,
} from "./toeic-reading-practice.import.js";
import type {
  ToeicReadingPracticeTest,
  ToeicReadingStorage,
} from "./toeic-reading-practice.types.js";

function content(sourceTestId: string): ToeicReadingPracticeTest {
  return withSourceVersion({
    schemaVersion: 1,
    source: "dautoeic",
    sourceSetId: "set-2026",
    sourceSetName: "2026",
    sourceTestId,
    title: sourceTestId,
    parts: ([5, 6, 7] as const).map((part) => {
      const start = part === 5 ? 101 : part === 6 ? 131 : 147;
      const count = part === 5 ? 30 : part === 6 ? 16 : 54;
      return {
        part,
        stimuli: [],
        questions: Array.from({ length: count }, (_, index) => ({
          sourceQuestionId: sourceTestId + "-q-" + (start + index),
          sourceNumber: start + index,
          stimulusId: null,
          prompt: "Question " + (start + index),
          translation: null,
          explanation: null,
          choices: (["A", "B", "C", "D"] as const).map((label) => ({
            label,
            text: label,
            correct: label === "A",
          })),
        })),
      };
    }),
    media: [],
  });
}

function storage(packages: ToeicReadingPracticeTest[]): ToeicReadingStorage {
  const values = new Map(
    packages.map((value) => [
      value.sourceTestId + "/" + value.sourceVersion,
      value,
    ])
  );
  return {
    writeInventory: async () => "",
    readInventory: async () => {
      throw new Error("unused");
    },
    packageExists: async () => true,
    writePackageFile: async () => undefined,
    listCompletePackages: async () =>
      packages.map(({ sourceTestId, sourceVersion }) => ({
        sourceTestId,
        sourceVersion,
      })),
    readPackageFile: async (sourceTestId, sourceVersion, name) => {
      const value = values.get(sourceTestId + "/" + sourceVersion);
      if (!value) throw new Error("missing package");
      if (name === "content.json") return value;
      if (name === "validation.json") return { valid: true, errors: [] };
      if (name === "practice-stats.json") {
        return { observedAt: "2026-07-31T00:00:00.000Z", items: [] };
      }
      return {
        schemaVersion: 1,
        source: value.source,
        sourceSetId: value.sourceSetId,
        sourceTestId: value.sourceTestId,
        sourceVersion: value.sourceVersion,
      };
    },
  };
}

test("resolves the Course first and sorts idempotent outcomes", async () => {
  const calls: string[] = [];
  const resultById = new Map<string, "CREATED" | "UPDATED" | "SKIPPED">([
    ["test-c", "SKIPPED"],
    ["test-a", "CREATED"],
    ["test-b", "UPDATED"],
  ]);
  const store: ToeicReadingImportStore = {
    requireCourseId: async (code) => {
      calls.push("require:" + code);
      return 7;
    },
    importOne: async ({ courseId, content: value }) => {
      assert.equal(courseId, 7);
      calls.push("import:" + value.sourceTestId);
      return resultById.get(value.sourceTestId)!;
    },
  };

  const result = await importToeicReadingPractice({
    storage: storage([content("test-c"), content("test-a"), content("test-b")]),
    store,
  });

  assert.equal(calls[0], "require:toeic-600");
  assert.deepEqual(result, {
    created: ["test-a"],
    updated: ["test-b"],
    skipped: ["test-c"],
    rejected: [],
    failed: [],
  });
});

test("rejects an invalid package before calling the store", async () => {
  const invalid = content("test-invalid");
  invalid.parts[0]!.questions.pop();
  let importCalls = 0;
  const store: ToeicReadingImportStore = {
    requireCourseId: async () => 7,
    importOne: async () => {
      importCalls += 1;
      return "CREATED";
    },
  };

  const result = await importToeicReadingPractice({
    storage: storage([invalid]),
    store,
  });

  assert.equal(importCalls, 0);
  assert.equal(result.rejected[0]?.sourceTestId, "test-invalid");
  assert.match(result.rejected[0]?.errors.join(" ") ?? "", /Part 5/u);
});
