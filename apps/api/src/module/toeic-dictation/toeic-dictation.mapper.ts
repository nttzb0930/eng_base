import type {
  ToeicDictationItemProgress,
  ToeicDictationProgressSummary,
  ToeicDictationSetSummary,
} from "@repo/shared";

type ProgressRow = {
  id: number;
  latest_accuracy: number;
  words_correct: number;
  total_words: number;
  attempts_count: number;
  mastered: boolean;
  last_typed_text: string | null;
  last_attempted_at: Date | null;
  completed_at: Date | null;
};

export function mapItemProgress(
  itemId: number,
  progress: ProgressRow | null,
): ToeicDictationItemProgress {
  return {
    itemId,
    latestAccuracy: progress?.latest_accuracy ?? 0,
    wordsCorrect: progress?.words_correct ?? 0,
    totalWords: progress?.total_words ?? 0,
    attemptsCount: progress?.attempts_count ?? 0,
    mastered: progress?.mastered ?? false,
    lastTypedText: progress?.last_typed_text ?? null,
    lastAttemptedAt: progress?.last_attempted_at?.toISOString() ?? null,
    completedAt: progress?.completed_at?.toISOString() ?? null,
  };
}

export function summarizeProgress(
  totalCount: number,
  progress: ProgressRow[],
): ToeicDictationProgressSummary {
  const answered = progress.filter((item) => item.attempts_count > 0);
  return {
    answeredCount: answered.length,
    masteredCount: progress.filter((item) => item.mastered).length,
    totalCount,
    accuracy: answered.length === 0
      ? 0
      : Math.round(
          answered.reduce((sum, item) => sum + item.latest_accuracy, 0) /
            answered.length,
        ),
  };
}

export function mapSetSummary(input: {
  id: number;
  collection_name: string;
  display_name: string;
  test_number: number;
  part: number;
  source_version: string;
  toeic_dictation_items: Array<{
    id: number;
    toeic_dictation_progress: ProgressRow[];
  }>;
}): ToeicDictationSetSummary {
  const progress = input.toeic_dictation_items.flatMap(
    (item) => item.toeic_dictation_progress,
  );
  return {
    id: input.id,
    collectionName: input.collection_name,
    displayName: input.display_name,
    testNumber: input.test_number,
    part: input.part as 1 | 2 | 3 | 4,
    itemCount: input.toeic_dictation_items.length,
    sourceVersion: input.source_version,
    progress: summarizeProgress(input.toeic_dictation_items.length, progress),
  };
}
