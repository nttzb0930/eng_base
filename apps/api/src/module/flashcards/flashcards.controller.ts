import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../auth";
import { FlashcardsService } from "./flashcards.service";

@Controller("flashcards")
@UseGuards(UserJwtGuard)
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get("summary")
  getFlashcardSummary() {
    return this.flashcardsService.getFlashcardDeckSummary();
  }

  @Get("session")
  getFlashcardSession(@Query("deck") deck?: string) {
    return this.flashcardsService.getFlashcardSessionItems(deck);
  }
}
