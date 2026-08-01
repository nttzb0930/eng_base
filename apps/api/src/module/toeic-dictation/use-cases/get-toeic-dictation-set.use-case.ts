import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicDictationSetDetail } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapSetSummary } from "../toeic-dictation.mapper";

@Injectable()
export class GetToeicDictationSetUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, setId: number): Promise<ToeicDictationSetDetail> {
    const set = await this.prisma.toeic_dictation_sets.findFirst({
      where: { id: setId, collection_name: "Đề 2026", status: "PUBLISHED" },
      select: {
        id: true,
        collection_name: true,
        display_name: true,
        test_number: true,
        part: true,
        source_version: true,
        toeic_dictation_items: {
          where: { is_active: true },
          orderBy: { order_index: "asc" },
          select: {
            id: true,
            order_index: true,
            source_group: true,
            audio_duration_ms: true,
            toeic_dictation_progress: {
              where: { user_id: userId },
              select: {
                id: true,
                latest_accuracy: true,
                words_correct: true,
                total_words: true,
                attempts_count: true,
                mastered: true,
                last_typed_text: true,
                last_attempted_at: true,
                completed_at: true,
              },
            },
          },
        },
      },
    });
    if (!set) throw new NotFoundException("TOEIC Dictation set not found");
    const summary = mapSetSummary(set);
    return {
      ...summary,
      items: set.toeic_dictation_items.map((item) => ({
        id: item.id,
        order: item.order_index,
        groupId: item.source_group,
        durationSeconds: item.audio_duration_ms
          ? item.audio_duration_ms / 1000
          : null,
        mediaId: item.id,
      })),
    };
  }
}
