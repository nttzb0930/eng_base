import assert from "node:assert/strict";
import test from "node:test";

import { buildToeicDictationInventory } from "./toeic-dictation.inventory";
import type {
  ToeicDictationInventorySource,
  ToeicDictationSetRow,
} from "./toeic-dictation.types";

function setRow(overrides: Partial<ToeicDictationSetRow> = {}): ToeicDictationSetRow {
  return {
    sourceSetId: "set-1",
    name: "TEST 1 2026",
    folderPath: "2026/test-1/part-1",
    part: 1,
    accessLevel: "free",
    order: 0,
    collectionName: "Đề 2026",
    chapterName: null,
    subtitle: null,
    isHidden: false,
    ...overrides,
  };
}

function source(overrides: Partial<ToeicDictationInventorySource> = {}) {
  return {
    listSets: () => Promise.resolve([setRow()]),
    listItems: () =>
      Promise.resolve([
        {
          sourceItemId: "item-1",
          sourceSetId: "set-1",
          order: 0,
          groupId: null,
          groupOrder: null,
          audioUrl: "https://media.example/item-1.mp3",
          transcript: "She opens the door.",
          translationVi: "Cô ấy mở cửa.",
          durationSeconds: 4,
          isHidden: false,
        },
      ]),
    inspectMedia: () =>
      Promise.resolve({
        bytes: 1_024,
        contentType: "audio/mpeg",
      }),
    ...overrides,
  } satisfies ToeicDictationInventorySource;
}

test("inventory filters only free visible 2026 sets and hashes stable canonical content", async () => {
  const rows = [
    setRow(),
    setRow({ sourceSetId: "hidden", isHidden: true }),
    setRow({ sourceSetId: "pro", accessLevel: "pro" }),
    setRow({ sourceSetId: "2025", collectionName: "Đề 2025" }),
  ];
  const result = await buildToeicDictationInventory({
    source: source({ listSets: () => Promise.resolve(rows) }),
    collectionName: "Đề 2026",
    observedAt: "2026-08-01T00:00:00.000Z",
  });

  assert.equal(result.selectedSetCount, 1);
  assert.equal(result.itemCount, 1);
  assert.equal(result.audioCount, 1);
  assert.equal(result.knownMediaBytes, 1_024);
  assert.equal(result.unknownMediaSizeCount, 0);
  assert.match(result.inventorySha256, /^[a-f0-9]{64}$/u);
});

test("inventory rejects a selected set with missing transcript or audio", async () => {
  await assert.rejects(
    () =>
      buildToeicDictationInventory({
        source: source({
          listItems: () =>
            Promise.resolve([
              {
                sourceItemId: "item-1",
                sourceSetId: "set-1",
                order: 0,
                groupId: null,
                groupOrder: null,
                audioUrl: null,
                transcript: "",
                translationVi: null,
                durationSeconds: 0,
                isHidden: false,
              },
            ]),
        }),
        collectionName: "Đề 2026",
        observedAt: "2026-08-01T00:00:00.000Z",
      }),
    /missing audio|missing transcript/u
  );
});

test("inventory inspects media with a bounded concurrency", async () => {
  let active = 0;
  let maxActive = 0;
  const result = await buildToeicDictationInventory({
    source: source({
      listItems: () =>
        Promise.resolve(
          Array.from({ length: 5 }, (_, index) => ({
            sourceItemId: `item-${index + 1}`,
            sourceSetId: "set-1",
            order: index,
            groupId: null,
            groupOrder: null,
            audioUrl: `https://media.example/item-${index + 1}.mp3`,
            transcript: `Sentence ${index + 1}.`,
            translationVi: null,
            durationSeconds: 2,
            isHidden: false,
          }))
        ),
      inspectMedia: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return { bytes: 100, contentType: "audio/mpeg" };
      },
    }),
    collectionName: "Đề 2026",
    observedAt: "2026-08-01T00:00:00.000Z",
    mediaConcurrency: 2,
  });

  assert.equal(result.audioCount, 5);
  assert.equal(maxActive, 2);
});
