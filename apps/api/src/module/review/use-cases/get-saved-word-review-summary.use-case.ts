import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { VocabularyService } from "../../vocabulary";
import { ReviewSource } from "./review-source";

@Injectable()
export class GetSavedWordReviewSummaryUseCase extends ReviewSource {
  constructor(prisma: PrismaService, vocabularyService: VocabularyService) {
    super(prisma, vocabularyService);
  }

  async execute(userId: string) {
    const savedWords =
      await this.vocabularyService.getSavedVocabularyWords(userId);

    return savedWords.reduce(
      (summary, savedWord) => {
        const status = this.getVocabularyReviewStatus(savedWord.vocabularyItem);

        return {
          total: summary.total + 1,
          due: summary.due + (status.due ? 1 : 0),
          new: summary.new + (status.masteryLevel === "new" ? 1 : 0),
          learning:
            summary.learning + (status.masteryLevel === "learning" ? 1 : 0),
          review: summary.review + (status.masteryLevel === "review" ? 1 : 0),
          mastered:
            summary.mastered + (status.masteryLevel === "mastered" ? 1 : 0),
        };
      },
      {
        total: 0,
        due: 0,
        new: 0,
        learning: 0,
        review: 0,
        mastered: 0,
      }
    );
  }
}
