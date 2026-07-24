import type {
  VocabularyLearnerState,
  VocabularyTopicProgressStats,
} from "@repo/shared";

import type { VocabularyItem } from "../types/vocabulary.types";

export const getVocabularyLearnerState = (
  item: VocabularyItem,
  now: Date
): VocabularyLearnerState => {
  const progress = item.userVocabularyProgress[0] ?? null;
  const learned = (progress?.reviewCount ?? 0) > 0;
  const mastered = learned && progress?.masteryLevel === "mastered";
  const weak = learned && (progress?.wrongCount ?? 0) > 0;
  const due =
    learned &&
    (!progress?.nextReviewAt ||
      progress.nextReviewAt.getTime() <= now.getTime());

  return {
    learned,
    learning: learned && !mastered,
    unlearned: !learned,
    mastered,
    weak,
    due,
    masteryLevel: progress?.masteryLevel ?? null,
  };
};

export const summarizeVocabularyLearnerStates = (
  items: readonly VocabularyItem[],
  now: Date
): VocabularyTopicProgressStats =>
  items.reduce<VocabularyTopicProgressStats>(
    (stats, item) => {
      const state = getVocabularyLearnerState(item, now);

      stats.learned += Number(state.learned);
      stats.learning += Number(state.learning);
      stats.unlearned += Number(state.unlearned);
      stats.mastered += Number(state.mastered);
      stats.weak += Number(state.weak);
      stats.due += Number(state.due);

      return stats;
    },
    {
      total: items.length,
      learned: 0,
      learning: 0,
      unlearned: 0,
      mastered: 0,
      weak: 0,
      due: 0,
    }
  );
