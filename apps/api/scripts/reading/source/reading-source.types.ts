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
