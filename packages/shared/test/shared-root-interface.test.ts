import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CEFR_LEVELS,
  LESSON_CHALLENGE_TYPES,
  MAX_HEARTS,
  type Course,
  type CreateCoursePayload,
  type FlashcardSummary,
  type PaginatedCoursesResponse,
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
  const flashcards: FlashcardSummary = {
    due: 0,
    saved: 0,
    weak: 0,
    levels: { A1: 0, A2: 0, B1: 0, B2: 0 },
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

  assert.equal(course.title, payload.title);
  assert.equal(course.code, payload.code);
  assert.equal(page.data[0]?.imageSrc, "/en.svg");
  assert.equal(flashcards.levels.A1, 0);
  assert.equal(topicStats.weak, 1);
  assert.equal(learnerState.due, true);
  assert.deepEqual(topicDetailsItems, []);
  assert.deepEqual(CEFR_LEVELS, ["A1", "A2", "B1", "B2"]);
  assert.deepEqual(LESSON_CHALLENGE_TYPES, ["SELECT", "ASSIST"]);
  assert.equal(MAX_HEARTS, 5);
});

test("Shared publishes the vocabulary learner progress contract", async () => {
  const declarations = await readFile(
    new URL("../dist/types/vocabulary.d.ts", import.meta.url),
    "utf8",
  );

  assert.match(declarations, /export type VocabularyLearnerState =/);
  assert.match(declarations, /export type VocabularyTopicProgressStats =/);
  assert.match(declarations, /learnerState: VocabularyLearnerState/);
  assert.match(declarations, /items: VocabularyTopicItem\[\]/);
});
