import { Injectable } from "@nestjs/common";
import type { ToeicWritingDraft } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { writingTaskNotFound } from "../toeic-writing.errors";

type DraftRecord = {
  id: number;
  task_id: number;
  content_version: string;
  response_text: string;
  updated_at: Date;
};

export function mapToeicWritingDraft(record: DraftRecord): ToeicWritingDraft {
  return {
    id: record.id,
    taskId: record.task_id,
    contentVersion: record.content_version,
    responseText: record.response_text,
    updatedAt: record.updated_at.toISOString(),
  };
}

@Injectable()
export class GetToeicWritingDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    taskId: number
  ): Promise<ToeicWritingDraft | null> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!task) return writingTaskNotFound();

    const draft = await this.prisma.toeic_writing_drafts.findUnique({
      where: { user_id_task_id: { user_id: userId, task_id: taskId } },
      select: {
        id: true,
        task_id: true,
        content_version: true,
        response_text: true,
        updated_at: true,
      },
    });
    return draft ? mapToeicWritingDraft(draft) : null;
  }
}
