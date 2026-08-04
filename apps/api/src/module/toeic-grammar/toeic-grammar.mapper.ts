import type {
  ToeicGrammarProgressSummary,
  ToeicGrammarQuestionProgress,
} from "@repo/shared";

type ProgressRow = {
  source_question_id: string;
  last_correct: boolean;
  last_selected_option_label?: string;
};

export function grammarProgressMap(rows: ProgressRow[]) {
  return new Map(rows.map((row) => [row.source_question_id, row]));
}

export function summarizeGrammarProgress(
  questionIds: string[],
  progress: Map<string, ProgressRow>
): ToeicGrammarProgressSummary {
  const uniqueIds = [...new Set(questionIds)];
  let correctCount = 0;
  let incorrectCount = 0;
  for (const id of uniqueIds) {
    const row = progress.get(id);
    if (row?.last_correct === true) correctCount += 1;
    if (row?.last_correct === false) incorrectCount += 1;
  }
  return {
    questionCount: uniqueIds.length,
    correctCount,
    incorrectCount,
    unansweredCount: uniqueIds.length - correctCount - incorrectCount,
  };
}

export function mapGrammarQuestionProgress(
  row: ProgressRow | undefined,
  options: Array<{ id: number; label: string }>
): ToeicGrammarQuestionProgress {
  if (!row) {
    return { attempted: false, lastSelectedOptionId: null, lastCorrect: null };
  }
  return {
    attempted: true,
    lastSelectedOptionId:
      options.find((option) => option.label === row.last_selected_option_label)
        ?.id ?? null,
    lastCorrect: row.last_correct,
  };
}
