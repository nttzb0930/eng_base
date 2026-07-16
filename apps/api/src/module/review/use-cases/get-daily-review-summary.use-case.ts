import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { GetSavedVocabularyWordsUseCase } from "../../vocabulary";
import { DailyReviewSource } from "./daily-review-source";

@Injectable()
export class GetDailyReviewSummaryUseCase extends DailyReviewSource {
  constructor(prisma: PrismaService, savedWords: GetSavedVocabularyWordsUseCase) {
    super(prisma, savedWords);
  }

  async execute(userId: string) {
    const candidateIds = await this.getDailyReviewCandidateIds(userId);

    return {
      total: candidateIds.selectedIds.length,
      due: candidateIds.dueCount,
      weak: candidateIds.weakCount,
      saved: candidateIds.savedCount,
    };
  }
}
