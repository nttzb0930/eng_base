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
import { VocabularyService } from "./vocabulary.service";
import {
  RecordReviewResultDto,
  RecordFlashcardRatingDto,
} from "./dto/vocabulary.dto";

@Controller("vocabulary")
@UseGuards(UserJwtGuard)
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get("saved-words")
  getSavedWords(@CurrentUserId() userId: string) {
    return this.vocabularyService.getSavedVocabularyWords(userId);
  }

  @Post(":id/toggle-saved")
  toggleSavedWord(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.vocabularyService.toggleSavedWord(userId, id);
  }

  @Post(":id/review")
  recordReviewResult(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordReviewResultDto
  ) {
    return this.vocabularyService.recordVocabularyReviewResult(
      userId,
      id,
      body.correct
    );
  }

  @Post(":id/flashcard")
  recordFlashcard(
    @CurrentUserId() userId: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordFlashcardRatingDto
  ) {
    return this.vocabularyService.recordFlashcardRating(
      userId,
      id,
      body.rating
    );
  }
}
