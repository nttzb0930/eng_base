import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  downloadToeicDictationPackage,
  mapToeicDictationMediaWithConcurrency,
} from "./toeic-dictation.download";
import { parseToeicDictationOptions } from "./toeic-dictation.cli";

test("dictation download mapper bounds concurrent workers and keeps order", async () => {
  let active = 0;
  let maxActive = 0;
  const result = await mapToeicDictationMediaWithConcurrency(
    [1, 2, 3, 4, 5],
    2,
    async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    }
  );

  assert.equal(maxActive, 2);
  assert.deepEqual(result, [2, 4, 6, 8, 10]);
});

test("dictation CLI accepts an explicit worker count", () => {
  const parsed = parseToeicDictationOptions([
    "--approved-sha=" + "a".repeat(64),
    "--workers=7",
  ]);
  assert.equal(parsed.workers, 7);
  assert.throws(() => parseToeicDictationOptions(["--workers=0"]), /positive/u);
});

test("dictation download reports progress and continues after one media failure", async () => {
  const events: Array<{ completed: number; total: number; status: string }> = [];
  const inventory = {
    schemaVersion: 1 as const,
    source: "dautoeic" as const,
    collectionName: "Đề 2026",
    observedAt: "2026-08-01T00:00:00.000Z",
    selectedSetCount: 1,
    itemCount: 3,
    audioCount: 3,
    knownMediaBytes: 3,
    unknownMediaSizeCount: 0,
    selectedSets: [],
    media: ["one", "two", "three"].map((url) => ({
      url: `https://media.example/${url}.mp3`,
      bytes: 1,
      contentType: "audio/mpeg",
    })),
    inventorySha256: "a".repeat(64),
    storageKey: "inventories/toeic-dictation/2026/a.json",
  };
  const storage = {
    downloadMedia: async ({ mediaId }: { mediaId: string }) => {
      const failingId = createHash("sha256")
        .update("https://media.example/two.mp3")
        .digest("hex");
      if (mediaId === failingId) throw new Error("media request failed (404)");
      return {
        absolutePath: "private",
        storagePath: "private",
        sha256: "b".repeat(64),
        bytes: 1,
        contentType: "audio/mpeg",
        reused: false,
      };
    },
    writePackageFile: async () => undefined,
  } as never;
  const result = await downloadToeicDictationPackage({
    source: {
      inspectMedia: async () => ({ bytes: 1, contentType: "audio/mpeg" }),
      downloadMedia: async () => ({
        status: 200,
        bytes: new Uint8Array([1]),
        contentType: "audio/mpeg",
      }),
    },
    storage,
    inventory,
    concurrency: 2,
    onProgress: (event) => events.push(event),
  });

  assert.equal(result.downloadedMediaCount, 2);
  assert.equal(result.failed.length, 1);
  assert.deepEqual(
    events.map((event) => event.completed).sort((a, b) => a - b),
    [1, 2, 3]
  );
});
