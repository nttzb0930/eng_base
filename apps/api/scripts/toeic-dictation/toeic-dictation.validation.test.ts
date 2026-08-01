import assert from "node:assert/strict";
import test from "node:test";

import { validateToeicDictationPackage } from "./toeic-dictation.validation";
import type { ToeicDictationInventory } from "./toeic-dictation.types";

function packageValue(overrides: Partial<ToeicDictationInventory> = {}): ToeicDictationInventory {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    collectionName: "Đề 2026",
    observedAt: "2026-08-01T00:00:00.000Z",
    selectedSetCount: 1,
    itemCount: 1,
    audioCount: 1,
    knownMediaBytes: 100,
    unknownMediaSizeCount: 0,
    selectedSets: [
      {
        sourceSetId: "set-1",
        name: "Test 1 Part 1",
        folderPath: null,
        part: 1,
        accessLevel: "free",
        order: 0,
        collectionName: "Đề 2026",
        chapterName: null,
        subtitle: null,
        isHidden: false,
        items: [
          {
            sourceItemId: "item-1",
            sourceSetId: "set-1",
            order: 0,
            groupId: null,
            groupOrder: null,
            audioUrl: "https://media.example/item-1.mp3",
            transcript: "A sentence.",
            translationVi: "Một câu.",
            durationSeconds: 2,
            isHidden: false,
            media: {
              url: "https://media.example/item-1.mp3",
              bytes: 100,
              contentType: "audio/mpeg",
            },
          },
        ],
      },
    ],
    media: [
      {
        url: "https://media.example/item-1.mp3",
        bytes: 100,
        contentType: "audio/mpeg",
      },
    ],
    inventorySha256: "a".repeat(64),
    storageKey: "inventories/toeic-dictation/2026/a.json",
    ...overrides,
  };
}

test("validation accepts a complete free 2026 package", () => {
  const result = validateToeicDictationPackage(packageValue());
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("validation rejects Pro/hidden sets, missing media, and duplicate items", () => {
  const value = packageValue({
    selectedSets: [
      {
        ...packageValue().selectedSets[0]!,
        accessLevel: "pro",
        isHidden: true,
        items: [
          ...packageValue().selectedSets[0]!.items,
          packageValue().selectedSets[0]!.items[0]!,
        ],
      },
    ],
  });
  const result = validateToeicDictationPackage(value);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /access level|hidden|duplicate/u);
});
