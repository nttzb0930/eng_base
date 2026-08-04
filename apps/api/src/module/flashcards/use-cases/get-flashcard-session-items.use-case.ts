import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import type { FlashcardSessionQueryDto } from "../dto/flashcard-session-query.dto";
import {
  FLASHCARD_SESSION_LIMIT,
  FlashcardQuerySource,
  type RandomSource,
} from "./flashcard-source";

@Injectable()
export class GetFlashcardSessionItemsUseCase extends FlashcardQuerySource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(
    userId: string,
    query: FlashcardSessionQueryDto = {},
    random: RandomSource = Math.random,
  ) {
    if (!userId) return [];

    const target = this.parseFlashcardSessionQuery(query);

    if (target.source === "topic") {
      const topic = await this.getTopicFlashcardVocabularyItems(
        userId,
        target.slug,
      );

      if (!topic) {
        throw new NotFoundException("FLASHCARD_TOPIC_NOT_FOUND");
      }

      return this.shuffle(
        topic.vocabulary_item_topics.map(({ vocabulary_items }) =>
          this.mapVocabularyItem(vocabulary_items),
        ),
        random,
      ).slice(0, FLASHCARD_SESSION_LIMIT);
    }

    const deck = target.deck;
    const items = (await this.getFlashcardVocabularyItems(userId, deck)).map(
      (item) => this.mapVocabularyItem(item),
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

    return this.shuffle(items, random).slice(0, FLASHCARD_SESSION_LIMIT);
  }
}
