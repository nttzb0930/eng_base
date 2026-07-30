export const READING_CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export type ReadingCefrLevel = (typeof READING_CEFR_LEVELS)[number];

export const READING_PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type ReadingPublicationStatus =
  (typeof READING_PUBLICATION_STATUSES)[number];

export const READING_SOURCE_CANDIDATE_STATUSES = [
  "PENDING",
  "CONVERTED",
  "REJECTED",
] as const;

export type ReadingSourceCandidateStatus =
  (typeof READING_SOURCE_CANDIDATE_STATUSES)[number];
