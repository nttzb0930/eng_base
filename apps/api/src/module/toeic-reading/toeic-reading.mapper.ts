import type {
  ToeicReadingAttemptResult,
  ToeicReadingAttemptSummary,
  ToeicReadingPart,
  ToeicReadingPartSummary,
} from "@repo/shared";

export const TOEIC_READING_PARTS = [5, 6, 7] as const;

export function summarizeToeicReadingParts(
  questions: Array<{ part: number }>
): ToeicReadingPartSummary[] {
  return TOEIC_READING_PARTS.map((part) => ({
    part,
    questionCount: questions.filter((question) => question.part === part)
      .length,
  }));
}

export function mapToeicReadingAttemptSummary(attempt: {
  id: number;
  test_id: number;
  test_title_snapshot: string;
  practice_part: number | null;
  correct_count: number;
  total_count: number;
  accuracy: number;
  submitted_at: Date;
}): ToeicReadingAttemptSummary {
  return {
    id: attempt.id,
    testId: attempt.test_id,
    testTitle: attempt.test_title_snapshot,
    practicePart:
      attempt.practice_part === null
        ? null
        : asToeicReadingPart(attempt.practice_part),
    correctCount: attempt.correct_count,
    totalCount: attempt.total_count,
    accuracy: attempt.accuracy,
    submittedAt: attempt.submitted_at.toISOString(),
  };
}

export function asToeicReadingPart(part: number): ToeicReadingPart {
  if (part === 5 || part === 6 || part === 7) return part;
  throw new Error(`Unsupported TOEIC Reading Part: ${part}`);
}

export function mapToeicReadingAttemptResult(attempt: {
  id: number;
  test_id: number;
  source_version_snapshot: string;
  test_title_snapshot: string;
  practice_part: number | null;
  correct_count: number;
  total_count: number;
  accuracy: number;
  submitted_at: Date;
  toeic_reading_attempt_answers: Array<{
    question_id_snapshot: number;
    question_number_snapshot: number;
    part_snapshot: number;
    question_prompt_snapshot: string;
    selected_option_label_snapshot: string;
    selected_option_text_snapshot: string;
    correct_option_label_snapshot: string;
    correct_option_text_snapshot: string;
    explanation_snapshot: string | null;
    correct: boolean;
  }>;
}): ToeicReadingAttemptResult {
  const answers = attempt.toeic_reading_attempt_answers.map((answer) => ({
    questionId: answer.question_id_snapshot,
    questionNumber: answer.question_number_snapshot,
    part: asToeicReadingPart(answer.part_snapshot),
    question: answer.question_prompt_snapshot,
    selectedOptionLabel: answer.selected_option_label_snapshot,
    selectedOption: answer.selected_option_text_snapshot,
    correctOptionLabel: answer.correct_option_label_snapshot,
    correctOption: answer.correct_option_text_snapshot,
    explanation: answer.explanation_snapshot,
    correct: answer.correct,
  }));
  const resultParts =
    attempt.practice_part === null
      ? TOEIC_READING_PARTS
      : [asToeicReadingPart(attempt.practice_part)];
  return {
    ...mapToeicReadingAttemptSummary(attempt),
    sourceVersion: attempt.source_version_snapshot,
    parts: resultParts.map((part) => {
      const partAnswers = answers.filter((answer) => answer.part === part);
      const correctCount = partAnswers.filter(
        (answer) => answer.correct
      ).length;
      return {
        part,
        correctCount,
        totalCount: partAnswers.length,
        accuracy:
          partAnswers.length === 0
            ? 0
            : Math.round((correctCount / partAnswers.length) * 100),
      };
    }),
    answers,
  };
}
