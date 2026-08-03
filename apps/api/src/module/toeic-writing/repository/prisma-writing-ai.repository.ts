import { Prisma } from "@prisma/client";

import type { ToeicWritingAssistanceSnapshot } from "@repo/shared";

import {
  WritingAiDailyQuotaExceededError,
  WritingAiIdempotencyConflictError,
  WritingAiInFlightError,
  WritingAiReservationInvalidError,
} from "./writing-ai.repository";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { writingPictureContextSchema } from "../provider/writing-ai.schemas";
import type {
  PictureContextKey,
  RecordWritingAssistanceInput,
  SaveWritingAiGradeInput,
  WritingAiGradeRecord,
  WritingAiRepository,
  WritingAssistanceKey,
  WritingGradeCacheKey,
  WritingPictureContextRecord,
  WritingQuotaReservationInput,
} from "./writing-ai.repository";

function usageDateFor(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toGradeRecord(row: {
  id: number;
  user_id: string;
  task_id: number;
  content_version: string;
  response_text: string;
  response_hash: string;
  prompt_version: string;
  part: number;
  locale: string;
  model: string;
  rubric_version: string;
  assistance: Prisma.JsonValue;
  result: Prisma.JsonValue;
  context_source: string | null;
  created_at: Date;
}): WritingAiGradeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    contentVersion: row.content_version,
    responseText: row.response_text,
    responseHash: row.response_hash,
    promptVersion: row.prompt_version,
    reservationId: "",
    part: row.part as 1 | 2,
    locale: row.locale as "en" | "vi",
    model: row.model,
    rubricVersion: row.rubric_version,
    assistance: row.assistance as ToeicWritingAssistanceSnapshot,
    result: row.result as Record<string, unknown>,
    contextSource: row.context_source as "ENRICHED" | "DIRECT_IMAGE" | null,
    createdAt: row.created_at,
  };
}

export class PrismaWritingAiRepository implements WritingAiRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date()
  ) {}

  async reserveQuota(input: WritingQuotaReservationInput) {
    return this.prisma.$transaction(async (transaction) => {
      const now = this.now();
      const usageDate = usageDateFor(now);
      const expiresAt = new Date(now.getTime() + input.reservationTtlMs);

      await transaction.$executeRaw(Prisma.sql`
        WITH released AS (
          UPDATE "ai_usage_reservations"
          SET "status" = 'RELEASED', "released_at" = ${now}
          WHERE "user_id" = ${input.userId}::uuid
            AND "feature" = ${input.feature}
            AND "status" = 'RESERVED'
            AND "expires_at" <= ${now}
          RETURNING "usage_date"
        ), released_counts AS (
          SELECT "usage_date", COUNT(*)::integer AS "count"
          FROM released
          GROUP BY "usage_date"
        )
        UPDATE "ai_usage_daily" AS daily
        SET "reserved" = GREATEST(0, daily."reserved" - released_counts."count"),
            "updated_at" = ${now}
        FROM released_counts
        WHERE daily."user_id" = ${input.userId}::uuid
          AND daily."feature" = ${input.feature}
          AND daily."usage_date" = released_counts."usage_date"
      `);

      const existing = await transaction.ai_usage_reservations.findUnique({
        where: {
          user_id_idempotency_key: {
            user_id: input.userId,
            idempotency_key: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.response_hash !== input.responseHash) {
          throw new WritingAiIdempotencyConflictError(
            "Writing AI idempotency key conflicts with another response"
          );
        }
        if (existing.status === "COMPLETED") {
          return {
            id: existing.id,
            userId: existing.user_id,
            usageDate: dateKey(existing.usage_date),
          };
        }
        if (existing.status === "RESERVED") {
          throw new WritingAiInFlightError(
            "Writing AI request is already in flight"
          );
        }
      }

      await transaction.ai_usage_daily.upsert({
        where: {
          user_id_feature_usage_date: {
            user_id: input.userId,
            feature: input.feature,
            usage_date: usageDate,
          },
        },
        create: {
          user_id: input.userId,
          feature: input.feature,
          usage_date: usageDate,
        },
        update: {},
      });

      const claimed = await transaction.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`
          UPDATE "ai_usage_daily"
          SET "reserved" = "reserved" + 1, "updated_at" = ${now}
          WHERE "user_id" = ${input.userId}::uuid
            AND "feature" = ${input.feature}
            AND "usage_date" = ${usageDate}::date
            AND "reserved" + "used" < ${input.dailyLimit}
          RETURNING "id"
        `
      );
      if (claimed.length === 0) {
        throw new WritingAiDailyQuotaExceededError(
          "Writing AI daily quota exceeded"
        );
      }

      try {
        if (existing) {
          const reactivated =
            await transaction.ai_usage_reservations.updateMany({
              where: { id: existing.id, status: "RELEASED" },
              data: {
                usage_date: usageDate,
                status: "RESERVED",
                expires_at: expiresAt,
                released_at: null,
                completed_at: null,
              },
            });
          if (reactivated.count !== 1) {
            throw new WritingAiInFlightError(
              "Writing AI request is already in flight"
            );
          }
          return {
            id: existing.id,
            userId: existing.user_id,
            usageDate: dateKey(usageDate),
          };
        }

        const reservation = await transaction.ai_usage_reservations.create({
          data: {
            user_id: input.userId,
            feature: input.feature,
            idempotency_key: input.idempotencyKey,
            response_hash: input.responseHash,
            usage_date: usageDate,
            status: "RESERVED",
            expires_at: expiresAt,
          },
        });
        return {
          id: reservation.id,
          userId: reservation.user_id,
          usageDate: dateKey(reservation.usage_date),
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new WritingAiInFlightError(
            "Writing AI request is already in flight"
          );
        }
        throw error;
      }
    });
  }

  async releaseQuota(reservationId: string) {
    await this.prisma.$transaction(async (transaction) => {
      const reservation = await transaction.ai_usage_reservations.findUnique({
        where: { id: reservationId },
      });
      if (!reservation || reservation.status !== "RESERVED") return;

      await transaction.ai_usage_reservations.update({
        where: { id: reservationId },
        data: { status: "RELEASED", released_at: this.now() },
      });
      await transaction.ai_usage_daily.updateMany({
        where: {
          user_id: reservation.user_id,
          feature: reservation.feature,
          usage_date: reservation.usage_date,
          reserved: { gt: 0 },
        },
        data: { reserved: { decrement: 1 } },
      });
    });
  }

  async getQuota(userId: string, feature: "TOEIC_WRITING", dailyLimit: number) {
    const now = this.now();
    const usageDate = usageDateFor(now);
    const state = await this.prisma.ai_usage_daily.findUnique({
      where: {
        user_id_feature_usage_date: {
          user_id: userId,
          feature,
          usage_date: usageDate,
        },
      },
      select: { reserved: true, used: true },
    });
    return {
      dailyLimit,
      used: state?.used ?? 0,
      remaining: Math.max(
        0,
        dailyLimit - (state?.used ?? 0) - (state?.reserved ?? 0)
      ),
      resetAt: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      ).toISOString(),
    };
  }

  async findOwnedCachedGrade(input: WritingGradeCacheKey) {
    const row = await this.prisma.toeic_writing_ai_grades.findUnique({
      where: {
        user_id_task_id_content_version_response_hash_prompt_version: {
          user_id: input.userId,
          task_id: input.taskId,
          content_version: input.contentVersion,
          response_hash: input.responseHash,
          prompt_version: input.promptVersion,
        },
      },
    });
    return row ? toGradeRecord(row) : null;
  }

  async findOwnedGradeById(userId: string, gradeId: number) {
    const row = await this.prisma.toeic_writing_ai_grades.findFirst({
      where: { id: gradeId, user_id: userId },
    });
    return row ? toGradeRecord(row) : null;
  }

  async listOwnedGrades(
    userId: string,
    taskId: number,
    cursor: number | undefined,
    limit: number
  ) {
    const rows = await this.prisma.toeic_writing_ai_grades.findMany({
      where: {
        user_id: userId,
        task_id: taskId,
        ...(cursor === undefined ? {} : { id: { lt: cursor } }),
      },
      orderBy: { id: "desc" },
      take: limit + 1,
    });
    return rows.map(toGradeRecord);
  }

  async saveGradeAndCompleteQuota(input: SaveWritingAiGradeInput) {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.toeic_writing_ai_grades.findUnique({
        where: {
          user_id_task_id_content_version_response_hash_prompt_version: {
            user_id: input.userId,
            task_id: input.taskId,
            content_version: input.contentVersion,
            response_hash: input.responseHash,
            prompt_version: input.promptVersion,
          },
        },
      });
      if (existing) return toGradeRecord(existing);

      const reservation = await transaction.ai_usage_reservations.findUnique({
        where: { id: input.reservationId },
      });
      if (
        !reservation ||
        reservation.status !== "RESERVED" ||
        reservation.user_id !== input.userId ||
        reservation.response_hash !== input.responseHash
      ) {
        throw new WritingAiReservationInvalidError(
          "Writing AI reservation is invalid"
        );
      }

      const grade = await transaction.toeic_writing_ai_grades.create({
        data: {
          user_id: input.userId,
          task_id: input.taskId,
          content_version: input.contentVersion,
          response_text: input.responseText,
          response_hash: input.responseHash,
          prompt_version: input.promptVersion,
          part: input.part,
          locale: input.locale,
          model: input.model,
          rubric_version: input.rubricVersion,
          assistance: toJson(input.assistance),
          result: toJson(input.result),
          context_source: input.contextSource,
        },
      });
      await transaction.ai_usage_reservations.update({
        where: { id: reservation.id },
        data: { status: "COMPLETED", completed_at: this.now() },
      });
      const usage = await transaction.ai_usage_daily.updateMany({
        where: {
          user_id: reservation.user_id,
          feature: reservation.feature,
          usage_date: reservation.usage_date,
          reserved: { gt: 0 },
        },
        data: { reserved: { decrement: 1 }, used: { increment: 1 } },
      });
      if (usage.count !== 1) {
        throw new WritingAiReservationInvalidError(
          "Writing AI quota counters are invalid"
        );
      }
      return toGradeRecord(grade);
    });
  }

  async findPictureContext(input: PictureContextKey) {
    const row = await this.prisma.toeic_writing_image_contexts.findUnique({
      where: {
        task_id_image_sha256_prompt_version: {
          task_id: input.taskId,
          image_sha256: input.imageSha256,
          prompt_version: input.promptVersion,
        },
      },
    });
    return row
      ? {
          taskId: row.task_id,
          imageSha256: row.image_sha256,
          promptVersion: row.prompt_version,
          model: row.model,
          context: writingPictureContextSchema.parse(row.context),
        }
      : null;
  }

  async savePictureContext(input: WritingPictureContextRecord) {
    await this.prisma.toeic_writing_image_contexts.upsert({
      where: {
        task_id_image_sha256_prompt_version: {
          task_id: input.taskId,
          image_sha256: input.imageSha256,
          prompt_version: input.promptVersion,
        },
      },
      create: {
        task_id: input.taskId,
        image_sha256: input.imageSha256,
        prompt_version: input.promptVersion,
        model: input.model,
        context: toJson(input.context),
      },
      update: { model: input.model, context: toJson(input.context) },
    });
  }

  async recordAssistance(input: RecordWritingAssistanceInput) {
    await this.prisma.toeic_writing_assistance_events.upsert({
      where: {
        user_id_task_id_content_version_kind: {
          user_id: input.userId,
          task_id: input.taskId,
          content_version: input.contentVersion,
          kind: input.kind,
        },
      },
      create: {
        user_id: input.userId,
        task_id: input.taskId,
        content_version: input.contentVersion,
        kind: input.kind,
      },
      update: {},
    });
  }

  async getAssistanceSnapshot(input: WritingAssistanceKey) {
    const rows = await this.prisma.toeic_writing_assistance_events.findMany({
      where: {
        user_id: input.userId,
        task_id: input.taskId,
        content_version: input.contentVersion,
      },
      select: { kind: true },
    });
    const kinds = new Set(rows.map(({ kind }) => kind));
    return {
      outlineViewed: kinds.has("OUTLINE"),
      vocabularyViewed: kinds.has("VOCABULARY"),
      sampleViewed: kinds.has("SAMPLE"),
      communityAnswerRestored: kinds.has("COMMUNITY_RESTORE"),
    };
  }
}
