import { Injectable } from "@nestjs/common";
import type { ToeicReadingPart } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { toeicReadingDraftScope } from "../toeic-reading-draft.mapper";

@Injectable()
export class DeleteToeicReadingDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, testId: number, part?: ToeicReadingPart) {
    const result = await this.prisma.toeic_reading_drafts.deleteMany({
      where: {
        user_id: userId,
        test_id: testId,
        scope: toeicReadingDraftScope(part),
      },
    });
    return { deleted: result.count > 0 };
  }
}
