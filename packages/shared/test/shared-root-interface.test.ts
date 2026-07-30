import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CEFR_LEVELS,
  LEARNING_INTENSITY_IDS,
  LESSON_CHALLENGE_TYPES,
  MAX_HEARTS,
  ONBOARDING_GOAL_IDS,
  READING_CEFR_LEVELS,
  READING_PUBLICATION_STATUSES,
  TARGET_LANGUAGE_IDS,
  type AdminReadingPassage,
  type Course,
  type CreateCoursePayload,
  type DashboardStreak,
  type FlashcardDeckSummary,
  type FlashcardSummary,
  type LearningIntensityId,
  type OnboardingGoalId,
  type PaginatedCoursesResponse,
  type ReadingAttemptResult,
  type ReadingPassageSummary,
  type ReadingSubmissionPayload,
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
  const streak: DashboardStreak = {
    currentStreak: 3,
    longestStreak: 5,
    lastLearningAt: new Date("2026-07-24T10:00:00.000Z"),
    timeZone: "UTC",
  };

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
  assert.equal(streak.currentStreak, 3);
  assert.equal(MAX_HEARTS, 5);
});

test("Shared publishes the Reading A1 root Interface", async () => {
  const passage: AdminReadingPassage = {
    id: 1,
    slug: "a-day-in-hanoi",
    title: "A Day in Hanoi",
    body: "Mia lives in Hanoi.",
    cefrLevel: "A1",
    topicId: null,
    topicTitle: null,
    estimatedMinutes: 3,
    status: "DRAFT",
    publishedAt: null,
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    questions: [],
  };
  const summary: ReadingPassageSummary = {
    id: passage.id,
    slug: passage.slug,
    title: passage.title,
    cefrLevel: passage.cefrLevel,
    topicTitle: null,
    estimatedMinutes: passage.estimatedMinutes,
    questionCount: 1,
    latestAttempt: null,
  };
  const submission: ReadingSubmissionPayload = {
    submissionKey: "00000000-0000-4000-8000-000000000001",
    answers: [{ questionId: 1, optionId: 2 }],
  };
  const result: ReadingAttemptResult = {
    id: 10,
    passageId: passage.id,
    passageTitle: passage.title,
    correctCount: 1,
    totalCount: 1,
    accuracy: 100,
    submittedAt: "2026-07-30T00:05:00.000Z",
    answers: [
      {
        questionId: 1,
        question: "Where does Mia live?",
        selectedOption: "In Hanoi",
        correctOption: "In Hanoi",
        correct: true,
      },
    ],
  };

  assert.deepEqual(READING_CEFR_LEVELS, ["A1"]);
  assert.deepEqual(READING_PUBLICATION_STATUSES, ["DRAFT", "PUBLISHED"]);
  assert.equal(summary.slug, passage.slug);
  assert.equal(submission.answers.length, result.answers.length);

  const declarations = await readFile(
    new URL("../dist/types/reading.d.ts", import.meta.url),
    "utf8"
  );
  assert.match(declarations, /export type AdminReadingPassage =/);
  assert.match(declarations, /export type ReadingAttemptResult =/);
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

test("Shared publishes the Dashboard streak contract", async () => {
  const declarations = await readFile(
    new URL("../dist/types/dashboard.d.ts", import.meta.url),
    "utf8"
  );

  assert.match(declarations, /export type DashboardStreak =/);
  assert.match(declarations, /streak: DashboardStreak/);
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
