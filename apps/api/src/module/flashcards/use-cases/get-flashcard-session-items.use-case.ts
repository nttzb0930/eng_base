import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  FLASHCARD_SESSION_LIMIT,
  FlashcardQuerySource,
} from "./flashcard-source";

@Injectable()
export class GetFlashcardSessionItemsUseCase extends FlashcardQuerySource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(userId: string, deckValue?: string) {
    if (!userId) return [];

    const deck = this.normalizeFlashcardDeck(deckValue);
    const items = (await this.getFlashcardVocabularyItems(userId, deck)).map(
      (x) => this.mapVocabularyItem(x)
    );

    if (deck === "due") {
      return items
        .sort((a, b) => {
          const aProgress = a.userVocabularyProgress[0];
          const bProgress = b.userVocabularyProgress[0];
          const aTime = aProgress?.nextReviewAt?.getTime() ?? 0;
          const bTime = bProgress?.nextReviewAt?.getTime() ?? 0;

          return aTime - bTime;
        })
        .slice(0, FLASHCARD_SESSION_LIMIT);
    }

    if (deck === "weak") {
      return items
        .sort((a, b) => {
          const aProgress = a.userVocabularyProgress[0];
          const bProgress = b.userVocabularyProgress[0];

          return (bProgress?.wrongCount ?? 0) - (aProgress?.wrongCount ?? 0);
        })
        .slice(0, FLASHCARD_SESSION_LIMIT);
    }

    return this.shuffle(items).slice(0, FLASHCARD_SESSION_LIMIT);
  }
}
