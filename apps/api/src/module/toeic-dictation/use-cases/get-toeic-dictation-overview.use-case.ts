import { Injectable } from "@nestjs/common";
import type { ToeicDictationOverview } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";

const COLLECTION_NAME = "Đề 2026";

@Injectable()
export class GetToeicDictationOverviewUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ToeicDictationOverview> {
    const sets = await this.prisma.toeic_dictation_sets.findMany({
      where: { collection_name: COLLECTION_NAME, status: "PUBLISHED" },
      select: {
        part: true,
        toeic_dictation_items: {
          where: { is_active: true },
          select: { id: true },
        },
      },
    });
    const parts = [1, 2, 3, 4].map((part) => {
      const selected = sets.filter((set) => set.part === part);
      return {
        part: part as 1 | 2 | 3 | 4,
        setCount: selected.length,
        itemCount: selected.reduce(
          (sum, set) => sum + set.toeic_dictation_items.length,
          0,
        ),
      };
    });
    return {
      collectionName: COLLECTION_NAME,
      publishedSetCount: sets.length,
      totalItemCount: parts.reduce((sum, part) => sum + part.itemCount, 0),
      parts,
    };
  }
}
