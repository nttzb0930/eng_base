import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ToeicReadingPracticeUpdatePayload } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class UpdateToeicReadingPracticeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    sessionId: number,
    payload: ToeicReadingPracticeUpdatePayload
  ) {
    const session = await this.prisma.toeic_reading_practice_sessions.findFirst(
      {
        where: { id: sessionId, user_id: userId },
        select: { id: true, test_id: true, part: true, status: true },
      }
    );
    if (!session) {
      throw new NotFoundException("TOEIC Reading practice not found");
    }
    if (session.status !== "ACTIVE") {
      throw new ConflictException("TOEIC Reading practice is already complete");
    }

    const requestedIds = Array.from(
      new Set([payload.activeQuestionId, ...payload.reviewQuestionIds])
    );
    const ownedQuestions = await this.prisma.toeic_questions.findMany({
      where: {
        id: { in: requestedIds },
        test_id: session.test_id,
        part: session.part,
      },
      select: { id: true },
    });
    if (ownedQuestions.length !== requestedIds.length) {
      throw new BadRequestException(
        "Navigation question does not belong to this TOEIC Reading practice"
      );
    }

    const updated = await this.prisma.toeic_reading_practice_sessions.update({
      where: { id: sessionId },
      data: {
        active_question_id: payload.activeQuestionId,
        review_question_ids: payload.reviewQuestionIds,
      },
      select: {
        active_question_id: true,
        review_question_ids: true,
        updated_at: true,
      },
    });
    return {
      activeQuestionId: updated.active_question_id,
      reviewQuestionIds: updated.review_question_ids,
      updatedAt: updated.updated_at.toISOString(),
    };
  }
}
