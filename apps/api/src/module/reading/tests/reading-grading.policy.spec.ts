import assert from "node:assert/strict";
import test from "node:test";
import type { ReadingSubmissionPayload } from "@repo/shared";

import {
  createReadingSubmissionFingerprint,
  gradeReadingSubmission,
} from "../use-cases/reading-grading.policy";

const passage = {
  id: 7,
  questions: [
    {
      id: 10,
      prompt: "Where does Mia live?",
      order: 1,
      options: [
        { id: 101, text: "In Hanoi", order: 1, correct: true },
        { id: 102, text: "In London", order: 2, correct: false },
      ],
    },
    {
      id: 20,
      prompt: "What does Mia drink?",
      order: 2,
      options: [
        { id: 201, text: "Tea", order: 1, correct: false },
        { id: 202, text: "Water", order: 2, correct: true },
      ],
    },
  ],
};

const correctSubmission: ReadingSubmissionPayload = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  answers: [
    { questionId: 10, optionId: 101 },
    { questionId: 20, optionId: 202 },
  ],
};

test("grades every answer from server-owned correctness in question order", () => {
  assert.deepEqual(gradeReadingSubmission(passage, correctSubmission), {
    correctCount: 2,
    totalCount: 2,
    accuracy: 100,
    answers: [
      {
        questionId: 10,
        question: "Where does Mia live?",
        selectedOptionId: 101,
        selectedOption: "In Hanoi",
        correctOption: "In Hanoi",
        correct: true,
      },
      {
        questionId: 20,
        question: "What does Mia drink?",
        selectedOptionId: 202,
        selectedOption: "Water",
        correctOption: "Water",
        correct: true,
      },
    ],
  });
});

test("rounds partial accuracy to an integer", () => {
  const result = gradeReadingSubmission(passage, {
    ...correctSubmission,
    answers: [
      { questionId: 10, optionId: 102 },
      { questionId: 20, optionId: 202 },
    ],
  });

  assert.equal(result.correctCount, 1);
  assert.equal(result.accuracy, 50);
});

test("rejects incomplete, duplicate, and foreign-option answers", () => {
  assert.throws(
    () =>
      gradeReadingSubmission(passage, {
        ...correctSubmission,
        answers: [{ questionId: 10, optionId: 101 }],
      }),
    /Answer every question/,
  );
  assert.throws(
    () =>
      gradeReadingSubmission(passage, {
        ...correctSubmission,
        answers: [
          { questionId: 10, optionId: 101 },
          { questionId: 10, optionId: 101 },
        ],
      }),
    /Duplicate question/,
  );
  assert.throws(
    () =>
      gradeReadingSubmission(passage, {
        ...correctSubmission,
        answers: [
          { questionId: 10, optionId: 202 },
          { questionId: 20, optionId: 202 },
        ],
      }),
    /Option does not belong/,
  );
});

test("fingerprints answer content independently of answer order", () => {
  assert.equal(
    createReadingSubmissionFingerprint(7, correctSubmission.answers),
    createReadingSubmissionFingerprint(7, [
      ...correctSubmission.answers,
    ].reverse()),
  );
  assert.notEqual(
    createReadingSubmissionFingerprint(7, correctSubmission.answers),
    createReadingSubmissionFingerprint(8, correctSubmission.answers),
  );
});
