import { Injectable } from "@nestjs/common";

import { FlashcardSessionBuilder } from "./flashcard-session.builder";

@Injectable()
export class GetFlashcardDeckSummaryUseCase {
  constructor(private readonly builder: FlashcardSessionBuilder) {}

  execute(userId: string) {
    return this.builder.getFlashcardDeckSummary(userId);
  }
}
