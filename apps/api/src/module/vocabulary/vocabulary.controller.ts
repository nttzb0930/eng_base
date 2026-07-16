import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { VocabularyService } from "./vocabulary.service";
import { RecordReviewResultDto, RecordFlashcardRatingDto } from "./dto/vocabulary.dto";

@Controller("vocabulary")
@UseGuards(UserJwtGuard)
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get("saved-words")
  getSavedWords() {
    return this.vocabularyService.getSavedVocabularyWords();
  }

  @Post(":id/toggle-saved")
  toggleSavedWord(@Param("id", ParseIntPipe) id: number) {
    return this.vocabularyService.toggleSavedWord(id);
  }

  @Post(":id/review")
  recordReviewResult(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordReviewResultDto
  ) {
    return this.vocabularyService.recordVocabularyReviewResult(id, body.correct);
  }

  @Post(":id/flashcard")
  recordFlashcard(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordFlashcardRatingDto
  ) {
    return this.vocabularyService.recordFlashcardRating(id, body.rating);
  }
}
