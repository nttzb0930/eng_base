import { Injectable } from "@nestjs/common";
import type { ToeicListeningPart } from "@repo/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { toeicListeningDraftScope } from "../toeic-listening-draft.mapper";
@Injectable()
export class DeleteToeicListeningDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(userId: string, testId: number, part?: ToeicListeningPart) {
    const result = await this.prisma.toeic_listening_drafts.deleteMany({
      where: {
        user_id: userId,
        test_id: testId,
        scope: toeicListeningDraftScope(part),
      },
    });
    return { deleted: result.count > 0 };
  }
}
