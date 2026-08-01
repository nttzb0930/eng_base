export type ToeicDictationPart = 1 | 2 | 3 | 4;
export type ToeicDictationMode = "check" | "dictation" | "full";
export type ToeicDictationRevealCount = 0 | 1 | 2 | 3 | "all";

export type ToeicDictationProgressSummary = {
  answeredCount: number;
  masteredCount: number;
  totalCount: number;
  accuracy: number;
};

export type ToeicDictationSetSummary = {
  id: number;
  collectionName: string;
  displayName: string;
  testNumber: number;
  part: ToeicDictationPart;
  itemCount: number;
  sourceVersion: string;
  progress: ToeicDictationProgressSummary;
};

export type ToeicDictationOverview = {
  collectionName: string;
  publishedSetCount: number;
  totalItemCount: number;
  parts: Array<{
    part: ToeicDictationPart;
    setCount: number;
    itemCount: number;
  }>;
};

export type ToeicDictationItem = {
  id: number;
  order: number;
  groupId: string | null;
  durationSeconds: number | null;
  mediaId: number;
};

export type ToeicDictationSetDetail = ToeicDictationSetSummary & {
  items: ToeicDictationItem[];
};

export type ToeicDictationItemProgress = {
  itemId: number;
  latestAccuracy: number;
  wordsCorrect: number;
  totalWords: number;
  attemptsCount: number;
  mastered: boolean;
  lastTypedText: string | null;
  lastAttemptedAt: string | null;
  completedAt: string | null;
};

export type ToeicDictationProgress = {
  setId: number;
  sourceVersion: string;
  items: ToeicDictationItemProgress[];
};

export type ToeicDictationSubmitPayload = {
  itemId: number;
  sourceVersion: string;
  typedText: string;
  submissionKey: string;
  mode?: ToeicDictationMode;
  hidePercent?: 30 | 50 | 100;
};

export type ToeicDictationCheckSegment = {
  segmentIndex: number;
  wordIndex: number | null;
  length: number | null;
  text: string | null;
  hidden: boolean;
};

export type ToeicDictationCheckItem = {
  itemId: number;
  order: number;
  hidePercent: 30 | 50 | 100;
  segments: ToeicDictationCheckSegment[];
};

export type ToeicDictationFullItem = {
  itemId: number;
  transcript: string;
  translationVi: string | null;
};

export type ToeicDictationWordResult = {
  status: "CORRECT" | "MISSING" | "EXTRA";
  expected: string | null;
  actual: string | null;
};

export type ToeicDictationSubmitResult = {
  attemptId: number;
  itemId: number;
  sourceVersion: string;
  typedText: string;
  wordsCorrect: number;
  totalWords: number;
  accuracy: number;
  mastered: boolean;
  words: ToeicDictationWordResult[];
  transcript: string;
  translationVi: string | null;
  submittedAt: string;
};
