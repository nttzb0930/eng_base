import type {
  ToeicWritingAiQuota,
  ToeicWritingAssistanceSnapshot,
} from "@repo/shared";

import type { WritingPictureContext } from "../provider/writing-ai-provider";

export class WritingAiDailyQuotaExceededError extends Error {}
export class WritingAiInFlightError extends Error {}
export class WritingAiIdempotencyConflictError extends Error {}
export class WritingAiReservationInvalidError extends Error {}

export type WritingGradeCacheKey = {
  userId: string;
  taskId: number;
  contentVersion: string;
  responseHash: string;
  promptVersion: string;
};

export type WritingQuotaReservationInput = {
  userId: string;
  feature: "TOEIC_WRITING";
  idempotencyKey: string;
  responseHash: string;
  dailyLimit: number;
  reservationTtlMs: number;
};

export type WritingQuotaReservation = {
  id: string;
  userId: string;
  usageDate: string;
};

export type SaveWritingAiGradeInput = WritingGradeCacheKey & {
  reservationId: string;
  responseText: string;
  part: 1 | 2;
  locale: "en" | "vi";
  model: string;
  rubricVersion: string;
  assistance: ToeicWritingAssistanceSnapshot;
  result: Record<string, unknown>;
  contextSource: "ENRICHED" | "DIRECT_IMAGE" | null;
};

export type WritingAiGradeRecord = SaveWritingAiGradeInput & {
  id: number;
  createdAt: Date;
};

export type PictureContextKey = {
  taskId: number;
  imageSha256: string;
  promptVersion: string;
};

export type WritingPictureContextRecord = PictureContextKey & {
  model: string;
  context: WritingPictureContext;
};

export type WritingAssistanceKey = {
  userId: string;
  taskId: number;
  contentVersion: string;
};

export type RecordWritingAssistanceInput = WritingAssistanceKey & {
  kind: "OUTLINE" | "VOCABULARY" | "SAMPLE" | "COMMUNITY_RESTORE";
};

export interface WritingAiRepository {
  reserveQuota(
    input: WritingQuotaReservationInput
  ): Promise<WritingQuotaReservation>;
  releaseQuota(reservationId: string): Promise<void>;
  getQuota(
    userId: string,
    feature: "TOEIC_WRITING",
    dailyLimit: number
  ): Promise<ToeicWritingAiQuota>;
  findOwnedCachedGrade(
    input: WritingGradeCacheKey
  ): Promise<WritingAiGradeRecord | null>;
  findOwnedGradeById(
    userId: string,
    gradeId: number
  ): Promise<WritingAiGradeRecord | null>;
  listOwnedGrades(
    userId: string,
    taskId: number,
    cursor: number | undefined,
    limit: number
  ): Promise<WritingAiGradeRecord[]>;
  saveGradeAndCompleteQuota(
    input: SaveWritingAiGradeInput
  ): Promise<WritingAiGradeRecord>;
  findPictureContext(
    input: PictureContextKey
  ): Promise<WritingPictureContextRecord | null>;
  savePictureContext(input: WritingPictureContextRecord): Promise<void>;
  recordAssistance(input: RecordWritingAssistanceInput): Promise<void>;
  getAssistanceSnapshot(
    input: WritingAssistanceKey
  ): Promise<ToeicWritingAssistanceSnapshot>;
}
