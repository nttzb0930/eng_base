import assert from "node:assert/strict";
import test from "node:test";

import { inventoryToeicWriting } from "./toeic-writing.inventory.js";
import type {
  ToeicWritingSource,
  ToeicWritingSourceTask,
} from "./toeic-writing.types.js";

function sourceTask(part: 1 | 2, order: number): ToeicWritingSourceTask {
  const base = {
    sourceTaskId: `part-${part}-task-${order}`,
    sourceVersion: String(part).repeat(64),
    part,
    order,
    title: `Part ${part} task ${order}`,
    difficulty: part === 1 ? ("EASY" as const) : ("MEDIUM" as const),
    instructionsEn: "Complete the writing task.",
    instructionsVi: null,
  };

  if (part === 1) {
    return {
      ...base,
      part,
      imageUrl: `https://source.example.com/images/${order}.jpg`,
      payload: {
        requiredWords: [{ en: "worker", vi: null }],
        pattern: null,
        structureSuggestions: ["Subject + verb + object"],
        ideas: ["A worker checks a report."],
        samplesEn: ["A worker is checking a report."],
        samplesVi: [],
      },
    };
  }

  return {
    ...base,
    part,
    imageUrl: null,
    payload: {
      promptEn: "Reply to this email.",
      promptVi: null,
      requirements: [{ order: 1, textEn: "Confirm attendance", textVi: null }],
      outlineLevel1: ["Greeting", "Answer"],
      outlineLevel2: ["Greet", "Confirm"],
      chunksLevel1: ["Dear Alex"],
      chunksLevel2: ["Dear {{name}}"],
      gapReferences: ["name"],
      sampleEn: "Dear Alex, I can attend.",
      sampleVi: null,
    },
  };
}

function fakeSource(): ToeicWritingSource {
  return {
    listPartOneTasks: async () =>
      Array.from({ length: 48 }, (_, index) => sourceTask(1, index + 1)).filter(
        (task): task is Extract<ToeicWritingSourceTask, { part: 1 }> =>
          task.part === 1
      ),
    listPartTwoTasks: async () =>
      Array.from({ length: 50 }, (_, index) => sourceTask(2, index + 1)).filter(
        (task): task is Extract<ToeicWritingSourceTask, { part: 2 }> =>
          task.part === 2
      ),
    inspectImage: async () => ({
      bytes: 1_024,
      contentType: "image/jpeg",
    }),
    downloadImage: async () => {
      throw new Error("not used by inventory");
    },
  };
}

test("inventory accepts exactly 48 Part 1 and 50 Part 2 visible tasks", async () => {
  const inventory = await inventoryToeicWriting({
    source: fakeSource(),
    observedAt: "2026-08-02T00:00:00.000Z",
    licenseReference: "authorized-source-2026-08",
  });

  assert.deepEqual(inventory.taskCounts, { "1": 48, "2": 50 });
  assert.equal(inventory.imageCount, 48);
  assert.match(inventory.inventorySha256, /^[a-f0-9]{64}$/u);
});
