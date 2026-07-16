export type VocabularyItem = {
  id: number;
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: string;
  phonetic: string | null;
  phoneticSource: string | null;
  audioUrl: string | null;
  audioSource: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
  exampleSource: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  userSavedWords: UserSavedWord[];
  userVocabularyProgress: UserVocabularyProgress[];
  vocabularyExamples: VocabularyExample[];
};

export type VocabularyExample = {
  id: number;
  vocabularyItemId: number;
  exampleEn: string;
  exampleVi: string | null;
  source: string;
  order: number;
  createdAt: Date;
};

export type UserVocabularyProgress = {
  id: number;
  userId: string;
  vocabularyItemId: number;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  masteryLevel: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserSavedWord = {
  id: number;
  userId: string;
  vocabularyItemId: number;
  createdAt: Date;
};
