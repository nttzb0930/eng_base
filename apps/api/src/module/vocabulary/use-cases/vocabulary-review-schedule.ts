export type FlashcardRating = "again" | "good";

export type ExistingVocabularySchedule = {
  ease_factor: number;
  interval_days: number;
  repetition_count: number;
};

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const DAY_IN_MS = 86_400_000;

export function getVocabularyReviewSchedule(
  progress: ExistingVocabularySchedule | null | undefined,
  rating: FlashcardRating,
  now = new Date()
) {
  const current = {
    ease_factor: progress?.ease_factor ?? DEFAULT_EASE_FACTOR,
    interval_days: progress?.interval_days ?? 0,
    repetition_count: progress?.repetition_count ?? 0,
  };

  if (rating === "again") {
    return {
      correctIncrement: 0,
      wrongIncrement: 1,
      easeFactor: Math.max(
        MIN_EASE_FACTOR,
        Number((current.ease_factor - 0.2).toFixed(2))
      ),
      intervalDays: 1,
      repetitionCount: 0,
      masteryLevel: "learning",
      nextReviewAt: new Date(now.getTime() + DAY_IN_MS),
    };
  }

  const repetitionCount = current.repetition_count + 1;
  const intervalDays =
    repetitionCount === 1
      ? 1
      : repetitionCount === 2
        ? 6
        : Math.max(1, Math.round(current.interval_days * current.ease_factor));

  return {
    correctIncrement: 1,
    wrongIncrement: 0,
    easeFactor: current.ease_factor,
    intervalDays,
    repetitionCount,
    masteryLevel: repetitionCount >= 5 ? "mastered" : repetitionCount >= 2 ? "review" : "learning",
    nextReviewAt: new Date(now.getTime() + intervalDays * DAY_IN_MS),
  };
}
