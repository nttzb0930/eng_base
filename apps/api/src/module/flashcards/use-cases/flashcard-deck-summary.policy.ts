import type {
  FlashcardDeckSource,
  FlashcardDeckSummary,
} from "@repo/shared";

import {
  getVocabularyLearnerState,
  type VocabularyItem,
} from "../../vocabulary";

export function summarizeFlashcardDeck(
  key: string,
  source: FlashcardDeckSource,
  items: readonly VocabularyItem[],
  now: Date,
): FlashcardDeckSummary {
  const states = items.map((item) => getVocabularyLearnerState(item, now));
  const learnedRows = items
    .map((item) => item.userVocabularyProgress[0])
    .filter((row) => row && row.reviewCount > 0);
  const correct = learnedRows.reduce(
    (sum, row) => sum + row.correctCount,
    0,
  );
  const wrong = learnedRows.reduce((sum, row) => sum + row.wrongCount, 0);
  const attempts = correct + wrong;
  const reviewedDates = learnedRows
    .map((row) => row.lastReviewedAt)
    .filter((value): value is Date => value !== null);

  return {
    key,
    source,
    total: items.length,
    learned: states.filter((state) => state.learned).length,
    mastered: states.filter((state) => state.mastered).length,
    due: states.filter((state) => state.due).length,
    accuracy:
      attempts === 0 ? null : Math.round((correct / attempts) * 100),
    lastReviewedAt:
      reviewedDates.reduce<Date | null>(
        (latest, value) =>
          !latest || value.getTime() > latest.getTime() ? value : latest,
        null,
      ),
    available: items.length > 0,
  };
}
