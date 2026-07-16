import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { recordVocabularyProgress } from "./record-vocabulary-progress";

@Injectable()
export class RecordVocabularyReviewResultUseCase {
  constructor(private readonly prisma: PrismaService) {}
  execute(userId: string, vocabularyItemId: number, correct: boolean) {
    return recordVocabularyProgress(this.prisma, userId, vocabularyItemId, correct ? "good" : "again");
  }
}
