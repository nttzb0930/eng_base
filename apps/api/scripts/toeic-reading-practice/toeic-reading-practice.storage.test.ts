import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createFileToeicReadingStorage } from "./toeic-reading-practice.storage.js";
import type { ToeicReadingInventory } from "./toeic-reading-practice.types.js";

const inventory: ToeicReadingInventory = {
  schemaVersion: 1,
  source: "dautoeic",
  sourceSet: "2026",
  limitTests: 1,
  observedAt: "2026-07-31T00:00:00.000Z",
  selectedTests: [],
  excludedHiddenCount: 0,
  excludedNotFreeCount: 0,
  questionCounts: { "5": 0, "6": 0, "7": 0 },
  totalQuestions: 0,
  inventorySha256: "a".repeat(64),
};

test("atomically stores approved inventories and complete packages", async () => {
  const root = await mkdtemp(join(tmpdir(), "toeic-reading-storage-"));
  try {
    const storage = createFileToeicReadingStorage({
      repositoryRoot: "C:\\workspace\\eng-base",
      configuredRoot: root,
    });
    const key = await storage.writeInventory(inventory);
    assert.equal(
      key,
      `inventories/toeic-reading-practice/${inventory.inventorySha256}.json`,
    );
    assert.deepEqual(
      await storage.readInventory(inventory.inventorySha256),
      inventory,
    );
    await storage.writePackageFile(
      "test-1",
      "b".repeat(64),
      "content.json",
      { title: "Test 1" },
    );
    assert.equal(await storage.packageExists("test-1", "b".repeat(64)), false);
    await storage.writePackageFile(
      "test-1",
      "b".repeat(64),
      "manifest.json",
      { complete: true },
    );
    assert.equal(await storage.packageExists("test-1", "b".repeat(64)), true);
    assert.equal(
      JSON.parse(
        await readFile(
          join(
            root,
            "toeic-reading-practice",
            "test-1",
            "b".repeat(64),
            "content.json",
          ),
          "utf8",
        ),
      ).title,
      "Test 1",
    );
    await assert.rejects(
      storage.writePackageFile(
        "../escape",
        "b".repeat(64),
        "content.json",
        {},
      ),
      /unsafe/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
