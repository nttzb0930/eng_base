export type ToeicVocabularyItem = Record<string, unknown>;

export type ToeicVocabularyCacheRow = {
  questionId: string;
  vocabulary: ToeicVocabularyItem[];
};

export type ToeicVocabularyCacheSource = {
  readReady(questionIds: string[]): Promise<ToeicVocabularyCacheRow[]>;
};

export type ToeicVocabularyCacheInventory = {
  questionCount: number;
  readyCount: number;
  missingCount: number;
  entries: Record<string, ToeicVocabularyItem[]>;
  missingQuestionIds: string[];
};
