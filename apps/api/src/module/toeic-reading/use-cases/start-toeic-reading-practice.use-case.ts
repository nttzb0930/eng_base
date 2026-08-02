import { createHash } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ToeicReadingPracticeSession,
  ToeicReadingPracticeStartPayload,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicReadingPracticeUseCase } from "./get-toeic-reading-practice.use-case";

@Injectable()
export class StartToeicReadingPracticeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getPractice: GetToeicReadingPracticeUseCase
  ) {}

  async execute(
    userId: string,
    payload: ToeicReadingPracticeStartPayload
  ): Promise<ToeicReadingPracticeSession> {
    const test = await this.prisma.toeic_tests.findFirst({
      where: { id: payload.testId, status: "PUBLISHED" },
      select: {
        id: true,
        source_version: true,
        toeic_questions: {
          where: { part: payload.part },
          orderBy: { number: "asc" },
          select: { id: true },
        },
      },
    });
    if (!test) throw new NotFoundException("TOEIC Reading test not found");
    if (test.source_version !== payload.sourceVersion) {
      throw new ConflictException(
        "TOEIC Reading test changed; reload before practicing"
      );
    }
    const firstQuestion = test.toeic_questions[0];
    if (!firstQuestion) {
      throw new NotFoundException("TOEIC Reading Part not found");
    }

    const activeKey = createHash("sha256")
      .update(
        `${userId}:${payload.testId}:${payload.part}:${payload.sourceVersion}`
      )
      .digest("hex");
    const existing =
      await this.prisma.toeic_reading_practice_sessions.findUnique({
        where: { active_key: activeKey },
        select: { id: true },
      });
    if (existing) return this.getPractice.execute(userId, existing.id);

    try {
      const created = await this.prisma.toeic_reading_practice_sessions.create({
        data: {
          user_id: userId,
          test_id: payload.testId,
          part: payload.part,
          source_version: payload.sourceVersion,
          status: "ACTIVE",
          active_key: activeKey,
          active_question_id: firstQuestion.id,
          review_question_ids: [],
        },
        select: { id: true },
      });
      return this.getPractice.execute(userId, created.id);
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const winner =
        await this.prisma.toeic_reading_practice_sessions.findUnique({
          where: { active_key: activeKey },
          select: { id: true },
        });
      if (!winner) throw error;
      return this.getPractice.execute(userId, winner.id);
    }
  }
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
