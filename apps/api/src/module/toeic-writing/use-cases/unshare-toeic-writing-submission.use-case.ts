import { Injectable } from "@nestjs/common";
import type { ToeicWritingSubmissionShareResult } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { writingSubmissionNotFound } from "../toeic-writing.errors";

@Injectable()
export class UnshareToeicWritingSubmissionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(
    userId: string,
    submissionId: number
  ): Promise<ToeicWritingSubmissionShareResult> {
    const result = await this.prisma.toeic_writing_submissions.updateMany({
      where: { id: submissionId, user_id: userId, task_part: 2 },
      data: { share_revoked_at: this.now() },
    });
    if (result.count !== 1) return writingSubmissionNotFound();
    return { shared: false };
  }
}
