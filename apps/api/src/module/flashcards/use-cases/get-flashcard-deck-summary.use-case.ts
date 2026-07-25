import { Injectable } from "@nestjs/common";
import type { FlashcardSummary } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  getVocabularyLearnerState,
  mapVocabularyItem,
  type VocabularyItem,
} from "../../vocabulary";
import { summarizeFlashcardDeck } from "./flashcard-deck-summary.policy";
import {
  FlashcardQuerySource,
  PRACTICE_CEFR_LEVELS,
} from "./flashcard-source";

type TopicDeckGroup = {
  order: number;
  items: VocabularyItem[];
};

@Injectable()
export class GetFlashcardDeckSummaryUseCase extends FlashcardQuerySource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(
    userId: string,
    now: Date = new Date(),
  ): Promise<FlashcardSummary> {
    const rawItems = userId
      ? await this.prisma.vocabulary_items.findMany({
          orderBy: { id: "asc" },
          include: {
            user_saved_words: { where: { user_id: userId } },
            user_vocabulary_progress: { where: { user_id: userId } },
            vocabulary_examples: {
              orderBy: [{ order: "asc" }, { id: "asc" }],
            },
            vocabulary_item_topics: {
              include: {
                vocabulary_topics: {
                  select: { slug: true, order: true },
                },
              },
            },
          },
        })
      : [];
    const items = rawItems.map(mapVocabularyItem);
    const dueItems = items.filter(
      (item) => getVocabularyLearnerState(item, now).due,
    );
    const savedItems = items.filter(
      (item) => item.userSavedWords.length > 0,
    );
    const weakItems = items.filter(
      (item) => getVocabularyLearnerState(item, now).weak,
    );
    const dueDeck = summarizeFlashcardDeck("due", "due", dueItems, now);
    const savedDeck = summarizeFlashcardDeck(
      "saved",
      "saved",
      savedItems,
      now,
    );
    const weakDeck = summarizeFlashcardDeck(
      "weak",
      "weak",
      weakItems,
      now,
    );
    const allDeck = summarizeFlashcardDeck("all", "cefr", items, now);
    const cefrDecks = PRACTICE_CEFR_LEVELS.map((level) =>
      summarizeFlashcardDeck(
        level,
        "cefr",
        items.filter((item) => item.cefrLevel === level),
        now,
      ),
    );
    const topicGroups = new Map<string, TopicDeckGroup>();

    rawItems.forEach((rawItem, index) => {
      const item = items[index];
      if (!item) return;

      for (const relation of rawItem.vocabulary_item_topics) {
        const topic = relation.vocabulary_topics;
        const group = topicGroups.get(topic.slug);

        if (group) {
          group.items.push(item);
        } else {
          topicGroups.set(topic.slug, {
            order: topic.order,
            items: [item],
          });
        }
      }
    });

    const topicDecks = [...topicGroups.entries()]
      .sort(
        ([slugA, groupA], [slugB, groupB]) =>
          groupA.order - groupB.order || slugA.localeCompare(slugB),
      )
      .map(([slug, group]) =>
        summarizeFlashcardDeck(slug, "topic", group.items, now),
      );

    return {
      overview: {
        due: dueDeck.total,
        saved: savedDeck.total,
        weak: weakDeck.total,
        learned: allDeck.learned,
        mastered: allDeck.mastered,
        accuracy: allDeck.accuracy,
        lastReviewedAt: allDeck.lastReviewedAt,
      },
      systemDecks: [dueDeck, savedDeck, weakDeck],
      cefrDecks,
      topicDecks,
    };
  }
}
