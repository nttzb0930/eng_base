import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { mapVocabularyItem, type VocabularyItem } from "../vocabulary";

export type PracticeCefrLevel = "A1" | "A2" | "B1" | "B2";
export const PRACTICE_CEFR_LEVELS: PracticeCefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
];

type RawVocabularyTopic = {
  id: number;
  slug: string;
  title: string;
  description: string;
  order: number;
  created_at: Date;
};

type RawTopicVocabularyItemId = {
  topic_id: number;
  vocabulary_item_id: number;
};

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  private isPracticeCefrLevel(value: string): value is PracticeCefrLevel {
    return (PRACTICE_CEFR_LEVELS as readonly string[]).includes(value);
  }

  private normalizePracticeCefrLevel(
    value?: string | null
  ): PracticeCefrLevel | undefined {
    return value && this.isPracticeCefrLevel(value) ? value : undefined;
  }

  async getRawVocabularyItemsByIds(
    vocabularyItemIds: number[],
    userId: string | null,
    level?: PracticeCefrLevel
  ) {
    if (vocabularyItemIds.length === 0) return [];

    return this.prisma.vocabulary_items.findMany({
      where: {
        id: { in: vocabularyItemIds },
        ...(level ? { cefr_level: level } : {}),
      },
      orderBy: { normalized_word: "asc" },
      include: {
        user_saved_words: {
          where: userId ? { user_id: userId } : { user_id: "__none__" },
        },
        user_vocabulary_progress: {
          where: userId ? { user_id: userId } : { user_id: "__none__" },
        },
        vocabulary_examples: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async getRawTopics() {
    return this.prisma.$queryRaw<RawVocabularyTopic[]>`
      SELECT id, slug, title, description, "order", created_at
      FROM vocabulary_topics
      ORDER BY "order" ASC
    `;
  }

  async getRawTopicBySlug(slug: string) {
    const topics = await this.prisma.$queryRaw<RawVocabularyTopic[]>`
      SELECT id, slug, title, description, "order", created_at
      FROM vocabulary_topics
      WHERE slug = ${slug}
      LIMIT 1
    `;

    return topics[0] ?? null;
  }

  async getRawTopicVocabularyRelations(topicIds: number[]) {
    if (topicIds.length === 0) return [];
    const rows = await this.prisma.$queryRaw<RawTopicVocabularyItemId[]>`
      SELECT topic_id, vocabulary_item_id
      FROM vocabulary_item_topics
      WHERE topic_id IN (${Prisma.join(topicIds)})
      ORDER BY topic_id ASC, vocabulary_item_id ASC
    `;
    return rows;
  }

  private getTopicStats(items: VocabularyItem[]) {
    const learned = items.filter(
      (item) => item.userVocabularyProgress[0]?.reviewCount > 0
    ).length;
    const mastered = items.filter(
      (item) => item.userVocabularyProgress[0]?.masteryLevel === "mastered"
    ).length;

    return {
      total: items.length,
      learned,
      mastered,
    };
  }

  async getVocabularyTopics(userId: string) {
    const topics = await this.getRawTopics();
    const relations = await this.getRawTopicVocabularyRelations(
      topics.map((topic) => topic.id)
    );
    const rawItems = await this.getRawVocabularyItemsByIds(
      [...new Set(relations.map((row) => row.vocabulary_item_id))],
      userId ?? null
    );
    const itemsById = new Map(
      rawItems.map((item) => [item.id, mapVocabularyItem(item)])
    );
    const cards = topics.map((topic) => {
      const items = relations
        .filter((row) => row.topic_id === topic.id)
        .map((row) => itemsById.get(row.vocabulary_item_id))
        .filter((item): item is VocabularyItem => Boolean(item));
      return { ...topic, ...this.getTopicStats(items) };
    });

    return cards.filter((topic) => topic.total > 0);
  }

  async getVocabularyTopicBySlug(userId: string, slug: string, level?: string) {
    const normalizedLevel = this.normalizePracticeCefrLevel(level);
    const topic = await this.getRawTopicBySlug(slug);

    if (!topic) return null;

    const relations = await this.getRawTopicVocabularyRelations([topic.id]);
    const rawItems = await this.getRawVocabularyItemsByIds(
      relations.map((row) => row.vocabulary_item_id),
      userId ?? null
    );
    const allItems = rawItems.map(mapVocabularyItem);
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
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      order: topic.order,
      selectedLevel: normalizedLevel,
      countsByLevel,
      stats: this.getTopicStats(allItems),
      filteredStats: this.getTopicStats(items),
      items,
    };
  }
}
