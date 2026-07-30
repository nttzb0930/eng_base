export const READING_CEFR_LEVELS = ["A1"] as const;

export type ReadingCefrLevel = (typeof READING_CEFR_LEVELS)[number];

export const READING_PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type ReadingPublicationStatus =
  (typeof READING_PUBLICATION_STATUSES)[number];
