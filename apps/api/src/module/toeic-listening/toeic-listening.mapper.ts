import type {
  ToeicListeningAttemptResult,
  ToeicListeningAttemptSummary,
  ToeicListeningPart,
  ToeicListeningPartSummary,
} from "@repo/shared";

export const TOEIC_LISTENING_PARTS = [1, 2, 3, 4] as const;

type ListeningAttemptSnapshot = Parameters<
  typeof mapToeicListeningAttemptSummary
>[0] & {
  listening_source_version_snapshot: string;
  toeic_listening_attempt_answers: Array<{
    question_id_snapshot: number;
    question_number_snapshot: number;
    part_snapshot: number;
    question_prompt_snapshot: string;
    transcript_snapshot: string | null;
    transcript_translation_snapshot: string | null;
    question_media_snapshot: unknown;
    stimulus_snapshot: unknown;
    selected_option_label_snapshot: string;
    selected_option_text_snapshot: string;
    correct_option_label_snapshot: string;
    correct_option_text_snapshot: string;
    explanation_snapshot: string | null;
    correct: boolean;
  }>;
};

export function asToeicListeningPart(part: number): ToeicListeningPart {
  if (part === 1 || part === 2 || part === 3 || part === 4) return part;
  throw new Error(`Unsupported TOEIC Listening Part: ${part}`);
}

export function summarizeToeicListeningParts(
  questions: Array<{ part: number }>
): ToeicListeningPartSummary[] {
  return TOEIC_LISTENING_PARTS.map((part) => ({
    part,
    questionCount: questions.filter((question) => question.part === part)
      .length,
  }));
}

export function mediaIdsByRole(
  bindings: Array<{ media_asset_id: number; role: string; order: number }>,
  role: "AUDIO" | "IMAGE"
) {
  return bindings
    .filter((binding) => binding.role === role)
    .sort((left, right) => left.order - right.order)
    .map((binding) => binding.media_asset_id);
}

export function mapToeicListeningAttemptSummary(attempt: {
  id: number;
  test_id: number;
  test_title_snapshot: string;
  practice_part: number | null;
  correct_count: number;
  total_count: number;
  accuracy: number;
  submitted_at: Date;
}): ToeicListeningAttemptSummary {
  return {
    id: attempt.id,
    testId: attempt.test_id,
    testTitle: attempt.test_title_snapshot,
    practicePart:
      attempt.practice_part === null
        ? null
        : asToeicListeningPart(attempt.practice_part),
    correctCount: attempt.correct_count,
    totalCount: attempt.total_count,
    accuracy: attempt.accuracy,
    submittedAt: attempt.submitted_at.toISOString(),
  };
}

export function mapToeicListeningAttemptResult(
  attempt: ListeningAttemptSnapshot
): ToeicListeningAttemptResult {
  const answers = attempt.toeic_listening_attempt_answers.map((answer) => {
    const media = answer.question_media_snapshot as {
      audioMediaId: number | null;
      imageMediaIds: number[];
    };
    return {
      questionId: answer.question_id_snapshot,
      questionNumber: answer.question_number_snapshot,
      part: asToeicListeningPart(answer.part_snapshot),
      question: answer.question_prompt_snapshot,
      transcript: answer.transcript_snapshot,
      transcriptTranslation: answer.transcript_translation_snapshot,
      audioMediaId: media.audioMediaId,
      imageMediaIds: media.imageMediaIds,
      stimulus:
        answer.stimulus_snapshot as ToeicListeningAttemptResult["answers"][number]["stimulus"],
      selectedOptionLabel: answer.selected_option_label_snapshot,
      selectedOption: answer.selected_option_text_snapshot,
      correctOptionLabel: answer.correct_option_label_snapshot,
      correctOption: answer.correct_option_text_snapshot,
      explanation: answer.explanation_snapshot,
      correct: answer.correct,
    };
  });
  const parts =
    attempt.practice_part === null
      ? TOEIC_LISTENING_PARTS
      : [asToeicListeningPart(attempt.practice_part)];
  return {
    ...mapToeicListeningAttemptSummary(attempt),
    listeningSourceVersion: attempt.listening_source_version_snapshot,
    parts: parts.map((part) => {
      const scoped = answers.filter((answer) => answer.part === part);
      const correct = scoped.filter((answer) => answer.correct).length;
      return {
        part,
        correctCount: correct,
        totalCount: scoped.length,
        accuracy:
          scoped.length === 0 ? 0 : Math.round((correct / scoped.length) * 100),
      };
    }),
    answers,
  };
}
