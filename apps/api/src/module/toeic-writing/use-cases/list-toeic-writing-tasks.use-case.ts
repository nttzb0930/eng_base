import { Injectable } from "@nestjs/common";
import type { ToeicWritingPart, ToeicWritingTaskSummary } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicWritingTaskSummary } from "../toeic-writing.mapper";

@Injectable()
export class ListToeicWritingTasksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    part: ToeicWritingPart
  ): Promise<ToeicWritingTaskSummary[]> {
    const tasks = await this.prisma.toeic_writing_tasks.findMany({
      where: { status: "PUBLISHED", part },
      orderBy: [{ order_index: "asc" }, { id: "asc" }],
      select: {
        id: true,
        part: true,
        order_index: true,
        title: true,
        difficulty: true,
        source_version: true,
        drafts: {
          where: { user_id: userId },
          take: 1,
          select: { id: true },
        },
        submissions: {
          where: { user_id: userId },
          take: 1,
          select: { id: true },
        },
      },
    });
    return tasks.map(mapToeicWritingTaskSummary);
  }
}
