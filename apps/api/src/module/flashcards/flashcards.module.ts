import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { FlashcardsController } from "./flashcards.controller";
import { FlashcardSessionBuilder } from "./use-cases/flashcard-session.builder";
import { GetFlashcardDeckSummaryUseCase } from "./use-cases/get-flashcard-deck-summary.use-case";
import { GetFlashcardSessionItemsUseCase } from "./use-cases/get-flashcard-session-items.use-case";

@Module({
  controllers: [FlashcardsController],
  providers: [
    FlashcardSessionBuilder,
    GetFlashcardDeckSummaryUseCase,
    GetFlashcardSessionItemsUseCase,
    UserJwtGuard,
  ],
})
export class FlashcardsModule {}
