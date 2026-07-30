import { createHash } from "node:crypto";
import type { ReadingSubmissionPayload } from "@repo/shared";

export type ReadingQuestionForGrading = {
  id: number;
  prompt: string;
  order: number;
  options: Array<{
    id: number;
    text: string;
    order: number;
    correct: boolean;
  }>;
};

export type ReadingPassageForGrading = {
  id: number;
  questions: ReadingQuestionForGrading[];
};

export type GradedReadingAnswer = {
  questionId: number;
  question: string;
  selectedOptionId: number;
  selectedOption: string;
  correctOption: string;
  correct: boolean;
};

export type GradedReadingSubmission = {
  correctCount: number;
  totalCount: number;
  accuracy: number;
  answers: GradedReadingAnswer[];
};

export class ReadingSubmissionError extends Error {}

export function createReadingSubmissionFingerprint(
  passageId: number,
  answers: ReadingSubmissionPayload["answers"],
) {
  const normalizedAnswers = [...answers].sort(
    (left, right) =>
      left.questionId - right.questionId || left.optionId - right.optionId,
  );

  return createHash("sha256")
    .update(JSON.stringify({ passageId, answers: normalizedAnswers }))
    .digest("hex");
}

export function gradeReadingSubmission(
  passage: ReadingPassageForGrading,
  submission: ReadingSubmissionPayload,
): GradedReadingSubmission {
  const answerByQuestion = new Map<number, number>();

  for (const answer of submission.answers) {
    if (answerByQuestion.has(answer.questionId)) {
      throw new ReadingSubmissionError("Duplicate question answer");
    }
    answerByQuestion.set(answer.questionId, answer.optionId);
  }

  if (
    submission.answers.length !== passage.questions.length ||
    passage.questions.some(
      (question) => !answerByQuestion.has(question.id),
    )
  ) {
    throw new ReadingSubmissionError("Answer every question");
  }

  const questionsById = new Map(
    passage.questions.map((question) => [question.id, question]),
  );
  for (const answer of submission.answers) {
    if (!questionsById.has(answer.questionId)) {
      throw new ReadingSubmissionError("Unknown question");
    }
  }

  const answers = [...passage.questions]
    .sort((left, right) => left.order - right.order || left.id - right.id)
    .map((question): GradedReadingAnswer => {
      const selectedOptionId = answerByQuestion.get(question.id);
      const selectedOption = question.options.find(
        (option) => option.id === selectedOptionId,
      );
      if (!selectedOption) {
        throw new ReadingSubmissionError(
          "Option does not belong to question",
        );
      }
      const correctOption = question.options.find((option) => option.correct);
      if (!correctOption) {
        throw new ReadingSubmissionError(
          "Question has no correct option",
        );
      }

      return {
        questionId: question.id,
        question: question.prompt,
        selectedOptionId: selectedOption.id,
        selectedOption: selectedOption.text,
        correctOption: correctOption.text,
        correct: selectedOption.id === correctOption.id,
      };
    });

  const correctCount = answers.filter((answer) => answer.correct).length;
  const totalCount = answers.length;

  return {
    correctCount,
    totalCount,
    accuracy: Math.round((correctCount / totalCount) * 100),
    answers,
  };
}
