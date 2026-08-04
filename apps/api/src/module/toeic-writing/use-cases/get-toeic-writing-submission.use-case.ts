import { Injectable } from "@nestjs/common";
import type { ToeicWritingSubmissionResult } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { writingSubmissionNotFound } from "../toeic-writing.errors";
import { mapToeicWritingSubmissionResult } from "../toeic-writing.mapper";

@Injectable()
export class GetToeicWritingSubmissionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    submissionId: number
  ): Promise<ToeicWritingSubmissionResult> {
    const submission = await this.prisma.toeic_writing_submissions.findFirst({
      where: { id: submissionId, user_id: userId },
      select: {
        id: true,
        task_id: true,
        content_version: true,
        response_text: true,
        submitted_at: true,
        task_title: true,
        task_part: true,
        reference_snapshot: true,
      },
    });
    if (!submission) return writingSubmissionNotFound();
    return mapToeicWritingSubmissionResult(submission);
  }
}
