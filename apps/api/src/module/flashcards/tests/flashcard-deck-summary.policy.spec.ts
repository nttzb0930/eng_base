import assert from "node:assert/strict";
import test from "node:test";

import type {
  UserVocabularyProgress,
  VocabularyItem,
} from "../../vocabulary";
import { summarizeFlashcardDeck } from "../use-cases/flashcard-deck-summary.policy";

const NOW = new Date("2026-07-24T00:00:00.000Z");

function createProgress(
  vocabularyItemId: number,
  overrides: Partial<UserVocabularyProgress> = {},
): UserVocabularyProgress {
  return {
    id: vocabularyItemId,
    userId: "user-1",
    vocabularyItemId,
    correctCount: 0,
    wrongCount: 0,
    reviewCount: 1,
    masteryLevel: "learning",
    easeFactor: 2.5,
    intervalDays: 1,
    repetitionCount: 1,
    lastReviewedAt: new Date("2026-07-22T00:00:00.000Z"),
    nextReviewAt: new Date("2026-07-25T00:00:00.000Z"),
    createdAt: new Date("2026-07-20T00:00:00.000Z"),
    updatedAt: new Date("2026-07-22T00:00:00.000Z"),
    ...overrides,
  };
}

function createItem(
  id: number,
  progress?: UserVocabularyProgress,
): VocabularyItem {
  return {
    id,
    word: `word-${id}`,
    normalizedWord: `word-${id}`,
    pos: "noun",
    posVi: null,
    cefrLevel: "A1",
    phonetic: null,
    phoneticSource: null,
    audioUrl: null,
    audioSource: null,
    exampleEn: null,
    exampleVi: null,
    exampleSource: null,
    meaningVi: `meaning-${id}`,
    primaryMeaningVi: `meaning-${id}`,
    source: "test",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    userSavedWords: [],
    userVocabularyProgress: progress ? [progress] : [],
    vocabularyExamples: [],
  };
}

test("empty deck is unavailable with null accuracy", () => {
  assert.deepEqual(summarizeFlashcardDeck("travel", "topic", [], NOW), {
    key: "travel",
    source: "topic",
    total: 0,
    learned: 0,
    mastered: 0,
    due: 0,
    accuracy: null,
    lastReviewedAt: null,
    available: false,
  });
});

test("learned and mastered counts use learner progress", () => {
  const result = summarizeFlashcardDeck(
    "A1",
    "cefr",
    [
      createItem(1),
      createItem(2, createProgress(2)),
      createItem(3, createProgress(3, { masteryLevel: "mastered" })),
    ],
    NOW,
  );

  assert.equal(result.total, 3);
  assert.equal(result.learned, 2);
  assert.equal(result.mastered, 1);
});

test("due includes reviewed items with null or expired next review", () => {
  const result = summarizeFlashcardDeck(
    "due",
    "due",
    [
      createItem(1, createProgress(1, { nextReviewAt: null })),
      createItem(
        2,
        createProgress(2, {
          nextReviewAt: new Date("2026-07-23T23:59:59.000Z"),
        }),
      ),
      createItem(3, createProgress(3)),
      createItem(4),
    ],
    NOW,
  );

  assert.equal(result.due, 2);
});

test("accuracy aggregates correct and wrong attempts", () => {
  const result = summarizeFlashcardDeck(
    "weak",
    "weak",
    [
      createItem(1, createProgress(1, { correctCount: 3, wrongCount: 1 })),
      createItem(2, createProgress(2, { correctCount: 3, wrongCount: 1 })),
      createItem(3),
    ],
    NOW,
  );

  assert.equal(result.accuracy, 75);
});

test("last reviewed date is the newest progress timestamp", () => {
  const newest = new Date("2026-07-23T12:00:00.000Z");
  const result = summarizeFlashcardDeck(
    "saved",
    "saved",
    [
      createItem(1, createProgress(1)),
      createItem(2, createProgress(2, { lastReviewedAt: newest })),
      createItem(3, createProgress(3, { lastReviewedAt: null })),
    ],
    NOW,
  );

  assert.equal(result.lastReviewedAt, newest);
});
