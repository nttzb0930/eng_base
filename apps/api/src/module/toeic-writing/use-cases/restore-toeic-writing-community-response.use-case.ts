import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { WritingAiRepository } from "../repository/writing-ai.repository";
import {
  writingContentVersionConflict,
  writingSubmissionNotFound,
  writingTaskNotFound,
} from "../toeic-writing.errors";

@Injectable()
export class RestoreToeicWritingCommunityResponseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: Pick<WritingAiRepository, "recordAssistance">
  ) {}

  async execute(
    userId: string,
    taskId: number,
    submissionId: number,
    contentVersion: string
  ): Promise<{ responseText: string }> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, part: 2, status: "PUBLISHED" },
      select: { id: true, source_version: true },
    });
    if (!task) return writingTaskNotFound();
    if (task.source_version !== contentVersion) {
      return writingContentVersionConflict();
    }
    const submission = await this.prisma.toeic_writing_submissions.findFirst({
      where: {
        id: submissionId,
        task_id: taskId,
        shared_at: { not: null },
        share_revoked_at: null,
      },
      select: { response_text: true },
    });
    if (!submission) return writingSubmissionNotFound();

    await this.repository.recordAssistance({
      userId,
      taskId,
      contentVersion,
      kind: "COMMUNITY_RESTORE",
    });
    return { responseText: submission.response_text };
  }
}
