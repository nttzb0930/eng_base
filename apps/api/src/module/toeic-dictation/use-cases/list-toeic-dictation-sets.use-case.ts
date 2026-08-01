import { Injectable } from "@nestjs/common";
import type { ToeicDictationPart, ToeicDictationSetSummary } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapSetSummary } from "../toeic-dictation.mapper";

const COLLECTION_NAME = "Đề 2026";

@Injectable()
export class ListToeicDictationSetsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    query: { collection?: string; test?: number; part?: ToeicDictationPart },
  ): Promise<ToeicDictationSetSummary[]> {
    const sets = await this.prisma.toeic_dictation_sets.findMany({
      where: {
        collection_name: query.collection ?? COLLECTION_NAME,
        status: "PUBLISHED",
        test_number: query.test,
        part: query.part,
      },
      orderBy: [{ test_number: "asc" }, { part: "asc" }, { id: "asc" }],
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
    return sets.map(mapSetSummary);
  }
}
