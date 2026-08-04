import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { writingTaskNotFound } from "../toeic-writing.errors";

@Injectable()
export class DeleteToeicWritingDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, taskId: number): Promise<{ deleted: boolean }> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!task) return writingTaskNotFound();

    const result = await this.prisma.toeic_writing_drafts.deleteMany({
      where: { user_id: userId, task_id: taskId },
    });
    return { deleted: result.count > 0 };
  }
}
