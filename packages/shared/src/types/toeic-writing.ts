export type ToeicWritingPart = 1 | 2;
export type ToeicWritingDifficulty = "EASY" | "MEDIUM";

export const TOEIC_WRITING_RESPONSE_LIMITS = {
  1: 1_000,
  2: 10_000,
} as const satisfies Record<ToeicWritingPart, number>;

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

export type ToeicWritingPartOneTaskSummary =
  ToeicWritingTaskSummaryBase & {
    part: 1;
    requiredWords: Array<{ en: string; vi: string | null }>;
    pattern: string | null;
  };

export type ToeicWritingPartTwoTaskSummary =
  ToeicWritingTaskSummaryBase & {
    part: 2;
    title: string;
    titleVi: string | null;
  };

export type ToeicWritingTaskSummary =
  | ToeicWritingPartOneTaskSummary
  | ToeicWritingPartTwoTaskSummary;

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
