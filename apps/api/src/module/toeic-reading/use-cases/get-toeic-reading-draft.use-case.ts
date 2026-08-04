import { Injectable } from "@nestjs/common";
import type { ToeicReadingDraft, ToeicReadingPart } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicReadingDraft,
  toeicReadingDraftScope,
} from "../toeic-reading-draft.mapper";

@Injectable()
export class GetToeicReadingDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    testId: number,
    part?: ToeicReadingPart
  ): Promise<ToeicReadingDraft | null> {
    const scope = toeicReadingDraftScope(part);
    const draft = await this.prisma.toeic_reading_drafts.findUnique({
      where: {
        user_id_test_id_scope: {
          user_id: userId,
          test_id: testId,
          scope,
        },
      },
      include: {
        toeic_tests: {
          select: { source_version: true, status: true },
        },
      },
    });
    if (!draft) return null;

    const invalid =
      draft.expires_at.getTime() <= Date.now() ||
      draft.toeic_tests.status !== "PUBLISHED" ||
      draft.source_version !== draft.toeic_tests.source_version;
    if (invalid) {
      await this.prisma.toeic_reading_drafts.deleteMany({
        where: { user_id: userId, test_id: testId, scope },
      });
      return null;
    }

    return mapToeicReadingDraft(draft);
  }
}
