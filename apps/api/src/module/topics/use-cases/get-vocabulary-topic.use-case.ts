import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  localizeVocabularyTopic,
  type TopicLocale,
} from "../topic-locale";
import { PRACTICE_CEFR_LEVELS, type PracticeCefrLevel, TopicSource } from "./topic-source";

@Injectable()
export class GetVocabularyTopicUseCase extends TopicSource {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(
    userId: string,
    slug: string,
    level?: string,
    locale: TopicLocale = "en",
  ) {
    const normalizedLevel = this.normalizePracticeCefrLevel(level);
    const topic = await this.getRawTopicBySlug(slug);

    if (!topic) return null;

    const relations = await this.getRawTopicVocabularyRelations([topic.id]);
    const rawItems = await this.getRawVocabularyItemsByIds(
      relations.map((row) => row.vocabulary_item_id),
      userId ?? null
    );
    const allItems = rawItems.map((item) => this.mapVocabularyItem(item));
    const items = normalizedLevel
      ? allItems.filter((item) => item.cefrLevel === normalizedLevel)
      : allItems;
    const countsByLevel = Object.fromEntries(
      PRACTICE_CEFR_LEVELS.map((cefrLevel) => [
        cefrLevel,
        allItems.filter((item) => item.cefrLevel === cefrLevel).length,
      ])
    ) as Record<PracticeCefrLevel, number>;

    return {
      ...localizeVocabularyTopic(topic, locale),
      selectedLevel: normalizedLevel,
      countsByLevel,
      stats: this.getTopicStats(allItems),
      filteredStats: this.getTopicStats(items),
      items,
    };
  }
}
