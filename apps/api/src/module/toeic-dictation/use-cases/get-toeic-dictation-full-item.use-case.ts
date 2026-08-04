import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicDictationFullItem } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class GetToeicDictationFullItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(itemId: number): Promise<ToeicDictationFullItem> {
    const item = await this.prisma.toeic_dictation_items.findFirst({
      where: {
        id: itemId,
        is_active: true,
        toeic_dictation_sets: {
          collection_name: "Đề 2026",
          status: "PUBLISHED",
        },
      },
      select: { id: true, transcript: true, translation_vi: true },
    });
    if (!item) throw new NotFoundException("TOEIC Dictation item not found");
    return {
      itemId: item.id,
      transcript: item.transcript,
      translationVi: item.translation_vi,
    };
  }
}
