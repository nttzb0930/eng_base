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

export type ToeicWritingPartOneValidationIssueCode =
  | "MIN_WORDS"
  | "MAX_WORDS"
  | "MAX_CHARACTERS"
  | "UPPERCASE_START_REQUIRED"
  | "TERMINAL_PUNCTUATION_REQUIRED"
  | "ONE_SENTENCE_REQUIRED"
  | "REQUIRED_WORD_MISSING"
  | "OBVIOUS_SPAM";

export type ToeicWritingPartOneValidationIssue = {
  code: ToeicWritingPartOneValidationIssueCode;
  keyword?: string;
};

export type ToeicWritingPartOneGradeRequest = {
  contentVersion: string;
  responseText: string;
  idempotencyKey: string;
  locale: ToeicWritingLocale;
};

export type ToeicWritingPartTwoValidationIssueCode =
  "MIN_WORDS" | "MAX_WORDS" | "MAX_CHARACTERS" | "OBVIOUS_SPAM";

export type ToeicWritingPartTwoValidationIssue = {
  code: ToeicWritingPartTwoValidationIssueCode;
};

export type ToeicWritingValidationResult = {
  valid: boolean;
  issues: ToeicWritingPartTwoValidationIssue[];
  wordCount: number;
};

export type ToeicWritingPartTwoGradeRequest = {
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

export type ToeicWritingCoachingKind = "OUTLINE" | "VOCABULARY" | "SAMPLE";
export type ToeicWritingCoachingSectionKind = "OPENING" | "BODY" | "ENDING";

export type ToeicWritingOutlineSection = {
  kind: ToeicWritingCoachingSectionKind;
  items: string[];
};

export type ToeicWritingVocabularyPattern = {
  patternEn: string;
  meaningVi: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
};

export type ToeicWritingSampleSection = {
  kind: ToeicWritingCoachingSectionKind;
  textEn: string;
  textVi: string | null;
};

type ToeicWritingPartTwoCoachingBase = {
  taskId: number;
  contentVersion: string;
  assistance: ToeicWritingAssistanceSnapshot;
};

export type ToeicWritingPartTwoCoaching =
  | (ToeicWritingPartTwoCoachingBase & {
      kind: "OUTLINE";
      variants: Array<{
        level: 1 | 2;
        sections: ToeicWritingOutlineSection[];
      }>;
    })
  | (ToeicWritingPartTwoCoachingBase & {
      kind: "VOCABULARY";
      variants: Array<{
        level: 1 | 2;
        items: ToeicWritingVocabularyPattern[];
      }>;
    })
  | (ToeicWritingPartTwoCoachingBase & {
      kind: "SAMPLE";
      sampleEn: string;
      sampleVi: string | null;
      structure: ToeicWritingSampleSection[];
    });

export type ToeicWritingCommunityItem = {
  submissionId: number;
  responseText: string;
  authorLabel: string;
  sharedAt: string;
};

export type ToeicWritingCommunityPage = {
  items: ToeicWritingCommunityItem[];
  nextCursor: number | null;
};

export type ToeicWritingSubmissionShareResult =
  { shared: true; sharedAt: string } | { shared: false };

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

export type ToeicWritingPartOneGradeDetail = Omit<
  ToeicWritingPartOneGradeResult,
  "quota" | "cached"
> & {
  responseText: string;
  createdAt: string;
};

export type ToeicWritingEvidenceRange = {
  start: number;
  end: number;
  text: string;
};

export type ToeicWritingRequirementStatus = "MET" | "PARTIAL" | "MISSING";
export type ToeicWritingFeedbackStatus = "PASS" | "WARN" | "FAIL";
export type ToeicWritingGrammarSeverity = "SERIOUS" | "MINOR";

export type ToeicWritingRequirementFeedback = {
  requirementId: string;
  status: ToeicWritingRequirementStatus;
  comment: string;
  evidence: ToeicWritingEvidenceRange[];
  suggestedFix: string | null;
};

export type ToeicWritingTaskCompletionFeedback = {
  status: ToeicWritingFeedbackStatus;
  completedCount: number;
  totalCount: number;
  requirements: ToeicWritingRequirementFeedback[];
};

export type ToeicWritingSentenceVarietyFeedback = {
  status: ToeicWritingFeedbackStatus;
  detected: Array<{
    kind: "SIMPLE" | "COMPOUND" | "COMPLEX";
    evidence: ToeicWritingEvidenceRange;
  }>;
  feedback: string;
};

export type ToeicWritingToneFeedback = {
  status: ToeicWritingFeedbackStatus;
  feedback: string;
  suggestedOpening: string | null;
};

export type ToeicWritingGrammarError = {
  severity: ToeicWritingGrammarSeverity;
  evidence: ToeicWritingEvidenceRange;
  correction: string;
  explanation: string;
};

export type ToeicWritingGrammarFeedback = {
  status: ToeicWritingFeedbackStatus;
  errors: ToeicWritingGrammarError[];
  feedback: string;
};

export type ToeicWritingParaphraseFeedback = {
  status: ToeicWritingFeedbackStatus;
  copiedRanges: ToeicWritingEvidenceRange[];
  feedback: string;
};

export type ToeicWritingImprovedEmail = {
  text: string;
  wordCount: number;
  differences: string[];
  requirementCoverage: Array<{
    requirementId: string;
    evidence: ToeicWritingEvidenceRange[];
  }>;
};

export type ToeicWritingPartTwoGradeResult = {
  id: number;
  taskId: number;
  score: 0 | 1 | 2 | 3 | 4;
  scoreLabel: string;
  taskCompletion: ToeicWritingTaskCompletionFeedback;
  sentenceVariety: ToeicWritingSentenceVarietyFeedback;
  tone: ToeicWritingToneFeedback;
  grammar: ToeicWritingGrammarFeedback;
  paraphrase: ToeicWritingParaphraseFeedback;
  overallFeedback: string;
  strengths: string[];
  improvements: string[];
  improvedEmail: ToeicWritingImprovedEmail;
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
  nextCursor: number | null;
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
