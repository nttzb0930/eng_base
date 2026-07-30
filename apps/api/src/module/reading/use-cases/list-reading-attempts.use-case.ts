import { Injectable } from "@nestjs/common";
import type { ReadingCefrLevel } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapReadingAttemptSummary } from "../mappers/reading.mapper";

@Injectable()
export class ListReadingAttemptsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, level: ReadingCefrLevel) {
    return (
      await this.prisma.reading_attempts.findMany({
        where: {
          user_id: userId,
          reading_passages: { cefr_level: level },
        },
        orderBy: { submitted_at: "desc" },
        take: 50,
        select: {
          id: true,
          passage_id: true,
          passage_title_snapshot: true,
          correct_count: true,
          total_count: true,
          accuracy: true,
          submitted_at: true,
        },
      })
    ).map(mapReadingAttemptSummary);
  }
}
