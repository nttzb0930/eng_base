import type { PrismaService } from "../../../database/prisma/prisma.service";
import { writingTaskNotFound } from "../toeic-writing.errors";
import type { WritingCoachingTaskSource } from "../use-cases/get-toeic-writing-coaching.use-case";

export class PrismaWritingCoachingTaskSource
  implements WritingCoachingTaskSource
{
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedCoachingTask(taskId: number) {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, status: "PUBLISHED" },
      select: {
        id: true,
        part: true,
        source_version: true,
        payload: true,
      },
    });
    if (!task) return writingTaskNotFound();
    return {
      id: task.id,
      part: task.part,
      contentVersion: task.source_version,
      payload: task.payload,
    };
  }
}
