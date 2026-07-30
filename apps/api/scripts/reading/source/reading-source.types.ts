export type ReadingSourceAccessClassification =
  | "BASIC_FREE"
  | "EXCLUDED_NOT_FREE"
  | "EXCLUDED_HIDDEN";

export type ReadingSourceAccess = {
  isFree: boolean;
  isHidden: boolean;
  classification: ReadingSourceAccessClassification;
};

export type ReadingSourceChoice = {
  label: string;
  text: string;
};

export type ReadingSourceQuestion = {
  question: string;
  choices: ReadingSourceChoice[];
  correct: string;
  explanation: string;
  translation: string;
};

export type ReadingSourceRow = {
  sourceId: string;
  title: string;
  topic: string | null;
  sourceLevel: "1" | "2";
  order: number;
  contentHtml: string;
  questions: ReadingSourceQuestion[];
  vocabulary: unknown[];
  access: ReadingSourceAccess;
  updatedAt: string;
};

export type CanonicalReadingSourceMedia = {
  id: string;
  sourceUrl: string;
  storageKey: string;
  sha256: string;
  bytes: number;
  mimeType: string;
};

export type CanonicalReadingSourcePackage = {
  schemaVersion: 1;
  source: "dautoeic";
  sourceId: string;
  sourceVersion: string;
  sourceLevel: "1" | "2";
  title: string;
  sourceTopic: string | null;
  order: number;
  sourceHtml: string;
  plainTextDraft: string;
  questions: ReadingSourceQuestion[];
  vocabulary: unknown[];
  embeddedMedia: CanonicalReadingSourceMedia[];
};

export type ReadingSourceAccessSummary = {
  sourceId: string;
  sourceLevel: "1" | "2";
  isFree: boolean;
  isHidden: boolean;
};

export type ReadingSourceImageInspection = {
  url: string;
  bytes: number | null;
  mimeType: string | null;
};

export type ReadingSourceInventory = {
  schemaVersion: 1;
  source: "dautoeic";
  createdAt: string;
  visibleCount: number;
  acceptedCount: number;
  excludedNotFreeCount: number;
  excludedHiddenCount: number;
  sourceLevelCounts: Record<"1" | "2", number>;
  questionCount: number;
  embeddedImageCount: number;
  knownImageBytes: number;
  unknownImageSizeCount: number;
  acceptedSourceIds: string[];
  inventorySha256: string;
};

export interface DautoeicReadingSource {
  listAccessSummaries(): Promise<ReadingSourceAccessSummary[]>;
  listReadingRows(): Promise<ReadingSourceRow[]>;
  inspectEmbeddedImage(url: string): Promise<ReadingSourceImageInspection>;
  openEmbeddedImage(url: string): Promise<Response>;
}

export interface ReadingSourceStorage {
  writeInventory(inventory: ReadingSourceInventory): Promise<string>;
  readApprovedInventory(sha256: string): Promise<ReadingSourceInventory>;
  writePackageFile(
    sourceId: string,
    sourceVersion: string,
    name: "content.json" | "manifest.json" | "validation.json",
    value: unknown,
  ): Promise<void>;
  writeMedia(input: {
    sourceId: string;
    sourceVersion: string;
    mediaId: string;
    response: Response;
  }): Promise<{
    storageKey: string;
    bytes: number;
    sha256: string;
    mimeType: string;
  }>;
  packageExists(sourceId: string, sourceVersion: string): Promise<boolean>;
}
