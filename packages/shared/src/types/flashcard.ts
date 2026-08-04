export type FlashcardDeckSource =
  | "due"
  | "saved"
  | "weak"
  | "cefr"
  | "topic";

export type FlashcardDeckSummary = {
  key: string;
  source: FlashcardDeckSource;
  total: number;
  learned: number;
  mastered: number;
  due: number;
  accuracy: number | null;
  lastReviewedAt: Date | null;
  available: boolean;
};

export type FlashcardSummary = {
  overview: {
    due: number;
    saved: number;
    weak: number;
    learned: number;
    mastered: number;
    accuracy: number | null;
    lastReviewedAt: Date | null;
  };
  systemDecks: FlashcardDeckSummary[];
  cefrDecks: FlashcardDeckSummary[];
  topicDecks: FlashcardDeckSummary[];
};
