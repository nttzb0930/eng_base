import assert from "node:assert/strict";
import test from "node:test";

import {
  buildToeicSubmissionAnswers,
  createToeicReadingSessionState,
  getToeicActiveQuestionId,
  getToeicAnsweredCount,
  moveToeicQuestion,
  restoreToeicReadingSessionState,
  selectToeicAnswer,
  selectToeicQuestion,
  toggleToeicReview,
} from "../toeic-reading-session-state";

const questionIds = [101, 131, 181];

test("selecting an answer replaces only that question's previous option", () => {
  const initial = createToeicReadingSessionState();
  const first = selectToeicAnswer(initial, 101, 1001);
  const replaced = selectToeicAnswer(first, 101, 1002);
  const secondQuestion = selectToeicAnswer(replaced, 131, 1301);

  assert.deepEqual(secondQuestion.answers, { 101: 1002, 131: 1301 });
  assert.equal(getToeicAnsweredCount(secondQuestion), 2);
});

test("review markers toggle without changing selected answers", () => {
  const answered = selectToeicAnswer(
    createToeicReadingSessionState(),
    101,
    1001
  );
  const marked = toggleToeicReview(answered, 101);
  const cleared = toggleToeicReview(marked, 101);

  assert.deepEqual(marked.reviewQuestionIds, [101]);
  assert.deepEqual(cleared.reviewQuestionIds, []);
  assert.deepEqual(cleared.answers, answered.answers);
});

test("submission stays unavailable until every question is answered", () => {
  let state = createToeicReadingSessionState();
  state = selectToeicAnswer(state, 181, 1801);
  state = selectToeicAnswer(state, 101, 1001);
  assert.equal(buildToeicSubmissionAnswers(state, questionIds), null);

  state = selectToeicAnswer(state, 131, 1301);
  assert.deepEqual(buildToeicSubmissionAnswers(state, questionIds), [
    { questionId: 101, optionId: 1001 },
    { questionId: 131, optionId: 1301 },
    { questionId: 181, optionId: 1801 },
  ]);
});

test("the first available question is active by default", () => {
  const state = createToeicReadingSessionState();

  assert.equal(getToeicActiveQuestionId(state, questionIds), 101);
  assert.equal(getToeicActiveQuestionId(state, []), null);
});

test("direct question selection accepts only IDs in the current test", () => {
  const initial = createToeicReadingSessionState();
  const selected = selectToeicQuestion(initial, questionIds, 131);
  const unknown = selectToeicQuestion(selected, questionIds, 999);

  assert.equal(getToeicActiveQuestionId(selected, questionIds), 131);
  assert.equal(getToeicActiveQuestionId(unknown, questionIds), 131);
});

test("previous and next question movement stays inside list bounds", () => {
  const initial = createToeicReadingSessionState();
  const beforeFirst = moveToeicQuestion(initial, questionIds, -1);
  const second = moveToeicQuestion(initial, questionIds, 1);
  const last = selectToeicQuestion(second, questionIds, 181);
  const afterLast = moveToeicQuestion(last, questionIds, 1);

  assert.equal(getToeicActiveQuestionId(beforeFirst, questionIds), 101);
  assert.equal(getToeicActiveQuestionId(second, questionIds), 131);
  assert.equal(getToeicActiveQuestionId(afterLast, questionIds), 181);
});

test("draft restore keeps only questions in the current scope", () => {
  const restored = restoreToeicReadingSessionState(
    {
      testId: 11,
      sourceVersion: "a".repeat(64),
      activeQuestionId: 999,
      answers: [
        { questionId: 101, optionId: 1001 },
        { questionId: 999, optionId: 9991 },
      ],
      reviewQuestionIds: [131, 999],
      updatedAt: "2026-07-31T00:00:00.000Z",
      expiresAt: "2026-08-30T00:00:00.000Z",
    },
    questionIds
  );

  assert.deepEqual(restored, {
    activeQuestionId: 101,
    answers: { 101: 1001 },
    reviewQuestionIds: [131],
  });
});
