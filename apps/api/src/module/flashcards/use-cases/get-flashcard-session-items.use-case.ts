import { Injectable } from "@nestjs/common";

import { FlashcardSessionBuilder } from "./flashcard-session.builder";

@Injectable()
export class GetFlashcardSessionItemsUseCase {
  constructor(private readonly builder: FlashcardSessionBuilder) {}

  execute(userId: string, deck?: string) {
    return this.builder.getFlashcardSessionItems(userId, deck);
  }
}
