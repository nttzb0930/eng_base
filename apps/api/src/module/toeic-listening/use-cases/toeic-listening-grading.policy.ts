import { createHash } from "node:crypto";
import type {
  ToeicListeningPart,
  ToeicListeningPartResult,
  ToeicListeningSubmissionPayload,
} from "@repo/shared";
import {
  asToeicListeningPart,
  TOEIC_LISTENING_PARTS,
} from "../toeic-listening.mapper";

type StimulusReview = {
  id: number;
  transcript: string | null;
  transcriptTranslation: string | null;
  audioMediaId: number | null;
  imageMediaIds: number[];
};
type GradingTest = {
  id: number;
  listeningSourceVersion: string;
  questions: Array<{
    id: number;
    number: number;
    part: number;
    prompt: string;
    transcript: string | null;
    transcriptTranslation: string | null;
    explanation: string | null;
    audioMediaId?: number | null;
    imageMediaIds?: number[];
    stimulus: StimulusReview | null;
    options: Array<{
      id: number;
      label: string;
      text: string;
      correct: boolean;
    }>;
  }>;
};

export class ToeicListeningSubmissionError extends Error {}

export function createToeicListeningSubmissionFingerprint(
  testId: number,
  listeningSourceVersion: string,
  answers: ToeicListeningSubmissionPayload["answers"],
  practicePart?: ToeicListeningPart
) {
  const normalized = [...answers].sort(
    (a, b) => a.questionId - b.questionId || a.optionId - b.optionId
  );
  return createHash("sha256")
    .update(
      JSON.stringify({
        testId,
        listeningSourceVersion,
        ...(practicePart === undefined ? {} : { practicePart }),
        answers: normalized,
      })
    )
    .digest("hex");
}

export function gradeToeicListeningSubmission(
  test: GradingTest,
  submission: ToeicListeningSubmissionPayload
) {
  if (test.id !== submission.testId)
    throw new ToeicListeningSubmissionError("Submission test does not match");
  const eligible =
    submission.practicePart === undefined
      ? test.questions
      : test.questions.filter((q) => q.part === submission.practicePart);
  if (eligible.length !== submission.answers.length)
    throw new ToeicListeningSubmissionError(
      "Every TOEIC Listening question must be answered exactly once"
    );
  const selected = new Map<number, number>();
  for (const answer of submission.answers) {
    if (selected.has(answer.questionId))
      throw new ToeicListeningSubmissionError(
        "Every TOEIC Listening question must be answered exactly once"
      );
    selected.set(answer.questionId, answer.optionId);
  }
  const answers = eligible
    .map((question) => {
      const optionId = selected.get(question.id);
      if (optionId === undefined)
        throw new ToeicListeningSubmissionError(
          `Question ${question.id} is missing an answer`
        );
      const selectedOption = question.options.find(
        (option) => option.id === optionId
      );
      if (!selectedOption)
        throw new ToeicListeningSubmissionError(
          `Option ${optionId} does not belong to question ${question.id}`
        );
      const correctOptions = question.options.filter(
        (option) => option.correct
      );
      if (correctOptions.length !== 1)
        throw new ToeicListeningSubmissionError(
          `Question ${question.id} does not have exactly one correct option`
        );
      const correctOption = correctOptions[0]!;
      return {
        questionId: question.id,
        questionNumber: question.number,
        part: asToeicListeningPart(question.part),
        question: question.prompt,
        transcript: question.transcript,
        transcriptTranslation: question.transcriptTranslation,
        audioMediaId: question.audioMediaId ?? null,
        imageMediaIds: question.imageMediaIds ?? [],
        stimulus: question.stimulus,
        selectedOptionId: selectedOption.id,
        selectedOptionLabel: selectedOption.label,
        selectedOption: selectedOption.text,
        correctOptionLabel: correctOption.label,
        correctOption: correctOption.text,
        explanation: question.explanation,
        correct: selectedOption.id === correctOption.id,
      };
    })
    .sort((a, b) => a.questionNumber - b.questionNumber);
  const unknown = submission.answers.find(
    (answer) => !eligible.some((question) => question.id === answer.questionId)
  );
  if (unknown)
    throw new ToeicListeningSubmissionError(
      `Question ${unknown.questionId} does not belong to this test`
    );
  const correctCount = answers.filter((answer) => answer.correct).length;
  const parts = (
    submission.practicePart === undefined
      ? TOEIC_LISTENING_PARTS
      : [submission.practicePart]
  ).map((part): ToeicListeningPartResult => {
    const scoped = answers.filter((answer) => answer.part === part);
    const correct = scoped.filter((answer) => answer.correct).length;
    return {
      part,
      correctCount: correct,
      totalCount: scoped.length,
      accuracy: percentage(correct, scoped.length),
    };
  });
  return {
    correctCount,
    totalCount: answers.length,
    accuracy: percentage(correctCount, answers.length),
    parts,
    answers,
  };
}

function percentage(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}
