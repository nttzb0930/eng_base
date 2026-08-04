import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicDictationProgress } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapItemProgress } from "../toeic-dictation.mapper";

@Injectable()
export class GetToeicDictationProgressUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, setId: number): Promise<ToeicDictationProgress> {
    const set = await this.prisma.toeic_dictation_sets.findFirst({
      where: { id: setId, collection_name: "Đề 2026", status: "PUBLISHED" },
      select: {
        id: true,
        source_version: true,
        toeic_dictation_items: {
          where: { is_active: true },
          orderBy: { order_index: "asc" },
          select: {
            id: true,
            toeic_dictation_progress: {
              where: { user_id: userId },
              take: 1,
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
    return {
      setId: set.id,
      sourceVersion: set.source_version,
      items: set.toeic_dictation_items.map((item) =>
        mapItemProgress(item.id, item.toeic_dictation_progress[0] ?? null),
      ),
    };
  }
}
