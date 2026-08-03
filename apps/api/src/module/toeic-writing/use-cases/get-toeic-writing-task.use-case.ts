import { Injectable } from "@nestjs/common";
import type { ToeicWritingTaskDetail } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { writingTaskNotFound } from "../toeic-writing.errors";
import { mapToeicWritingExercise } from "../toeic-writing.mapper";

@Injectable()
export class GetToeicWritingTaskUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    taskId: number
  ): Promise<ToeicWritingTaskDetail> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, status: "PUBLISHED" },
      select: {
        id: true,
        part: true,
        order_index: true,
        title: true,
        difficulty: true,
        source_version: true,
        instructions_en: true,
        instructions_vi: true,
        payload: true,
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
    if (!task) return writingTaskNotFound();
    return mapToeicWritingExercise(task);
  }
}
