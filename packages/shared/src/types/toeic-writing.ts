export type ToeicWritingPart = 1 | 2;
export type ToeicWritingDifficulty = "EASY" | "MEDIUM";

export const TOEIC_WRITING_RESPONSE_LIMITS = {
  1: 300,
  2: 2_200,
} as const satisfies Record<ToeicWritingPart, number>;

export const TOEIC_WRITING_WORD_LIMITS = {
  1: { min: 3, max: 40 },
  2: { min: 50, max: 300 },
} as const satisfies Record<
  ToeicWritingPart,
  { readonly min: number; readonly max: number }
>;

export function getToeicWritingResponseLength(responseText: string): number {
  return Array.from(responseText.trim()).length;
}

export type ToeicWritingOverview = {
  publishedTaskCount: number;
  submittedTaskCount: number;
  parts: Array<{
    part: ToeicWritingPart;
    publishedTaskCount: number;
    submittedTaskCount: number;
  }>;
};

type ToeicWritingTaskSummaryBase = {
  id: number;
  order: number;
  difficulty: ToeicWritingDifficulty;
  contentVersion: string;
  submitted: boolean;
  hasDraft: boolean;
};

export type ToeicWritingPartOneTaskSummary = ToeicWritingTaskSummaryBase & {
  part: 1;
  requiredWords: Array<{ en: string; vi: string | null }>;
  pattern: string | null;
};

export type ToeicWritingPartTwoTaskSummary = ToeicWritingTaskSummaryBase & {
  part: 2;
  title: string;
  titleVi: string | null;
};

export type ToeicWritingTaskSummary =
  ToeicWritingPartOneTaskSummary | ToeicWritingPartTwoTaskSummary;

type ToeicWritingTaskDetailBase = ToeicWritingTaskSummaryBase & {
  title: string;
};

export type ToeicWritingPartOneExercise = {
  imageUrl: string;
  instructionsEn: string;
  instructionsVi: string | null;
  requiredWords: Array<{ en: string; vi: string | null }>;
};

export type ToeicWritingPartTwoExercise = {
  promptEn: string;
  promptVi: string | null;
  requirements: Array<{
    order: number;
    textEn: string;
    textVi: string | null;
  }>;
};

export type ToeicWritingTaskDetail =
  | (ToeicWritingTaskDetailBase & {
      part: 1;
      exercise: ToeicWritingPartOneExercise;
    })
  | (ToeicWritingTaskDetailBase & {
      part: 2;
      exercise: ToeicWritingPartTwoExercise;
    });

export type ToeicWritingDraftPayload = {
  contentVersion: string;
  responseText: string;
};

export type ToeicWritingDraft = ToeicWritingDraftPayload & {
  id: number;
  taskId: number;
  updatedAt: string;
};

export type ToeicWritingSubmissionPayload = ToeicWritingDraftPayload & {
  submissionKey: string;
};

export type ToeicWritingLocale = "en" | "vi";

export type ToeicWritingPartOneGradeRequest = {
  contentVersion: string;
  responseText: string;
  idempotencyKey: string;
  locale: ToeicWritingLocale;
};

export type ToeicWritingAssistanceSnapshot = {
  outlineViewed: boolean;
  vocabularyViewed: boolean;
  sampleViewed: boolean;
  communityAnswerRestored: boolean;
};

export type ToeicWritingAiQuota = {
  dailyLimit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

export type ToeicWritingGradeCheck = {
  status: "PASS" | "WARN" | "FAIL";
  label: string;
  feedback: string;
};

export type ToeicWritingPartOneSuggestion = {
  correctedSentence: string;
  annotated: Array<{
    text: string;
    status: "KEPT" | "CORRECTED" | "ADDED" | "REMOVED";
  }>;
  alternativeSentence: string;
  explanation: string;
};

export type ToeicWritingPartOneGradeResult = {
  id: number;
  taskId: number;
  score: 0 | 1 | 2 | 3;
  scoreLabel: string;
  checks: {
    grammar: ToeicWritingGradeCheck;
    keywords: ToeicWritingGradeCheck;
    relevance: ToeicWritingGradeCheck;
  };
  overallFeedback: string;
  suggestion: ToeicWritingPartOneSuggestion;
  quota: ToeicWritingAiQuota;
  cached: boolean;
  assistance: ToeicWritingAssistanceSnapshot;
};

export type ToeicWritingGradeHistoryItem = {
  id: number;
  taskId: number;
  part: ToeicWritingPart;
  score: number;
  responseText: string;
  createdAt: string;
};

export type ToeicWritingGradeHistoryPage = {
  items: ToeicWritingGradeHistoryItem[];
  total: number;
  page: number;
  limit: number;
};

export type ToeicWritingPartOneReference = {
  samplesEn: string[];
  samplesVi: string[];
  structureSuggestions: string[];
  ideas: string[];
};

export type ToeicWritingPartTwoReference = {
  sampleEn: string;
  sampleVi: string | null;
  outlineLevel1: string[];
  outlineLevel2: string[];
  chunksLevel1: string[];
  chunksLevel2: string[];
};

type ToeicWritingSubmissionBase = {
  id: number;
  taskId: number;
  taskTitle: string;
  contentVersion: string;
  responseText: string;
  submittedAt: string;
};

export type ToeicWritingSubmissionResult =
  | (ToeicWritingSubmissionBase & {
      part: 1;
      reference: ToeicWritingPartOneReference;
    })
  | (ToeicWritingSubmissionBase & {
      part: 2;
      reference: ToeicWritingPartTwoReference;
    });
