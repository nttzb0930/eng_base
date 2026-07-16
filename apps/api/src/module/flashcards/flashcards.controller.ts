import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { GetFlashcardDeckSummaryUseCase } from "./use-cases/get-flashcard-deck-summary.use-case";
import { GetFlashcardSessionItemsUseCase } from "./use-cases/get-flashcard-session-items.use-case";

@Controller("flashcards")
@UseGuards(UserJwtGuard)
export class FlashcardsController {
  constructor(
    private readonly getDeckSummary: GetFlashcardDeckSummaryUseCase,
    private readonly getSessionItems: GetFlashcardSessionItemsUseCase
  ) {}

  @Get("summary")
  getFlashcardSummary(@CurrentUserId() userId: string) {
    return this.getDeckSummary.execute(userId);
  }

  @Get("session")
  getFlashcardSession(
    @CurrentUserId() userId: string,
    @Query("deck") deck?: string
  ) {
    return this.getSessionItems.execute(userId, deck);
  }
}
