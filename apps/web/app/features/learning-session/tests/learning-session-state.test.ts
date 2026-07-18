import assert from "node:assert/strict";
import test from "node:test";

import {
  createLearningSessionCompletionGate,
  createLearningSessionState,
  learningSessionReducer,
} from "../learning-session-state";

type ReviewedItem = { id: number; correct: boolean };

test("learning session records feedback counts and reviewed items in order", () => {
  const initial = createLearningSessionState<ReviewedItem>();
  const afterWrong = learningSessionReducer(initial, {
    type: "record-answer",
    correct: false,
    item: { id: 1, correct: false },
  });
  const afterCorrect = learningSessionReducer(afterWrong, {
    type: "record-answer",
    correct: true,
    item: { id: 1, correct: true },
  });

  assert.deepEqual(afterCorrect, {
    status: "correct",
    correctCount: 1,
    wrongCount: 1,
    reviewedItems: [
      { id: 1, correct: false },
      { id: 1, correct: true },
    ],
  });
});

test("learning session clears feedback without losing accumulated results", () => {
  const answered = learningSessionReducer(createLearningSessionState<ReviewedItem>(), {
    type: "record-answer",
    correct: true,
    item: { id: 1, correct: true },
  });

  const cleared = learningSessionReducer(answered, { type: "clear-feedback" });

  assert.equal(cleared.status, "none");
  assert.equal(cleared.correctCount, 1);
  assert.deepEqual(cleared.reviewedItems, [{ id: 1, correct: true }]);
});

test("learning session counts feedback without requiring a reviewed item", () => {
  const answered = learningSessionReducer(createLearningSessionState<ReviewedItem>(), {
    type: "record-answer",
    correct: true,
  });

  assert.equal(answered.status, "correct");
  assert.equal(answered.correctCount, 1);
  assert.deepEqual(answered.reviewedItems, []);
});

test("learning session reset removes all accumulated results", () => {
  const answered = learningSessionReducer(createLearningSessionState<ReviewedItem>(), {
    type: "record-answer",
    correct: false,
    item: { id: 1, correct: false },
  });

  assert.deepEqual(
    learningSessionReducer(answered, { type: "reset" }),
    createLearningSessionState<ReviewedItem>(),
  );
});

test("learning session completion gate records once until reset", () => {
  const gate = createLearningSessionCompletionGate<ReviewedItem>();
  const recorded: ReviewedItem[][] = [];
  const items = [{ id: 1, correct: true }];

  gate.record(items, (value) => {
    recorded.push(value);
  });
  gate.record(items, (value) => {
    recorded.push(value);
  });
  assert.deepEqual(recorded, [items]);

  gate.reset();
  gate.record(items, (value) => {
    recorded.push(value);
  });
  assert.deepEqual(recorded, [items, items]);
});
