import { Injectable } from "@nestjs/common";
import type { ToeicListeningDraft, ToeicListeningPart } from "@repo/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicListeningDraft,
  toeicListeningDraftScope,
} from "../toeic-listening-draft.mapper";
@Injectable()
export class GetToeicListeningDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(
    userId: string,
    testId: number,
    part?: ToeicListeningPart
  ): Promise<ToeicListeningDraft | null> {
    const scope = toeicListeningDraftScope(part);
    const draft = await this.prisma.toeic_listening_drafts.findUnique({
      where: {
        user_id_test_id_scope: { user_id: userId, test_id: testId, scope },
      },
      include: {
        toeic_tests: {
          select: { listening_source_version: true, listening_status: true },
        },
      },
    });
    if (!draft) return null;
    if (
      draft.expires_at.getTime() <= Date.now() ||
      draft.toeic_tests.listening_status !== "PUBLISHED" ||
      draft.listening_source_version !==
        draft.toeic_tests.listening_source_version
    ) {
      await this.prisma.toeic_listening_drafts.deleteMany({
        where: { user_id: userId, test_id: testId, scope },
      });
      return null;
    }
    return mapToeicListeningDraft(draft);
  }
}
