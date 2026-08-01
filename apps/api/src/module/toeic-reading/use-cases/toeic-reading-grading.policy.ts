import { createHash } from "node:crypto";
import type {
  ToeicReadingPart,
  ToeicReadingPartResult,
  ToeicReadingSubmissionPayload,
} from "@repo/shared";

import {
  asToeicReadingPart,
  TOEIC_READING_PARTS,
} from "../toeic-reading.mapper";

type GradingTest = {
  id: number;
  sourceVersion: string;
  questions: Array<{
    id: number;
    number: number;
    part: number;
    prompt: string;
    explanation: string | null;
    options: Array<{
      id: number;
      label: string;
      text: string;
      correct: boolean;
    }>;
  }>;
};

export class ToeicReadingSubmissionError extends Error {}

export function createToeicReadingSubmissionFingerprint(
  testId: number,
  sourceVersion: string,
  answers: ToeicReadingSubmissionPayload["answers"],
  practicePart?: ToeicReadingPart
) {
  const normalized = [...answers].sort(
    (left, right) =>
      left.questionId - right.questionId || left.optionId - right.optionId
  );
  const scope = practicePart === undefined ? {} : { practicePart };
  return createHash("sha256")
    .update(
      JSON.stringify({ testId, sourceVersion, ...scope, answers: normalized })
    )
    .digest("hex");
}

export function gradeToeicReadingSubmission(
  test: GradingTest,
  submission: ToeicReadingSubmissionPayload
) {
  if (submission.testId !== test.id) {
    throw new ToeicReadingSubmissionError("Submission test does not match");
  }
  const eligibleQuestions =
    submission.practicePart === undefined
      ? test.questions
      : test.questions.filter(
          (question) => question.part === submission.practicePart
        );
  if (submission.answers.length !== eligibleQuestions.length) {
    throw new ToeicReadingSubmissionError(
      "Every TOEIC Reading question must be answered exactly once"
    );
  }

  const answerByQuestion = new Map<number, number>();
  for (const answer of submission.answers) {
    if (answerByQuestion.has(answer.questionId)) {
      throw new ToeicReadingSubmissionError(
        "Every TOEIC Reading question must be answered exactly once"
      );
    }
    answerByQuestion.set(answer.questionId, answer.optionId);
  }

  const answers = eligibleQuestions
    .map((question) => {
      const selectedOptionId = answerByQuestion.get(question.id);
      if (selectedOptionId === undefined) {
        throw new ToeicReadingSubmissionError(
          `Question ${question.id} is missing an answer`
        );
      }
      const selectedOption = question.options.find(
        (option) => option.id === selectedOptionId
      );
      if (!selectedOption) {
        throw new ToeicReadingSubmissionError(
          `Option ${selectedOptionId} does not belong to question ${question.id}`
        );
      }
      const correctOptions = question.options.filter(
        (option) => option.correct
      );
      if (correctOptions.length !== 1) {
        throw new ToeicReadingSubmissionError(
          `Question ${question.id} does not have exactly one correct option`
        );
      }
      const correctOption = correctOptions[0]!;
      return {
        questionId: question.id,
        questionNumber: question.number,
        part: asToeicReadingPart(question.part),
        question: question.prompt,
        selectedOptionId: selectedOption.id,
        selectedOptionLabel: selectedOption.label,
        selectedOption: selectedOption.text,
        correctOptionLabel: correctOption.label,
        correctOption: correctOption.text,
        explanation: question.explanation,
        correct: selectedOption.id === correctOption.id,
      };
    })
    .sort((left, right) => left.questionNumber - right.questionNumber);

  const unknownQuestion = submission.answers.find(
    (answer) =>
      !eligibleQuestions.some((question) => question.id === answer.questionId)
  );
  if (unknownQuestion) {
    throw new ToeicReadingSubmissionError(
      `Question ${unknownQuestion.questionId} does not belong to this test`
    );
  }

  const correctCount = answers.filter((answer) => answer.correct).length;
  return {
    correctCount,
    totalCount: answers.length,
    accuracy: percentage(correctCount, answers.length),
    parts: (submission.practicePart === undefined
      ? TOEIC_READING_PARTS
      : [submission.practicePart]
    ).map((part) => summarizePart(part, answers)),
    answers,
  };
}

function summarizePart(
  part: ToeicReadingPart,
  answers: Array<{ part: ToeicReadingPart; correct: boolean }>
): ToeicReadingPartResult {
  const partAnswers = answers.filter((answer) => answer.part === part);
  const correctCount = partAnswers.filter((answer) => answer.correct).length;
  return {
    part,
    correctCount,
    totalCount: partAnswers.length,
    accuracy: percentage(correctCount, partAnswers.length),
  };
}

function percentage(correctCount: number, totalCount: number) {
  return totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
}
