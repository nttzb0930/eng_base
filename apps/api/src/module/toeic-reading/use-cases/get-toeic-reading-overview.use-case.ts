import { Injectable } from "@nestjs/common";
import type { ToeicReadingOverview } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicReadingAttemptSummary,
  summarizeToeicReadingParts,
} from "../toeic-reading.mapper";

@Injectable()
export class GetToeicReadingOverviewUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<ToeicReadingOverview> {
    const [tests, attempts] = await Promise.all([
      this.prisma.toeic_tests.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { id: "asc" },
        select: {
          id: true,
          toeic_questions: {
            orderBy: { number: "asc" },
            select: { part: true },
          },
        },
      }),
      this.prisma.toeic_reading_attempts.findMany({
        where: { user_id: userId },
        orderBy: [{ submitted_at: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          test_id: true,
          practice_part: true,
          test_title_snapshot: true,
          correct_count: true,
          total_count: true,
          accuracy: true,
          submitted_at: true,
        },
      }),
    ]);
    const questions = tests.flatMap((test) => test.toeic_questions);

    return {
      readingAvailable: tests.length > 0,
      listeningAvailable: false,
      publishedTestCount: tests.length,
      totalQuestionCount: questions.length,
      parts: summarizeToeicReadingParts(questions),
      recentAttempts: attempts.map(mapToeicReadingAttemptSummary),
    };
  }
}
