import assert from "node:assert/strict";
import test from "node:test";

import {
  getVocabularyLearnerState,
  summarizeVocabularyLearnerStates,
} from "../use-cases/vocabulary-learner-state.policy";
import type {
  UserVocabularyProgress,
  VocabularyItem,
} from "../types/vocabulary.types";

const NOW = new Date("2026-07-24T00:00:00.000Z");

const createProgress = (
  overrides: Partial<UserVocabularyProgress> = {},
): UserVocabularyProgress => ({
  id: 1,
  userId: "learner-1",
  vocabularyItemId: 1,
  correctCount: 0,
  wrongCount: 0,
  reviewCount: 1,
  masteryLevel: "learning",
  easeFactor: 2.5,
  intervalDays: 1,
  repetitionCount: 0,
  lastReviewedAt: new Date("2026-07-23T00:00:00.000Z"),
  nextReviewAt: new Date("2026-07-25T00:00:00.000Z"),
  createdAt: new Date("2026-07-23T00:00:00.000Z"),
  updatedAt: new Date("2026-07-23T00:00:00.000Z"),
  ...overrides,
});

const createItem = (
  id: number,
  progress?: UserVocabularyProgress,
): VocabularyItem => ({
  id,
  word: `word-${id}`,
  normalizedWord: `word-${id}`,
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "A1",
  phonetic: null,
  phoneticSource: null,
  audioUrl: null,
  audioSource: null,
  exampleEn: null,
  exampleVi: null,
  exampleSource: null,
  meaningVi: `nghĩa-${id}`,
  primaryMeaningVi: `nghĩa-${id}`,
  source: "test",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  userSavedWords: [],
  userVocabularyProgress: progress ? [progress] : [],
  vocabularyExamples: [],
});

test("unreviewed vocabulary is unlearned only", () => {
  assert.deepEqual(getVocabularyLearnerState(createItem(1), NOW), {
    learned: false,
    learning: false,
    unlearned: true,
    mastered: false,
    weak: false,
    due: false,
    masteryLevel: null,
  });
});

test("reviewed non-mastered vocabulary is learning", () => {
  const state = getVocabularyLearnerState(
    createItem(1, createProgress()),
    NOW,
  );

  assert.equal(state.learned, true);
  assert.equal(state.learning, true);
  assert.equal(state.mastered, false);
  assert.equal(state.unlearned, false);
});

test("mastered vocabulary remains mastered when due", () => {
  const state = getVocabularyLearnerState(
    createItem(
      1,
      createProgress({
        masteryLevel: "mastered",
        nextReviewAt: new Date("2026-07-24T00:00:00.000Z"),
      }),
    ),
    NOW,
  );

  assert.equal(state.mastered, true);
  assert.equal(state.learning, false);
  assert.equal(state.due, true);
});

test("wrong reviewed vocabulary is weak", () => {
  const state = getVocabularyLearnerState(
    createItem(1, createProgress({ wrongCount: 1 })),
    NOW,
  );

  assert.equal(state.weak, true);
  assert.equal(state.learning, true);
});

test("null or expired next review is due after a review", () => {
  const nullSchedule = createItem(
    1,
    createProgress({ nextReviewAt: null }),
  );
  const expiredSchedule = createItem(
    2,
    createProgress({
      vocabularyItemId: 2,
      nextReviewAt: new Date("2026-07-23T23:59:59.000Z"),
    }),
  );

  assert.equal(getVocabularyLearnerState(nullSchedule, NOW).due, true);
  assert.equal(getVocabularyLearnerState(expiredSchedule, NOW).due, true);
});

test("reordering items preserves every aggregate count", () => {
  const items = [
    createItem(1),
    createItem(2, createProgress({ vocabularyItemId: 2, wrongCount: 1 })),
    createItem(
      3,
      createProgress({
        vocabularyItemId: 3,
        masteryLevel: "mastered",
        nextReviewAt: null,
      }),
    ),
  ];

  const expected = {
    total: 3,
    learned: 2,
    learning: 1,
    unlearned: 1,
    mastered: 1,
    weak: 1,
    due: 1,
  };

  assert.deepEqual(summarizeVocabularyLearnerStates(items, NOW), expected);
  assert.deepEqual(
    summarizeVocabularyLearnerStates([...items].reverse(), NOW),
    expected,
  );
});
