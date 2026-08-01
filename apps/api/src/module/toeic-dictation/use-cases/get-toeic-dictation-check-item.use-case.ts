import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicDictationCheckItem } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { buildToeicDictationCheckSegments } from "../toeic-dictation-grading.policy";

@Injectable()
export class GetToeicDictationCheckItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    itemId: number,
    hidePercent: 30 | 50 | 100,
  ): Promise<ToeicDictationCheckItem> {
    const item = await this.prisma.toeic_dictation_items.findFirst({
      where: {
        id: itemId,
        is_active: true,
        toeic_dictation_sets: {
          collection_name: "Đề 2026",
          status: "PUBLISHED",
        },
      },
      select: { id: true, order_index: true, transcript: true },
    });
    if (!item) throw new NotFoundException("TOEIC Dictation item not found");
    return {
      itemId: item.id,
      order: item.order_index,
      hidePercent,
      segments: buildToeicDictationCheckSegments(item.transcript, item.id, hidePercent),
    };
  }
}
