import assert from "node:assert/strict";
import test from "node:test";

import { inventoryToeicListeningPractice } from "./toeic-listening-practice.inventory";
import type {
  ApprovedToeicTestIdentity,
  ToeicListeningInventorySource,
} from "./toeic-listening-practice.types";

const approved: ApprovedToeicTestIdentity[] = [
  {
    sourceTestId: "test-1",
    sourceSetId: "set-2026",
    title: "Test 1",
    order: 1,
  },
];

function rows(part: 1 | 2 | 3 | 4, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    sourceQuestionId: `${part}-${index + 1}`,
    sourceTestId: "test-1",
    part,
    sourceNumber: ({ 1: 1, 2: 7, 3: 32, 4: 71 } as const)[part] + index,
    stimulusId: part >= 3 ? `${part}-${Math.floor(index / 3)}` : null,
    audioUrl:
      part <= 2 ? `https://media.example/${part}-${index + 1}.mp3` : null,
    imageUrl:
      part === 1 ? `https://media.example/${part}-${index + 1}.jpg` : null,
  }));
}

function source(overrides: Partial<ToeicListeningInventorySource> = {}) {
  return {
    listTests: () =>
      Promise.resolve([
        {
          sourceTestId: "test-1",
          sourceSetId: "set-2026",
          title: "Test 1",
          order: 1,
        },
        {
          sourceTestId: "impostor",
          sourceSetId: "other-set",
          title: "Test 1",
          order: 1,
        },
      ]),
    listQuestionIndex: () =>
      Promise.resolve([
        ...rows(1, 6),
        ...rows(2, 25),
        ...rows(3, 39),
        ...rows(4, 30),
      ]),
    listStimulusIndex: () =>
      Promise.resolve([
        ...Array.from({ length: 13 }, (_, index) => ({
          sourceStimulusId: `3-${index}`,
          sourceTestId: "test-1",
          part: 3 as const,
          audioUrl: `https://media.example/3-${index}.mp3`,
          imageUrl: null,
        })),
        ...Array.from({ length: 10 }, (_, index) => ({
          sourceStimulusId: `4-${index}`,
          sourceTestId: "test-1",
          part: 4 as const,
          audioUrl: `https://media.example/4-${index}.mp3`,
          imageUrl: null,
        })),
      ]),
    inspectMedia: (url: string) =>
      Promise.resolve({
        url,
        bytes: url.endsWith(".mp3") ? 1_000 : 500,
        contentType: url.endsWith(".mp3") ? "audio/mpeg" : "image/jpeg",
      }),
    ...overrides,
  } satisfies ToeicListeningInventorySource;
}

test("inventory selects exact approved identities and reports stable media totals", async () => {
  const result = await inventoryToeicListeningPractice({
    source: source(),
    approvedTests: approved,
    readingInventorySha256: "a".repeat(64),
    observedAt: "2026-07-31T00:00:00.000Z",
  });
  const repeated = await inventoryToeicListeningPractice({
    source: source(),
    approvedTests: approved,
    readingInventorySha256: "a".repeat(64),
    observedAt: "2026-08-01T00:00:00.000Z",
  });

  assert.deepEqual(result.questionCounts, {
    "1": 6,
    "2": 25,
    "3": 39,
    "4": 30,
  });
  assert.equal(result.selectedTests[0]?.sourceTestId, "test-1");
  assert.equal(result.audioCount, 54);
  assert.equal(result.imageCount, 6);
  assert.equal(result.knownMediaBytes, 57_000);
  assert.equal(result.unknownMediaSizeCount, 0);
  assert.equal(result.inventorySha256, repeated.inventorySha256);
});

test("inventory rejects metadata drift instead of matching a title", async () => {
  await assert.rejects(
    () =>
      inventoryToeicListeningPractice({
        source: source({
          listTests: () =>
            Promise.resolve([
              {
                sourceTestId: "test-1",
                sourceSetId: "wrong-set",
                title: "Test 1",
                order: 1,
              },
            ]),
        }),
        approvedTests: approved,
        readingInventorySha256: "a".repeat(64),
        observedAt: "2026-07-31T00:00:00.000Z",
      }),
    /identity does not match approved Reading inventory/u
  );
});

test("inventory reports unknown media sizes without downloading content", async () => {
  const result = await inventoryToeicListeningPractice({
    source: source({
      inspectMedia: (url) =>
        Promise.resolve({ url, bytes: null, contentType: null }),
    }),
    approvedTests: approved,
    readingInventorySha256: "a".repeat(64),
    observedAt: "2026-07-31T00:00:00.000Z",
  });

  assert.equal(result.knownMediaBytes, 0);
  assert.equal(result.unknownMediaSizeCount, 60);
});
