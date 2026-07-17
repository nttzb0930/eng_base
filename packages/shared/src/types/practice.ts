import type { CefrLevel } from "../constants/cefr.js";
import type { LessonChallengeOption } from "./course.js";
import type { ReviewChallenge } from "./review.js";
import type { VocabularyItem } from "./vocabulary.js";

export type PracticeCefrLevel = CefrLevel;

export type PracticeLevelSummary = Record<
  PracticeCefrLevel,
  {
    words: number;
    lessons: number;
    unlockedLessons: number;
  }
>;

export type FillBlankPracticeChallenge = {
  id: number;
  type: "FILL_BLANK";
  direction: "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: LessonChallengeOption[];
};

export type ListeningPracticeChallenge = {
  id: number;
  type: "LISTEN_SELECT";
  direction: "AUDIO_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: LessonChallengeOption[];
};

export type DictationPracticeChallenge = {
  id: number;
  type: "AUDIO_TO_TEXT";
  direction: "AUDIO_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
};

export type WeakWordsPracticeChallenge = Omit<ReviewChallenge, "type"> & {
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK";
};

export type WeakWordsSummary = {
  total: number;
  due: number;
  learning: number;
  wrong: number;
};
