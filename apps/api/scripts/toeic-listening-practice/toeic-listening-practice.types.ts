import type { ToeicReadingInventory } from "../toeic-reading-practice/toeic-reading-practice.types.js";

export const TOEIC_LISTENING_PART_COUNTS = {
  1: 6,
  2: 25,
  3: 39,
  4: 30,
} as const;

export type ToeicListeningPart = keyof typeof TOEIC_LISTENING_PART_COUNTS;

export type ApprovedToeicTestIdentity = {
  sourceTestId: string;
  sourceSetId: string;
  title: string;
  order: number;
};

export type ToeicListeningQuestionIndexRow = {
  sourceQuestionId: string;
  sourceTestId: string;
  part: ToeicListeningPart;
  sourceNumber: number;
  stimulusId: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
};

export type ToeicListeningStimulusIndexRow = {
  sourceStimulusId: string;
  sourceTestId: string;
  part: 3 | 4;
  audioUrl: string | null;
  imageUrl: string | null;
};

export type ToeicListeningMediaInspection = {
  url: string;
  bytes: number | null;
  contentType: string | null;
};

export type ToeicListeningSource = {
  listTests(): Promise<ApprovedToeicTestIdentity[]>;
  listQuestionIndex(
    sourceTestId: string
  ): Promise<ToeicListeningQuestionIndexRow[]>;
  listStimulusIndex(
    sourceTestId: string
  ): Promise<ToeicListeningStimulusIndexRow[]>;
  inspectMedia(url: string): Promise<ToeicListeningMediaInspection>;
  readQuestions(sourceTestId: string): Promise<unknown[]>;
  readStimuli(sourceTestId: string): Promise<unknown[]>;
  downloadMedia(
    url: string,
    offset: number
  ): Promise<{
    status: number;
    bytes: Uint8Array;
    contentType: string | null;
  }>;
};

export type ToeicListeningInventorySource = Pick<
  ToeicListeningSource,
  "listTests" | "listQuestionIndex" | "listStimulusIndex" | "inspectMedia"
>;

export type ToeicListeningInventoryTest = ApprovedToeicTestIdentity & {
  questionCounts: Record<"1" | "2" | "3" | "4", number>;
  audioUrls: string[];
  imageUrls: string[];
};

export type ToeicListeningInventory = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetName: string;
  readingInventorySha256: string;
  observedAt: string;
  selectedTests: ToeicListeningInventoryTest[];
  questionCounts: Record<"1" | "2" | "3" | "4", number>;
  audioCount: number;
  imageCount: number;
  knownMediaBytes: number;
  unknownMediaSizeCount: number;
  media: Array<{
    url: string;
    role: "AUDIO" | "IMAGE";
    bytes: number | null;
    contentType: string | null;
  }>;
  inventorySha256: string;
};

export type ToeicListeningDownloadSummary = {
  completed: string[];
  resumed: string[];
  rejected: Array<{ sourceTestId: string; errors: string[] }>;
  failed: Array<{ sourceTestId: string; category: string }>;
  questionCounts: Record<"1" | "2" | "3" | "4", number>;
};

export type ToeicListeningImportResult = "UPDATED" | "SKIPPED";
export type ToeicListeningImportSummary = {
  updated: string[];
  skipped: string[];
  rejected: Array<{ sourceTestId: string; errors: string[] }>;
  failed: Array<{ sourceTestId: string; category: string }>;
};

export type ToeicListeningChoice = {
  label: string;
  text: string | null;
  correct: boolean;
};

export type ToeicListeningQuestion = {
  sourceQuestionId: string;
  sourceNumber: number;
  stimulusId: string | null;
  prompt: string | null;
  transcript: string | null;
  translation: string | null;
  explanation: string | null;
  audioMediaId: string | null;
  imageMediaIds: string[];
  choices: ToeicListeningChoice[];
};

export type ToeicListeningStimulus = {
  sourceStimulusId: string;
  transcript: string;
  translation: string | null;
  audioMediaId: string;
  imageMediaIds: string[];
};

export type ToeicListeningMedia = {
  id: string;
  role: "AUDIO" | "IMAGE";
  sourceUrl: string;
  storagePath: string;
  sha256: string;
  bytes: number;
  contentType: string;
};

export type ToeicListeningPracticeTest = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceSetId: string;
  sourceSetName: string;
  sourceTestId: string;
  listeningSourceVersion: string;
  title: string;
  parts: Array<{
    part: ToeicListeningPart;
    stimuli: ToeicListeningStimulus[];
    questions: ToeicListeningQuestion[];
  }>;
  media: ToeicListeningMedia[];
};

export type ToeicListeningStorage = {
  readReadingInventory(sha256: string): Promise<ToeicReadingInventory>;
  readInventory(sha256: string): Promise<ToeicListeningInventory>;
  writeInventory(value: ToeicListeningInventory): Promise<string>;
  resolveMediaPath(
    sourceTestId: string,
    mediaId: string,
    contentType: string
  ): string;
  ensureMediaDirectory(path: string): Promise<void>;
  downloadMedia(input: {
    sourceTestId: string;
    mediaId: string;
    contentType: string;
    expectedBytes: number | null;
    expectedSha256?: string;
    request(offset: number): Promise<{
      status: number;
      bytes: Uint8Array;
      contentType: string | null;
    }>;
  }): Promise<{
    absolutePath: string;
    storagePath: string;
    sha256: string;
    bytes: number;
    contentType: string;
    reused: boolean;
  }>;
  packageExists(sourceTestId: string, sourceVersion: string): Promise<boolean>;
  writePackageFile(
    sourceTestId: string,
    sourceVersion: string,
    name: string,
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
