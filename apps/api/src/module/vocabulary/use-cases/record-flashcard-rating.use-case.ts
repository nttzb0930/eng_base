import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { recordVocabularyProgress } from "./record-vocabulary-progress";
import type { FlashcardRating } from "./vocabulary-review-schedule";

@Injectable()
export class RecordFlashcardRatingUseCase {
  constructor(private readonly prisma: PrismaService) {}
  execute(userId: string, vocabularyItemId: number, rating: FlashcardRating) {
    return recordVocabularyProgress(this.prisma, userId, vocabularyItemId, rating);
  }
}
