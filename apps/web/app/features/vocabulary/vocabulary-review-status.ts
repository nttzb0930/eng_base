import type { VocabularyItem } from "@repo/shared";

export const getVocabularyReviewStatus = (item: VocabularyItem) => {
  const progress = item.userVocabularyProgress[0];
  const due =
    !progress?.nextReviewAt || progress.nextReviewAt.getTime() <= Date.now();

  return {
    progress,
    due,
    masteryLevel: progress?.masteryLevel ?? "new",
  };
};
