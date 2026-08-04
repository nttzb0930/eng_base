import assert from "node:assert/strict";
import test from "node:test";

import { importToeicWriting } from "./toeic-writing.import.js";
import type {
  ToeicWritingCanonicalTask,
  ToeicWritingPartOneCanonicalTask,
} from "./toeic-writing.types.js";

function partOneFixture(): ToeicWritingPartOneCanonicalTask {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceTaskId: "part-1-task-1",
    sourceVersion: "a".repeat(64),
    contentSha256: "b".repeat(64),
    retrievedAt: "2026-08-02T00:00:00.000Z",
    licenseReference: "authorized-source-2026-08",
    part: 1,
    order: 1,
    title: "Describe the picture",
    difficulty: "EASY",
    instructionsEn: "Write one sentence about the picture.",
    instructionsVi: null,
    media: {
      storageKey: `part-1-task-1/${"a".repeat(64)}/media/${"c".repeat(64)}.jpg`,
      sha256: "c".repeat(64),
      bytes: 1_024,
      mimeType: "image/jpeg",
    },
    payload: {
      requiredWords: [{ en: "woman", vi: null }],
      pattern: null,
      structureSuggestions: ["Subject + verb + object"],
      ideas: ["A woman writes in a notebook."],
      samplesEn: ["A woman is writing in a notebook."],
      samplesVi: [],
    },
  };
}

function fakeImportStore() {
  const versions = new Map<string, string>();
  return {
    deletedLearnerRows: 0,
    async importOne(task: ToeicWritingCanonicalTask) {
      if (versions.get(task.sourceTaskId) === task.contentSha256) {
        return "SKIPPED" as const;
      }
      versions.set(task.sourceTaskId, task.contentSha256);
      return "UPDATED" as const;
    },
  };
}

test("unchanged import skips and preserves learner rows", async () => {
  const store = fakeImportStore();
  const first = await importToeicWriting({
    packages: [partOneFixture()],
    store,
  });
  const second = await importToeicWriting({
    packages: [partOneFixture()],
    store,
  });

  assert.deepEqual(first.updated, ["part-1-task-1"]);
  assert.deepEqual(second.skipped, ["part-1-task-1"]);
  assert.equal(store.deletedLearnerRows, 0);
});

test("import keeps only the latest valid package for each source task", async () => {
  const store = fakeImportStore();
  const older = partOneFixture();
  const latest = {
    ...partOneFixture(),
    sourceVersion: "d".repeat(64),
    contentSha256: "e".repeat(64),
    retrievedAt: "2026-08-03T00:00:00.000Z",
  };

  const result = await importToeicWriting({
    packages: [latest, older],
    store,
  });

  assert.deepEqual(result.updated, ["part-1-task-1"]);
  assert.deepEqual(result.rejected, []);
});
