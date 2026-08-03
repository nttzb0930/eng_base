import type {
  ToeicWritingAssistanceSnapshot,
  ToeicWritingGradeCheck,
  ToeicWritingLocale,
  ToeicWritingPartTwoGradeResult,
  ToeicWritingPartOneSuggestion,
} from "@repo/shared";

export const WRITING_AI_PROVIDER = Symbol("WRITING_AI_PROVIDER");

export type WritingImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type WritingPictureContext = {
  schemaVersion: 1;
  sceneSummary: string;
  visibleEntities: string[];
  visibleActions: string[];
  relationships: string[];
  requiredWordGrounding: Array<{
    word: string;
    supported: boolean;
    evidence: string;
  }>;
};

export type WritingPartOneProviderResult = {
  score: 0 | 1 | 2 | 3;
  scoreLabel: string;
  checks: {
    grammar: ToeicWritingGradeCheck;
    keywords: ToeicWritingGradeCheck;
    relevance: ToeicWritingGradeCheck;
  };
  overallFeedback: string;
  suggestion: ToeicWritingPartOneSuggestion;
};

export type WritingPartTwoProviderResult = Omit<
  ToeicWritingPartTwoGradeResult,
  "id" | "taskId" | "quota" | "cached" | "assistance"
>;

export interface WritingAiProvider {
  enrichPicture(input: {
    imageBytes: Uint8Array;
    mimeType: WritingImageMimeType;
    requiredWords: string[];
  }): Promise<WritingPictureContext>;

  gradePartOne(input: {
    locale: ToeicWritingLocale;
    responseText: string;
    requiredWords: string[];
    picture:
      | { source: "ENRICHED"; context: WritingPictureContext }
      | {
          source: "DIRECT_IMAGE";
          imageBytes: Uint8Array;
          mimeType: WritingImageMimeType;
        };
  }): Promise<WritingPartOneProviderResult>;

  gradePartTwo(input: {
    locale: ToeicWritingLocale;
    sourceEmail: string;
    requirements: Array<{
      id: string;
      textEn: string;
      textVi: string | null;
    }>;
    responseText: string;
    assistance: ToeicWritingAssistanceSnapshot;
  }): Promise<WritingPartTwoProviderResult>;
}
