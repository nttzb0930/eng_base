import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { type VocabularyItem } from "../../vocabulary";
import { localizeVocabularyTopic, type TopicLocale } from "../topic-locale";
import { TopicSource } from "./topic-source";

@Injectable()
export class ListVocabularyTopicsUseCase extends TopicSource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(userId: string, locale: TopicLocale = "en") {
    const now = new Date();
    const topics = await this.getRawTopics();
    const relations = await this.getRawTopicVocabularyRelations(
      topics.map((topic) => topic.id)
    );
    const rawItems = await this.getRawVocabularyItemsByIds(
      [...new Set(relations.map((row) => row.vocabulary_item_id))],
      userId ?? null
    );
    const itemsById = new Map(
      rawItems.map((item) => [item.id, this.mapVocabularyItem(item)])
    );
    const cards = topics.map((topic) => {
      const items = relations
        .filter((row) => row.topic_id === topic.id)
        .map((row) => itemsById.get(row.vocabulary_item_id))
        .filter((item): item is VocabularyItem => Boolean(item));
      return {
        ...localizeVocabularyTopic(topic, locale),
        ...this.getTopicStats(items, now),
      };
    });

    return cards.filter((topic) => topic.total > 0);
  }
}
