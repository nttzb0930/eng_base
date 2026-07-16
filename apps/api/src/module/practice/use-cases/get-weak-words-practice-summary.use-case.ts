import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { PracticeSource } from "./practice-source";

@Injectable()
export class GetWeakWordsPracticeSummaryUseCase extends PracticeSource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getWeakVocabularyProgressRows(userId: string) {
    return this.prisma.user_vocabulary_progress.findMany({
      where: {
        user_id: userId,
        review_count: {
          gt: 0,
        },
        wrong_count: {
          gt: 0,
        },
      },
      include: {
        vocabulary_items: {
          include: {
            user_saved_words: {
              where: { user_id: userId },
            },
            user_vocabulary_progress: {
              where: { user_id: userId },
            },
            vocabulary_examples: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
  }

  async execute(userId: string) {
    if (!userId) {
      return {
        total: 0,
        due: 0,
        learning: 0,
        wrong: 0,
      };
    }

    const rows = await this.getWeakVocabularyProgressRows(userId);

    return rows.reduce(
      (summary, row) => ({
        total: summary.total + 1,
        due: summary.due + (this.isDue(row.next_review_at) ? 1 : 0),
        learning: summary.learning + (row.mastery_level === "learning" ? 1 : 0),
        wrong: summary.wrong + (row.wrong_count > 0 ? 1 : 0),
      }),
      {
        total: 0,
        due: 0,
        learning: 0,
        wrong: 0,
      }
    );
  }
}
