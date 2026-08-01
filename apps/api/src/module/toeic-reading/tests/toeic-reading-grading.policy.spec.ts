import assert from "node:assert/strict";
import test from "node:test";

import {
  createToeicReadingSubmissionFingerprint,
  gradeToeicReadingSubmission,
  ToeicReadingSubmissionError,
} from "../use-cases/toeic-reading-grading.policy";

const testContent = {
  id: 11,
  sourceVersion: "a".repeat(64),
  questions: [
    {
      id: 101,
      number: 101,
      part: 5,
      prompt: "The device works ___ ten and thirty degrees.",
      explanation: "Use between with two endpoints.",
      options: [
        { id: 1001, label: "A", text: "between", correct: true },
        { id: 1002, label: "B", text: "inside", correct: false },
      ],
    },
    {
      id: 102,
      number: 131,
      part: 6,
      prompt: "Choose the best word.",
      explanation: null,
      options: [
        { id: 1003, label: "A", text: "send", correct: false },
        { id: 1004, label: "B", text: "sent", correct: true },
      ],
    },
    {
      id: 103,
      number: 181,
      part: 7,
      prompt: "What is the notice about?",
      explanation: "The first line names the meeting.",
      options: [
        { id: 1005, label: "A", text: "A meeting", correct: true },
        { id: 1006, label: "B", text: "A delivery", correct: false },
      ],
    },
  ],
};

const submission = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  testId: 11,
  sourceVersion: "a".repeat(64),
  answers: [
    { questionId: 101, optionId: 1001 },
    { questionId: 102, optionId: 1003 },
    { questionId: 103, optionId: 1005 },
  ],
};

test("grades totals, Parts, and immutable answer snapshots", () => {
  const result = gradeToeicReadingSubmission(testContent, submission);

  assert.equal(result.correctCount, 2);
  assert.equal(result.totalCount, 3);
  assert.equal(result.accuracy, 67);
  assert.deepEqual(result.parts, [
    { part: 5, correctCount: 1, totalCount: 1, accuracy: 100 },
    { part: 6, correctCount: 0, totalCount: 1, accuracy: 0 },
    { part: 7, correctCount: 1, totalCount: 1, accuracy: 100 },
  ]);
  assert.deepEqual(result.answers[0], {
    questionId: 101,
    questionNumber: 101,
    part: 5,
    question: "The device works ___ ten and thirty degrees.",
    selectedOptionId: 1001,
    selectedOptionLabel: "A",
    selectedOption: "between",
    correctOptionLabel: "A",
    correctOption: "between",
    explanation: "Use between with two endpoints.",
    correct: true,
  });
});

test("fingerprint is stable when answer order changes", () => {
  const original = createToeicReadingSubmissionFingerprint(
    submission.testId,
    submission.sourceVersion,
    submission.answers
  );
  const reversed = createToeicReadingSubmissionFingerprint(
    submission.testId,
    submission.sourceVersion,
    [...submission.answers].reverse()
  );
  assert.equal(original, reversed);
});

test("grades exactly one selected Part and separates its fingerprint", () => {
  const partSubmission = {
    ...submission,
    practicePart: 5 as const,
    answers: [submission.answers[0]!],
  };
  const result = gradeToeicReadingSubmission(testContent, partSubmission);

  assert.equal(result.totalCount, 1);
  assert.deepEqual(result.parts, [
    { part: 5, correctCount: 1, totalCount: 1, accuracy: 100 },
  ]);
  assert.notEqual(
    createToeicReadingSubmissionFingerprint(
      submission.testId,
      submission.sourceVersion,
      partSubmission.answers,
      partSubmission.practicePart
    ),
    createToeicReadingSubmissionFingerprint(
      submission.testId,
      submission.sourceVersion,
      partSubmission.answers
    )
  );
});

test("rejects answers from outside the selected Part", () => {
  assert.throws(
    () =>
      gradeToeicReadingSubmission(testContent, {
        ...submission,
        practicePart: 5,
        answers: [submission.answers[0]!, submission.answers[1]!],
      }),
    ToeicReadingSubmissionError
  );
});

test("rejects missing and duplicate question answers", () => {
  assert.throws(
    () =>
      gradeToeicReadingSubmission(testContent, {
        ...submission,
        answers: submission.answers.slice(0, 2),
      }),
    ToeicReadingSubmissionError
  );
  assert.throws(
    () =>
      gradeToeicReadingSubmission(testContent, {
        ...submission,
        answers: [
          submission.answers[0]!,
          submission.answers[0]!,
          submission.answers[2]!,
        ],
      }),
    ToeicReadingSubmissionError
  );
});

test("rejects an option that does not belong to its question", () => {
  assert.throws(
    () =>
      gradeToeicReadingSubmission(testContent, {
        ...submission,
        answers: [
          { questionId: 101, optionId: 1004 },
          ...submission.answers.slice(1),
        ],
      }),
    /does not belong/
  );
});
