import { randomUUID } from "node:crypto";

import type { ToeicWritingAssistanceSnapshot } from "@repo/shared";

import type {
  PictureContextKey,
  RecordWritingAssistanceInput,
  SaveWritingAiGradeInput,
  WritingAiGradeRecord,
  WritingAiRepository,
  WritingAssistanceKey,
  WritingGradeCacheKey,
  WritingPictureContextRecord,
  WritingQuotaReservation,
  WritingQuotaReservationInput,
} from "../../repository/writing-ai.repository";

type ReservationState = WritingQuotaReservation & {
  feature: "TOEIC_WRITING";
  idempotencyKey: string;
  responseHash: string;
  status: "RESERVED" | "COMPLETED" | "RELEASED";
  createdAt: Date;
  expiresAt: Date;
};

type DailyState = { reserved: number; used: number };

function gradeKey(input: WritingGradeCacheKey): string {
  return [
    input.userId,
    input.taskId,
    input.contentVersion,
    input.responseHash,
    input.promptVersion,
  ].join(":");
}

function pictureKey(input: PictureContextKey): string {
  return [input.taskId, input.imageSha256, input.promptVersion].join(":");
}

function assistanceKey(input: WritingAssistanceKey): string {
  return [input.userId, input.taskId, input.contentVersion].join(":");
}

export class InMemoryWritingAiRepository implements WritingAiRepository {
  private readonly reservations = new Map<string, ReservationState>();
  private readonly idempotency = new Map<string, string>();
  private readonly daily = new Map<string, DailyState>();
  private readonly grades = new Map<string, WritingAiGradeRecord>();
  private readonly contexts = new Map<string, WritingPictureContextRecord>();
  private readonly assistance = new Map<
    string,
    Set<RecordWritingAssistanceInput["kind"]>
  >();
  private gradeSequence = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async reserveQuota(input: WritingQuotaReservationInput) {
    this.releaseExpired(input.userId, input.feature);
    const idempotencyKey = `${input.userId}:${input.idempotencyKey}`;
    const existingId = this.idempotency.get(idempotencyKey);
    if (existingId) {
      const existing = this.reservations.get(existingId)!;
      if (existing.responseHash !== input.responseHash) {
        throw new Error(
          "Writing AI idempotency key conflicts with another response"
        );
      }
      return this.toReservation(existing);
    }

    const active = [...this.reservations.values()].find(
      (reservation) =>
        reservation.userId === input.userId &&
        reservation.feature === input.feature &&
        reservation.status === "RESERVED"
    );
    if (active) throw new Error("Writing AI request is already in flight");

    const now = this.now();
    const usageDate = now.toISOString().slice(0, 10);
    const dailyKey = `${input.userId}:${input.feature}:${usageDate}`;
    const daily = this.daily.get(dailyKey) ?? { reserved: 0, used: 0 };
    if (daily.reserved + daily.used >= input.dailyLimit) {
      throw new Error("Writing AI daily quota exceeded");
    }

    const state: ReservationState = {
      id: randomUUID(),
      userId: input.userId,
      usageDate,
      feature: input.feature,
      idempotencyKey: input.idempotencyKey,
      responseHash: input.responseHash,
      status: "RESERVED",
      createdAt: now,
      expiresAt: new Date(now.getTime() + input.reservationTtlMs),
    };
    daily.reserved += 1;
    this.daily.set(dailyKey, daily);
    this.reservations.set(state.id, state);
    this.idempotency.set(idempotencyKey, state.id);
    return this.toReservation(state);
  }

  async releaseQuota(reservationId: string) {
    const reservation = this.reservations.get(reservationId);
    if (!reservation || reservation.status !== "RESERVED") return;
    reservation.status = "RELEASED";
    this.decrementReserved(reservation);
  }

  async findOwnedCachedGrade(input: WritingGradeCacheKey) {
    return this.grades.get(gradeKey(input)) ?? null;
  }

  async saveGradeAndCompleteQuota(input: SaveWritingAiGradeInput) {
    const key = gradeKey(input);
    const existing = this.grades.get(key);
    if (existing) return existing;
    const reservation = this.reservations.get(input.reservationId);
    if (
      !reservation ||
      reservation.status !== "RESERVED" ||
      reservation.userId !== input.userId ||
      reservation.responseHash !== input.responseHash
    ) {
      throw new Error("Writing AI reservation is invalid");
    }

    const record: WritingAiGradeRecord = {
      ...input,
      id: ++this.gradeSequence,
      createdAt: this.now(),
    };
    this.grades.set(key, record);
    reservation.status = "COMPLETED";
    const daily = this.daily.get(
      `${reservation.userId}:${reservation.feature}:${reservation.usageDate}`
    )!;
    daily.reserved -= 1;
    daily.used += 1;
    return record;
  }

  async findPictureContext(input: PictureContextKey) {
    return this.contexts.get(pictureKey(input)) ?? null;
  }

  async savePictureContext(input: WritingPictureContextRecord) {
    this.contexts.set(pictureKey(input), input);
  }

  async recordAssistance(input: RecordWritingAssistanceInput) {
    const key = assistanceKey(input);
    const kinds = this.assistance.get(key) ?? new Set();
    kinds.add(input.kind);
    this.assistance.set(key, kinds);
  }

  async getAssistanceSnapshot(input: WritingAssistanceKey) {
    const kinds = this.assistance.get(assistanceKey(input)) ?? new Set();
    return {
      outlineViewed: kinds.has("OUTLINE"),
      vocabularyViewed: kinds.has("VOCABULARY"),
      sampleViewed: kinds.has("SAMPLE"),
      communityAnswerRestored: kinds.has("COMMUNITY_RESTORE"),
    } satisfies ToeicWritingAssistanceSnapshot;
  }

  private releaseExpired(userId: string, feature: "TOEIC_WRITING") {
    const now = this.now();
    for (const reservation of this.reservations.values()) {
      if (
        reservation.userId === userId &&
        reservation.feature === feature &&
        reservation.status === "RESERVED" &&
        reservation.expiresAt <= now
      ) {
        reservation.status = "RELEASED";
        this.decrementReserved(reservation);
      }
    }
  }

  private decrementReserved(reservation: ReservationState) {
    const daily = this.daily.get(
      `${reservation.userId}:${reservation.feature}:${reservation.usageDate}`
    );
    if (daily) daily.reserved = Math.max(0, daily.reserved - 1);
  }

  private toReservation(state: ReservationState): WritingQuotaReservation {
    return { id: state.id, userId: state.userId, usageDate: state.usageDate };
  }
}
