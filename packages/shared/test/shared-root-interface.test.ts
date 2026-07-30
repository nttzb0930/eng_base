import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CEFR_LEVELS,
  LEARNING_INTENSITY_IDS,
  LESSON_CHALLENGE_TYPES,
  MAX_HEARTS,
  ONBOARDING_GOAL_IDS,
  TARGET_LANGUAGE_IDS,
  type Course,
  type CreateCoursePayload,
  type FlashcardDeckSummary,
  type FlashcardSummary,
  type LearningIntensityId,
  type OnboardingGoalId,
  type PaginatedCoursesResponse,
  type TargetLanguageId,
  type VocabularyLearnerState,
  type VocabularyTopicDetails,
  type VocabularyTopicProgressStats,
} from "@repo/shared";

test("Shared exposes the TypeScript-only root Interface", () => {
  const course: Course = {
    id: 1,
    code: "english-vocabulary",
    title: "English",
    imageSrc: "/en.svg",
  };
  const payload: CreateCoursePayload = {
    code: "english-vocabulary",
    title: "English",
    imageSrc: "/en.svg",
  };
  const page: PaginatedCoursesResponse = {
    data: [course],
    pagination: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
  const deck: FlashcardDeckSummary = {
    key: "travel",
    source: "topic",
    total: 20,
    learned: 8,
    mastered: 3,
    due: 4,
    accuracy: 75,
    lastReviewedAt: new Date("2026-07-24T00:00:00.000Z"),
    available: true,
  };
  const flashcards: FlashcardSummary = {
    overview: {
      due: 4,
      saved: 6,
      weak: 2,
      learned: 8,
      mastered: 3,
      accuracy: 75,
      lastReviewedAt: deck.lastReviewedAt,
    },
    systemDecks: [],
    cefrDecks: [],
    topicDecks: [deck],
  };
  const topicStats: VocabularyTopicProgressStats = {
    total: 1,
    learned: 1,
    learning: 1,
    unlearned: 0,
    mastered: 0,
    weak: 1,
    due: 1,
  };
  const learnerState: VocabularyLearnerState = {
    learned: true,
    learning: true,
    unlearned: false,
    mastered: false,
    weak: true,
    due: true,
    masteryLevel: "learning",
  };
  const topicDetailsItems: VocabularyTopicDetails["items"] = [];
  const targetLanguage: TargetLanguageId = "en";
  const onboardingGoal: OnboardingGoalId = "travel";
  const learningIntensity: LearningIntensityId = "standard";

  assert.equal(course.title, payload.title);
  assert.equal(course.code, payload.code);
  assert.equal(page.data[0]?.imageSrc, "/en.svg");
  assert.equal(flashcards.topicDecks[0]?.key, "travel");
  assert.equal(topicStats.weak, 1);
  assert.equal(learnerState.due, true);
  assert.deepEqual(topicDetailsItems, []);
  assert.deepEqual(CEFR_LEVELS, ["A1", "A2", "B1", "B2"]);
  assert.deepEqual(LESSON_CHALLENGE_TYPES, ["SELECT", "ASSIST"]);
  assert.deepEqual(TARGET_LANGUAGE_IDS, ["en", "ja", "de", "zh", "ko"]);
  assert.deepEqual(ONBOARDING_GOAL_IDS, [
    "travel",
    "career",
    "exams",
    "culture",
    "study_abroad",
    "hobby",
  ]);
  assert.deepEqual(LEARNING_INTENSITY_IDS, [
    "relaxed",
    "standard",
    "accelerated",
    "intensive",
  ]);
  assert.equal(targetLanguage, "en");
  assert.equal(onboardingGoal, "travel");
  assert.equal(learningIntensity, "standard");
  assert.equal(MAX_HEARTS, 5);
});

test("Shared publishes the vocabulary learner progress contract", async () => {
  const declarations = await readFile(
    new URL("../dist/types/vocabulary.d.ts", import.meta.url),
    "utf8"
  );

  assert.match(declarations, /export type VocabularyLearnerState =/);
  assert.match(declarations, /export type VocabularyTopicProgressStats =/);
  assert.match(declarations, /learnerState: VocabularyLearnerState/);
  assert.match(declarations, /items: VocabularyTopicItem\[\]/);
});

test("Shared publishes Flashcard deck summary contracts", async () => {
  const declarations = await readFile(
    new URL("../dist/types/flashcard.d.ts", import.meta.url),
    "utf8"
  );

  assert.match(declarations, /export type FlashcardDeckSource =/);
  assert.match(declarations, /export type FlashcardDeckSummary =/);
  assert.match(declarations, /overview:/);
  assert.match(declarations, /topicDecks: FlashcardDeckSummary\[\]/);
});
