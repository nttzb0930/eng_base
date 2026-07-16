import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { GetSavedVocabularyWordsUseCase } from "./use-cases/get-saved-vocabulary-words.use-case";
import { ToggleSavedWordUseCase } from "./use-cases/toggle-saved-word.use-case";
import { RecordVocabularyReviewResultUseCase } from "./use-cases/record-vocabulary-review-result.use-case";
import { RecordFlashcardRatingUseCase } from "./use-cases/record-flashcard-rating.use-case";
import {
  RecordReviewResultDto,
  RecordFlashcardRatingDto,
} from "./dto/vocabulary.dto";

@Controller("vocabulary")
@UseGuards(UserJwtGuard)
export class VocabularyController {
  constructor(
    private readonly getSavedWordsGoal: GetSavedVocabularyWordsUseCase,
    private readonly toggleSavedWordGoal: ToggleSavedWordUseCase,
    private readonly recordReviewGoal: RecordVocabularyReviewResultUseCase,
    private readonly recordFlashcardGoal: RecordFlashcardRatingUseCase
  ) {}

  @Get("saved-words")
  getSavedWords(@CurrentUserId() userId: string) {
    return this.getSavedWordsGoal.execute(userId);
  }

  @Post(":id/toggle-saved")
  toggleSavedWord(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.toggleSavedWordGoal.execute(userId, id);
  }

  @Post(":id/review")
  recordReviewResult(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordReviewResultDto
  ) {
    return this.recordReviewGoal.execute(userId, id, body.correct);
  }

  @Post(":id/flashcard")
  recordFlashcard(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordFlashcardRatingDto
  ) {
    return this.recordFlashcardGoal.execute(userId, id, body.rating);
  }
}
