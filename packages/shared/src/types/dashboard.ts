import type { PracticeCefrLevel } from "./practice.js";

export type DashboardStats = {
  overview: {
    totalVocabulary: number;
    learnedWords: number;
    masteredWords: number;
    dueWords: number;
    weakWords: number;
    savedWords: number;
    totalReviews: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
  };
  levelProgress: Array<{
    level: PracticeCefrLevel;
    total: number;
    learned: number;
    mastered: number;
    accuracy: number;
  }>;
  topWeakWords: Array<{
    id: number;
    word: string;
    meaning: string;
    cefrLevel: string;
    wrongCount: number;
    correctCount: number;
    accuracy: number;
  }>;
  recentSessions: Array<{
    id: number;
    mode: string;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
    createdAt: Date;
  }>;
  activity: Array<{
    date: string;
    sessionCount: number;
    wordCount: number;
    accuracy: number;
  }>;
  modeAccuracy: Array<{
    mode: string;
    sessionCount: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
  }>;
};
