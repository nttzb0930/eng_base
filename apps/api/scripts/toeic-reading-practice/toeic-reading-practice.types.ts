export const TOEIC_READING_PART_COUNTS = {
  5: 30,
  6: 16,
  7: 54,
} as const;

export type ToeicReadingPart = keyof typeof TOEIC_READING_PART_COUNTS;

export type ToeicReadingChoice = {
  label: "A" | "B" | "C" | "D";
  text: string;
  correct: boolean;
};

export type ToeicReadingQuestion = {
  sourceQuestionId: string;
  sourceNumber: number;
  stimulusId: string | null;
  prompt: string;
  translation: string | null;
  explanation: string | null;
  choices: ToeicReadingChoice[];
};

export type ToeicReadingStimulus = {
  sourceStimulusId: string;
  kind: "text" | "image" | "mixed";
  body: string | null;
  translation: string | null;
  mediaIds: string[];
};

export type ToeicReadingMediaReference = {
  id: string;
  sourceUrl: string;
  storagePath: string | null;
  sha256: string | null;
  bytes: number | null;
  contentType: string | null;
  status: "PENDING" | "DOWNLOADED";
};

export type ToeicReadingPracticeTest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetId: string;
  sourceTestId: string;
  sourceVersion: string;
  title: string;
  parts: Array<{
    part: ToeicReadingPart;
    stimuli: ToeicReadingStimulus[];
    questions: ToeicReadingQuestion[];
  }>;
  media: ToeicReadingMediaReference[];
};

export type ToeicSourceSet = {
  sourceSetId: string;
  name: string;
  order: number;
  hidden: boolean;
};

export type ToeicSourceTest = {
  sourceTestId: string;
  sourceSetId: string;
  title: string;
  order: number;
  free: boolean;
  hidden: boolean;
  updatedAt: string | null;
};

export type ToeicQuestionIndexRow = {
  sourceQuestionId: string;
  sourceTestId: string;
  part: ToeicReadingPart;
  sourceNumber: number;
  passageId: string | null;
  imageUrl: string | null;
};

export type ToeicPracticeStat = {
  sourceItemId: string;
  part: ToeicReadingPart;
  difficultyLevel: number | null;
  errorRate: number | null;
  totalAttempts: number | null;
};

export type ToeicReadingSource = {
  listSets(): Promise<ToeicSourceSet[]>;
  listTests(): Promise<ToeicSourceTest[]>;
  listQuestionIndex(sourceTestId: string): Promise<ToeicQuestionIndexRow[]>;
  readQuestions(sourceTestId: string): Promise<unknown[]>;
  readPassages(sourceTestId: string): Promise<unknown[]>;
  readPracticeStats(
    part: ToeicReadingPart
  ): Promise<ToeicPracticeStat[] | null>;
};

export type ToeicReadingInventoryTest = {
  sourceTestId: string;
  sourceSetId: string;
  title: string;
  order: number;
  updatedAt: string | null;
  questionCounts: Record<"5" | "6" | "7", number>;
  passageIds: string[];
  imageUrls: string[];
};

export type ToeicReadingInventory = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSet: string;
  limitTests: number;
  observedAt: string;
  selectedTests: ToeicReadingInventoryTest[];
  excludedHiddenCount: number;
  excludedNotFreeCount: number;
  questionCounts: Record<"5" | "6" | "7", number>;
  totalQuestions: number;
  inventorySha256: string;
};

export type ToeicReadingDownloadSummary = {
  completed: string[];
  resumed: string[];
  rejected: Array<{ sourceTestId: string; errors: string[] }>;
  failed: Array<{ sourceTestId: string; category: string }>;
  questionCounts: Record<"5" | "6" | "7", number>;
};

export type ToeicReadingStorage = {
  writeInventory(value: ToeicReadingInventory): Promise<string>;
  readInventory(sha256: string): Promise<ToeicReadingInventory>;
  packageExists(sourceTestId: string, sourceVersion: string): Promise<boolean>;
  writePackageFile(
    sourceTestId: string,
    sourceVersion: string,
    name:
      | "content.json"
      | "practice-stats.json"
      | "validation.json"
      | "manifest.json",
    value: unknown
  ): Promise<void>;
  listCompletePackages(): Promise<
    Array<{ sourceTestId: string; sourceVersion: string }>
  >;
  readPackageFile(
    sourceTestId: string,
    sourceVersion: string,
    name: string
  ): Promise<unknown>;
};
