import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { FlashcardsService } from "./flashcards.service";

@Controller("flashcards")
@UseGuards(UserJwtGuard)
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get("summary")
  getFlashcardSummary(@CurrentUserId() userId: string) {
    return this.flashcardsService.getFlashcardDeckSummary(userId);
  }

  @Get("session")
  getFlashcardSession(
    @CurrentUserId() userId: string,
    @Query("deck") deck?: string
  ) {
    return this.flashcardsService.getFlashcardSessionItems(userId, deck);
  }
}
