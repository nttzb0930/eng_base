import type { LessonChallengeOption } from "./course.js";
import type { VocabularyItem } from "./vocabulary.js";

export type ReviewChallenge = {
  id: number;
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK" | "AUDIO_TO_TEXT";
  direction: "EN_TO_VI" | "VI_TO_EN" | "AUDIO_TO_EN" | "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: LessonChallengeOption[];
};

export type DailyReviewChallenge = ReviewChallenge;
export type SavedWordReviewChallenge = Omit<ReviewChallenge, "type"> & {
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK";
};

export type ReviewSummary = {
  total: number;
  due: number;
  weak: number;
  saved: number;
};

export type SavedWordsReviewSummary = {
  total: number;
  due: number;
  new: number;
  learning: number;
  review: number;
  mastered: number;
};
