import assert from "node:assert/strict";
import test from "node:test";

import {
  createToeicListeningSubmissionFingerprint,
  gradeToeicListeningSubmission,
  ToeicListeningSubmissionError,
} from "../use-cases/toeic-listening-grading.policy";

const questions = [
  {
    id: 11,
    number: 1,
    part: 1,
    prompt: "",
    transcript: "A person is walking.",
    transcriptTranslation: "Một người đang đi bộ.",
    explanation: "Photo clue",
    audioMediaId: 801,
    imageMediaIds: [802],
    stimulus: null,
    options: [
      { id: 111, label: "A", text: "", correct: true },
      { id: 112, label: "B", text: "", correct: false },
    ],
  },
  {
    id: 21,
    number: 7,
    part: 2,
    prompt: "",
    transcript: "Where is the office?",
    transcriptTranslation: null,
    explanation: null,
    stimulus: null,
    options: [
      { id: 211, label: "A", text: "Near the station.", correct: false },
      { id: 212, label: "B", text: "On Monday.", correct: true },
    ],
  },
  {
    id: 31,
    number: 32,
    part: 3,
    prompt: "What will happen?",
    transcript: null,
    transcriptTranslation: null,
    explanation: "Listen for intent",
    stimulus: {
      id: 301,
      transcript: "Conversation",
      transcriptTranslation: "Hội thoại",
      audioMediaId: 901,
      imageMediaIds: [],
    },
    options: [
      { id: 311, label: "A", text: "A meeting", correct: true },
      { id: 312, label: "B", text: "Lunch", correct: false },
    ],
  },
  {
    id: 41,
    number: 71,
    part: 4,
    prompt: "Who is speaking?",
    transcript: null,
    transcriptTranslation: null,
    explanation: null,
    stimulus: {
      id: 401,
      transcript: "A short talk",
      transcriptTranslation: null,
      audioMediaId: 902,
      imageMediaIds: [903],
    },
    options: [
      { id: 411, label: "A", text: "A manager", correct: false },
      { id: 412, label: "B", text: "A guide", correct: true },
    ],
  },
];

const submission = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  testId: 9,
  listeningSourceVersion: "a".repeat(64),
  answers: questions.map((question) => ({
    questionId: question.id,
    optionId: question.options[0]!.id,
  })),
};

test("grades full Listening scope and snapshots private review content", () => {
  const result = gradeToeicListeningSubmission(
    { id: 9, listeningSourceVersion: "a".repeat(64), questions },
    submission
  );
  assert.equal(result.totalCount, 4);
  assert.equal(result.correctCount, 2);
  assert.deepEqual(
    result.parts.map((part) => part.totalCount),
    [1, 1, 1, 1]
  );
  assert.equal(result.answers[0]!.transcript, "A person is walking.");
  assert.deepEqual(result.answers[0]!.imageMediaIds, [802]);
  assert.equal(result.answers[2]!.stimulus?.audioMediaId, 901);
});

test("fingerprint is independent of answer order and separates Part scope", () => {
  const first = createToeicListeningSubmissionFingerprint(
    9,
    "a".repeat(64),
    submission.answers
  );
  const second = createToeicListeningSubmissionFingerprint(
    9,
    "a".repeat(64),
    [...submission.answers].reverse()
  );
  const scoped = createToeicListeningSubmissionFingerprint(
    9,
    "a".repeat(64),
    [submission.answers[0]!],
    1
  );
  assert.equal(first, second);
  assert.notEqual(first, scoped);
});

test("rejects incomplete scope and an option belonging to another question", () => {
  assert.throws(
    () =>
      gradeToeicListeningSubmission(
        { id: 9, listeningSourceVersion: "a".repeat(64), questions },
        { ...submission, practicePart: 1, answers: [] }
      ),
    ToeicListeningSubmissionError
  );
  assert.throws(
    () =>
      gradeToeicListeningSubmission(
        { id: 9, listeningSourceVersion: "a".repeat(64), questions },
        {
          ...submission,
          practicePart: 1,
          answers: [{ questionId: 11, optionId: 212 }],
        }
      ),
    /does not belong/
  );
});
