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
  | ToeicWritingPartOneCanonicalTask
  | ToeicWritingPartTwoCanonicalTask;

export type ToeicWritingInventoryTask = {
  sourceTaskId: string;
  part: 1 | 2;
  order: number;
  title: string;
  difficulty: ToeicWritingCanonicalDifficulty;
  sourceVersion: string;
  imageBytes: number | null;
  imageContentType: string | null;
};

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
  observedAt: string;
  inventorySha256: string;
};

export type ToeicWritingValidationResult = {
  valid: boolean;
  errors: string[];
};
