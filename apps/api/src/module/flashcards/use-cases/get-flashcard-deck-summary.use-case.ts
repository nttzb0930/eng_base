import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  FlashcardQuerySource,
  PRACTICE_CEFR_LEVELS,
  type PracticeCefrLevel,
} from "./flashcard-source";

@Injectable()
export class GetFlashcardDeckSummaryUseCase extends FlashcardQuerySource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(userId: string) {
    if (!userId) {
      return {
        due: 0,
        saved: 0,
        weak: 0,
        levels: Object.fromEntries(
          PRACTICE_CEFR_LEVELS.map((level) => [level, 0])
        ) as Record<PracticeCefrLevel, number>,
      };
    }

    const [saved, due, weak, ...levelCounts] = await Promise.all([
      this.prisma.user_saved_words.count({
        where: { user_id: userId },
      }),
      this.prisma.user_vocabulary_progress.count({
        where: {
          user_id: userId,
          review_count: {
            gt: 0,
          },
          OR: [
            {
              next_review_at: null,
            },
            {
              next_review_at: {
                lte: new Date(),
              },
            },
          ],
        },
      }),
      this.prisma.user_vocabulary_progress.count({
        where: {
          user_id: userId,
          review_count: {
            gt: 0,
          },
          wrong_count: {
            gt: 0,
          },
        },
      }),
      ...PRACTICE_CEFR_LEVELS.map((level) =>
        this.prisma.vocabulary_items.count({
          where: { cefr_level: level },
        })
      ),
    ]);

    return {
      due,
      saved,
      weak,
      levels: Object.fromEntries(
        PRACTICE_CEFR_LEVELS.map((level, index) => [level, levelCounts[index]])
      ) as Record<PracticeCefrLevel, number>,
    };
  }
}
