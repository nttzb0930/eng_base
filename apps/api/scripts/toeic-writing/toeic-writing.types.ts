export type ToeicWritingCanonicalDifficulty = "EASY" | "MEDIUM";

export type ToeicWritingCanonicalImage = {
  storageKey: string;
  sha256: string;
  bytes: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

export type ToeicWritingRequiredWord = {
  en: string;
  vi: string | null;
};

export type ToeicWritingPartOneCanonicalPayload = {
  requiredWords: ToeicWritingRequiredWord[];
  pattern: string | null;
  structureSuggestions: string[];
  ideas: string[];
  samplesEn: string[];
  samplesVi: string[];
};

export type ToeicWritingPartTwoRequirement = {
  order: number;
  textEn: string;
  textVi: string | null;
};

export type ToeicWritingPartTwoCanonicalPayload = {
  promptEn: string;
  promptVi: string | null;
  requirements: ToeicWritingPartTwoRequirement[];
  outlineLevel1: string[];
  outlineLevel2: string[];
  chunksLevel1: string[];
  chunksLevel2: string[];
  gapReferences: string[];
  sampleEn: string;
  sampleVi: string | null;
};

export type ToeicWritingCanonicalBase = {
  schemaVersion: 1;
  source: string;
  sourceTaskId: string;
  sourceVersion: string;
  contentSha256: string;
  retrievedAt: string;
  licenseReference: string;
  order: number;
  title: string;
  difficulty: ToeicWritingCanonicalDifficulty;
  instructionsEn: string;
  instructionsVi: string | null;
};

export type ToeicWritingPartOneCanonicalTask = ToeicWritingCanonicalBase & {
  part: 1;
  media: ToeicWritingCanonicalImage;
  payload: ToeicWritingPartOneCanonicalPayload;
};

export type ToeicWritingPartTwoCanonicalTask = ToeicWritingCanonicalBase & {
  part: 2;
  media: null;
  payload: ToeicWritingPartTwoCanonicalPayload;
};

export type ToeicWritingCanonicalTask =
  ToeicWritingPartOneCanonicalTask | ToeicWritingPartTwoCanonicalTask;

type ToeicWritingSourceTaskBase = {
  sourceTaskId: string;
  sourceVersion: string;
  order: number;
  title: string;
  difficulty: ToeicWritingCanonicalDifficulty;
  instructionsEn: string;
  instructionsVi: string | null;
};

export type ToeicWritingPartOneSourceTask = ToeicWritingSourceTaskBase & {
  part: 1;
  imageUrl: string;
  payload: ToeicWritingPartOneCanonicalPayload;
};

export type ToeicWritingPartTwoSourceTask = ToeicWritingSourceTaskBase & {
  part: 2;
  imageUrl: null;
  payload: ToeicWritingPartTwoCanonicalPayload;
};

export type ToeicWritingSourceTask =
  ToeicWritingPartOneSourceTask | ToeicWritingPartTwoSourceTask;

export type ToeicWritingInventoryTask =
  | (ToeicWritingPartOneSourceTask & {
      imageBytes: number | null;
      imageContentType: string | null;
    })
  | (ToeicWritingPartTwoSourceTask & {
      imageBytes: null;
      imageContentType: null;
    });

export type ToeicWritingInventory = {
  schemaVersion: 1;
  source: string;
  selectedTasks: ToeicWritingInventoryTask[];
  taskCounts: {
    "1": number;
    "2": number;
  };
  imageCount: number;
  knownImageBytes: number;
  unknownImageSizeCount: number;
  licenseReference: string;
  observedAt: string;
  inventorySha256: string;
};

export type ToeicWritingValidationResult = {
  valid: boolean;
  errors: string[];
};

export type ToeicWritingImageInspection = {
  bytes: number | null;
  contentType: string | null;
};

export type ToeicWritingSource = {
  listPartOneTasks(): Promise<ToeicWritingPartOneSourceTask[]>;
  listPartTwoTasks(): Promise<ToeicWritingPartTwoSourceTask[]>;
  inspectImage(url: string): Promise<ToeicWritingImageInspection>;
  downloadImage(url: string): Promise<ReadableStream<Uint8Array>>;
};

export type ToeicWritingStoredMedia = {
  storageKey: string;
  sha256: string;
  bytes: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  reused: boolean;
};

export type ToeicWritingStorage = {
  writeInventory(value: ToeicWritingInventory): Promise<string>;
  readInventory(sha256: string): Promise<ToeicWritingInventory>;
  writePackageFile(
    sourceTaskId: string,
    sourceVersion: string,
    name: string,
    value: unknown
  ): Promise<void>;
  readPackageFile(
    sourceTaskId: string,
    sourceVersion: string,
    name: string
  ): Promise<unknown>;
  writeMediaStream(input: {
    sourceTaskId: string;
    sourceVersion: string;
    stream: ReadableStream<Uint8Array>;
    expectedBytes: number | null;
    contentType: string | null;
  }): Promise<ToeicWritingStoredMedia>;
  listPackages(): Promise<
    Array<{ sourceTaskId: string; sourceVersion: string }>
  >;
};

export type ToeicWritingDownloadSummary = {
  completed: string[];
  resumed: string[];
  rejected: Array<{ sourceTaskId: string; errors: string[] }>;
  failed: Array<{ sourceTaskId: string; category: string }>;
};
