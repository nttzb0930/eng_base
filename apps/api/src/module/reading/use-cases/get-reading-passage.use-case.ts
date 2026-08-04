import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapReadingPassageDetail } from "../mappers/reading.mapper";

@Injectable()
export class GetReadingPassageUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(slug: string) {
    const passage = await this.prisma.reading_passages.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        body: true,
        cefr_level: true,
        estimated_minutes: true,
        vocabulary_topics: { select: { title: true } },
        reading_questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            prompt: true,
            order: true,
            reading_options: {
              orderBy: { order: "asc" },
              select: { id: true, text: true, order: true },
            },
          },
        },
      },
    });
    if (!passage) throw new NotFoundException("Reading passage not found");
    return mapReadingPassageDetail(passage);
  }
}
