import { Injectable } from "@nestjs/common";
import type { ReadingCefrLevel } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapReadingPassageSummary } from "../mappers/reading.mapper";

@Injectable()
export class ListReadingPassagesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, level: ReadingCefrLevel) {
    const passages = await this.prisma.reading_passages.findMany({
      where: { cefr_level: level, status: "PUBLISHED" },
      orderBy: { published_at: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        cefr_level: true,
        estimated_minutes: true,
        vocabulary_topics: { select: { title: true } },
        _count: { select: { reading_questions: true } },
        reading_attempts: {
          where: { user_id: userId },
          orderBy: { submitted_at: "desc" },
          take: 1,
          select: {
            id: true,
            passage_id: true,
            passage_title_snapshot: true,
            correct_count: true,
            total_count: true,
            accuracy: true,
            submitted_at: true,
          },
        },
      },
    });
    return passages.map(mapReadingPassageSummary);
  }
}
