import { Injectable } from "@nestjs/common";
import type { ReadingTopicOption } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class ListReadingTopicOptionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(): Promise<ReadingTopicOption[]> {
    return this.prisma.vocabulary_topics.findMany({
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    });
  }
}
