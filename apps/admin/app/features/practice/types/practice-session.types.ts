export interface PracticeSessionItem {
  id: number;
  challengeType: string;
  correct: boolean;
  answer: string | null;
  vocabularyItem?: {
    word: string;
    primaryMeaningVi: string;
  };
}

export interface PracticeSession {
  id: number;
  userId: string;
  mode: string;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  createdAt: string;
  items?: PracticeSessionItem[];
}

export type ListPracticeSessionsQuery = {
  page?: number;
  limit?: number;
  user_id?: string;
};

export type PaginatedPracticeSessionsResponse = {
  data: PracticeSession[];
  pagination?: { totalPages: number; total?: number };
};
