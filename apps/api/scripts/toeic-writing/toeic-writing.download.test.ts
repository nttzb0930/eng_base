import assert from "node:assert/strict";
import test from "node:test";

import { sha256Canonical } from "./toeic-writing.canonical.js";
import { downloadToeicWriting } from "./toeic-writing.download.js";
import type {
  ToeicWritingInventory,
  ToeicWritingStorage,
} from "./toeic-writing.types.js";

function fixtureInventory(): ToeicWritingInventory {
  const identity = {
    schemaVersion: 1 as const,
    source: "dautoeic",
    selectedTasks: [],
    taskCounts: { "1": 0, "2": 0 },
    imageCount: 0,
    knownImageBytes: 0,
    unknownImageSizeCount: 0,
    licenseReference: "authorized-source-2026-08",
  };

  return {
    ...identity,
    observedAt: "2026-08-02T00:00:00.000Z",
    inventorySha256: sha256Canonical(identity),
  };
}

function fixturePartTwoInventory(): ToeicWritingInventory {
  const task = {
    sourceTaskId: "part-2-task-1",
    sourceVersion: "a".repeat(64),
    part: 2 as const,
    order: 1,
    title: "Reply to an invitation",
    difficulty: "MEDIUM" as const,
    instructionsEn: "Read the email and write a response.",
    instructionsVi: null,
    imageUrl: null,
    imageBytes: null,
    imageContentType: null,
    payload: {
      titleVi: null,
      promptEn: "Can you attend?",
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
  const identity = {
    schemaVersion: 1 as const,
    source: "dautoeic",
    selectedTasks: [task],
    taskCounts: { "1": 0, "2": 1 },
    imageCount: 0,
    knownImageBytes: 0,
    unknownImageSizeCount: 0,
    licenseReference: "authorized-source-2026-08",
  };

  return {
    ...identity,
    observedAt: "2026-08-02T00:00:00.000Z",
    inventorySha256: sha256Canonical(identity),
  };
}

function fakeStorage(existing = false): ToeicWritingStorage {
  const writes: unknown[] = [];
  return {
    writeInventory: async () => "inventory.json",
    readInventory: async () => fixtureInventory(),
    writePackageFile: async (...args) => {
      writes.push(args);
    },
    readPackageFile: async () => ({ valid: true, errors: [] }),
    writeMediaStream: async () => {
      throw new Error("not used");
    },
    listPackages: async () =>
      existing
        ? [{ sourceTaskId: "part-1-task-1", sourceVersion: "a".repeat(64) }]
        : [],
  };
}

test("download rejects a non-approved inventory digest", async () => {
  await assert.rejects(
    () =>
      downloadToeicWriting({
        source: {
          downloadImage: async () => new ReadableStream<Uint8Array>(),
        },
        storage: fakeStorage(),
        inventory: fixtureInventory(),
        approvedSha256: "b".repeat(64),
      }),
    /approved inventory SHA-256 does not match/iu
  );
});

test("download returns an empty bounded summary for an empty approved inventory", async () => {
  const inventory = fixtureInventory();
  const result = await downloadToeicWriting({
    source: {
      downloadImage: async () => new ReadableStream<Uint8Array>(),
    },
    storage: fakeStorage(),
    inventory,
    approvedSha256: inventory.inventorySha256,
  });

  assert.deepEqual(result, {
    completed: [],
    resumed: [],
    rejected: [],
    failed: [],
  });
});

test("download resumes a package whose validation is already valid", async () => {
  const inventory = fixturePartTwoInventory();
  let sourceCalled = false;
  const storage = fakeStorage();
  storage.listPackages = async () => [
    {
      sourceTaskId: "part-2-task-1",
      sourceVersion: "a".repeat(64),
    },
  ];

  const result = await downloadToeicWriting({
    source: {
      downloadImage: async () => {
        sourceCalled = true;
        return new ReadableStream<Uint8Array>();
      },
    },
    storage,
    inventory,
    approvedSha256: inventory.inventorySha256,
  });

  assert.equal(sourceCalled, false);
  assert.deepEqual(result, {
    completed: [],
    resumed: ["part-2-task-1"],
    rejected: [],
    failed: [],
  });
});
