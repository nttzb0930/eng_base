import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ToeicReadingPracticeSummary } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class CompleteToeicReadingPracticeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    sessionId: number
  ): Promise<ToeicReadingPracticeSummary> {
    const session = await this.prisma.toeic_reading_practice_sessions.findFirst(
      {
        where: { id: sessionId, user_id: userId },
        select: {
          id: true,
          test_id: true,
          part: true,
          status: true,
          correct_count: true,
          incorrect_count: true,
          completed_at: true,
        },
      }
    );
    if (!session) {
      throw new NotFoundException("TOEIC Reading practice not found");
    }

    const [total, answered] = await Promise.all([
      this.prisma.toeic_questions.count({
        where: { test_id: session.test_id, part: session.part },
      }),
      this.prisma.toeic_reading_practice_answers.count({
        where: { session_id: sessionId },
      }),
    ]);
    if (answered !== total || total === 0) {
      throw new ConflictException(
        "Answer every TOEIC Reading practice question before completing"
      );
    }

    if (session.status === "COMPLETED" && session.completed_at) {
      return this.summary(sessionId, session, total, session.completed_at);
    }

    const completedAt = new Date();
    const updated = await this.prisma.toeic_reading_practice_sessions.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        active_key: null,
        completed_at: completedAt,
      },
      select: {
        correct_count: true,
        incorrect_count: true,
        completed_at: true,
      },
    });
    return this.summary(
      sessionId,
      updated,
      total,
      updated.completed_at ?? completedAt
    );
  }

  private async summary(
    sessionId: number,
    counts: { correct_count: number; incorrect_count: number },
    total: number,
    completedAt: Date
  ): Promise<ToeicReadingPracticeSummary> {
    const incorrect = await this.prisma.toeic_reading_practice_answers.findMany(
      {
        where: { session_id: sessionId, correct: false },
        orderBy: { answered_at: "asc" },
        select: { question_id_snapshot: true },
      }
    );
    return {
      sessionId,
      progress: {
        correct: counts.correct_count,
        incorrect: counts.incorrect_count,
        answered: counts.correct_count + counts.incorrect_count,
        total,
      },
      incorrectQuestionIds: incorrect.map(
        (answer) => answer.question_id_snapshot
      ),
      completedAt: completedAt.toISOString(),
    };
  }
}
