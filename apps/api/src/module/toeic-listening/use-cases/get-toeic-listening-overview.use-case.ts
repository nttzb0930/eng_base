import { Injectable } from "@nestjs/common";
import type { ToeicListeningOverview } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  summarizeToeicListeningParts,
  TOEIC_LISTENING_PARTS,
} from "../toeic-listening.mapper";

@Injectable()
export class GetToeicListeningOverviewUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ToeicListeningOverview> {
    const tests = await this.prisma.toeic_tests.findMany({
      where: {
        listening_status: "PUBLISHED",
        listening_source_version: { not: null },
      },
      select: {
        id: true,
        toeic_questions: {
          where: { part: { in: [...TOEIC_LISTENING_PARTS] } },
          select: { part: true },
        },
      },
    });
    const questions = tests.flatMap((test) => test.toeic_questions);

    return {
      listeningAvailable: tests.length > 0,
      publishedTestCount: tests.length,
      totalQuestionCount: questions.length,
      parts: summarizeToeicListeningParts(questions),
    };
  }
}
