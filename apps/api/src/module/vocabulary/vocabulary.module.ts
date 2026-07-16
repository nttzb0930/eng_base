import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { VocabularyController } from "./vocabulary.controller";
import { GetSavedVocabularyWordsUseCase } from "./use-cases/get-saved-vocabulary-words.use-case";
import { ToggleSavedWordUseCase } from "./use-cases/toggle-saved-word.use-case";
import { RecordVocabularyReviewResultUseCase } from "./use-cases/record-vocabulary-review-result.use-case";
import { RecordFlashcardRatingUseCase } from "./use-cases/record-flashcard-rating.use-case";

@Module({
  controllers: [VocabularyController],
  providers: [GetSavedVocabularyWordsUseCase, ToggleSavedWordUseCase, RecordVocabularyReviewResultUseCase, RecordFlashcardRatingUseCase, UserJwtGuard],
  exports: [GetSavedVocabularyWordsUseCase],
})
export class VocabularyModule {}
