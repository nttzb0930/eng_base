import assert from "node:assert/strict";
import test from "node:test";

import { importToeicDictationPackage } from "./toeic-dictation.import.js";
import type { ToeicDictationImportManifest } from "./toeic-dictation.import.js";
import type { ToeicDictationInventory } from "./toeic-dictation.types.js";

const sha = "a".repeat(64);
const sourceSetId = "set-1";
const sourceItemId = "item-1";
const audioUrl = "https://example.test/audio.mp3";

function packageFixture(): {
  content: ToeicDictationInventory;
  manifest: ToeicDictationImportManifest;
} {
  const item = {
    sourceItemId,
    sourceSetId,
    order: 1,
    groupId: null,
    groupOrder: null,
    audioUrl,
    transcript: "A short sentence.",
    translationVi: "Một câu ngắn.",
    durationSeconds: 2,
    isHidden: false,
    media: { url: audioUrl, bytes: 10, contentType: "audio/mpeg" },
  };
  const set = {
    sourceSetId,
    name: "TEST 1 2026",
    folderPath: "luyende/test",
    part: 1 as const,
    accessLevel: "free" as const,
    order: 1,
    collectionName: "Đề 2026",
    chapterName: null,
    subtitle: null,
    isHidden: false,
    items: [item],
  };
  return {
    content: {
      schemaVersion: 1,
      source: "dautoeic",
      collectionName: "Đề 2026",
      observedAt: "2026-08-01T00:00:00.000Z",
      selectedSetCount: 1,
      itemCount: 1,
      audioCount: 1,
      knownMediaBytes: 10,
      unknownMediaSizeCount: 0,
      selectedSets: [set],
      media: [item.media],
      inventorySha256: sha,
      storageKey: `inventories/toeic-dictation/2026/${sha}.json`,
    },
    manifest: {
      schemaVersion: 1,
      source: "dautoeic",
      collectionName: "Đề 2026",
      inventorySha256: sha,
      media: [
        {
          url: audioUrl,
          storagePath: `toeic-dictation/2026/${sha}/media/audio.mp3`,
          sha256: "b".repeat(64),
          bytes: 10,
          contentType: "audio/mpeg",
        },
      ],
    },
  };
}

test("dictation import is idempotent and delegates each validated set once", async () => {
  const fixture = packageFixture();
  const calls: string[] = [];
  let count = 0;
  const result = await importToeicDictationPackage({
    approvedSha256: sha,
    expectedSetCount: 1,
    storage: {
      readPackageFile: async (_version, name) =>
        name === "content.json" ? fixture.content : fixture.manifest,
    },
    store: {
      importSet: async ({ set }) => {
        calls.push(set.sourceSetId);
        return count++ === 0 ? "UPDATED" : "SKIPPED";
      },
    },
  });

  assert.deepEqual(calls, [sourceSetId]);
  assert.deepEqual(result, {
    updated: [sourceSetId],
    skipped: [],
    rejected: [],
    failed: [],
  });
});

test("dictation import rejects a manifest from another approved version", async () => {
  const fixture = packageFixture();
  fixture.manifest.inventorySha256 = "c".repeat(64);
  let called = false;
  const result = await importToeicDictationPackage({
    approvedSha256: sha,
    expectedSetCount: 1,
    storage: {
      readPackageFile: async (_version, name) =>
        name === "content.json" ? fixture.content : fixture.manifest,
    },
    store: {
      importSet: async () => {
        called = true;
        return "UPDATED";
      },
    },
  });

  assert.equal(called, false);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(result.updated, []);
});
