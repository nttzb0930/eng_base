import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateToeicWritingContentSha256,
  sha256Canonical,
} from "./toeic-writing.canonical.js";
import type {
  ToeicWritingPartOneCanonicalTask,
  ToeicWritingPartTwoCanonicalTask,
} from "./toeic-writing.types.js";
import { validateToeicWritingTask } from "./toeic-writing.validation.js";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);

function partOneFixture(): ToeicWritingPartOneCanonicalTask {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceTaskId: "part-1-task-1",
    sourceVersion: SHA_A,
    contentSha256: SHA_B,
    retrievedAt: "2026-08-02T00:00:00.000Z",
    licenseReference: "authorized-source-2026-08",
    part: 1,
    order: 1,
    title: "Describe the picture",
    difficulty: "EASY",
    instructionsEn: "Write one sentence about the picture.",
    instructionsVi: "Viết một câu về bức tranh.",
    media: {
      storageKey: `part-1-task-1/${SHA_A}/media/${SHA_C}.jpg`,
      sha256: SHA_C,
      bytes: 12_345,
      mimeType: "image/jpeg",
    },
    payload: {
      requiredWords: [
        {
          en: "woman",
          vi: "người phụ nữ",
        },
        {
          en: "write",
          vi: "viết",
        },
      ],
      pattern: "subject-verb-object",
      structureSuggestions: ["Subject + be + verb-ing + object."],
      ideas: ["The woman is taking notes."],
      samplesEn: ["A woman is writing in a notebook."],
      samplesVi: ["Một người phụ nữ đang viết vào sổ tay."],
    },
  };
}

function partTwoFixture(): ToeicWritingPartTwoCanonicalTask {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceTaskId: "part-2-task-1",
    sourceVersion: SHA_A,
    contentSha256: SHA_B,
    retrievedAt: "2026-08-02T00:00:00.000Z",
    licenseReference: "authorized-source-2026-08",
    part: 2,
    order: 1,
    title: "Reply to an event invitation",
    difficulty: "MEDIUM",
    instructionsEn: "Read the email and write a response.",
    instructionsVi: "Đọc email và viết thư trả lời.",
    media: null,
    payload: {
      promptEn: "Please confirm whether you can attend the workshop.",
      promptVi: "Vui lòng xác nhận bạn có thể tham dự hội thảo hay không.",
      requirements: [
        {
          order: 1,
          textEn: "Confirm attendance.",
          textVi: "Xác nhận tham dự.",
        },
      ],
      outlineLevel1: ["Greeting", "Answer", "Closing"],
      outlineLevel2: ["Greet the organizer", "Confirm attendance", "Close"],
      chunksLevel1: ["Dear organizer", "I can attend", "Best regards"],
      chunksLevel2: [
        "Dear {{recipient name}}",
        "I am writing to confirm my attendance.",
      ],
      gapReferences: ["recipient name"],
      sampleEn: "Dear Alex, I am writing to confirm my attendance.",
      sampleVi: "Chào Alex, tôi viết thư để xác nhận tham dự.",
    },
  };
}

test("accepts a complete synthetic Part 1 task", () => {
  const result = validateToeicWritingTask(partOneFixture());

  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("rejects Part 1 without verified image or required words", () => {
  const task = partOneFixture();
  task.payload.requiredWords = [];
  task.media = null as never;

  assert.deepEqual(validateToeicWritingTask(task).errors, [
    "payload.requiredWords must contain at least one word",
    "media is required for Part 1",
  ]);
});

test("rejects Part 2 with orphaned gap references", () => {
  const task = partTwoFixture();
  task.payload.gapReferences = ["unused"];
  task.payload.chunksLevel2 = [];

  assert.match(
    validateToeicWritingTask(task).errors.join("\n"),
    /gap reference/iu
  );
});

test("canonical hashing sorts object keys but retains array order", () => {
  assert.equal(
    sha256Canonical({ second: 2, first: 1 }),
    sha256Canonical({ first: 1, second: 2 })
  );
  assert.notEqual(
    sha256Canonical({ items: ["first", "second"] }),
    sha256Canonical({ items: ["second", "first"] })
  );
});

test("content hashing excludes retrieval time and the checksum field", () => {
  const first = partOneFixture();
  const second = {
    ...first,
    retrievedAt: "2026-08-03T00:00:00.000Z",
    contentSha256: SHA_C,
  };

  assert.equal(
    calculateToeicWritingContentSha256(first),
    calculateToeicWritingContentSha256(second)
  );
});
