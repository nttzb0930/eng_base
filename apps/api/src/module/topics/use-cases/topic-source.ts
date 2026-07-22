import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapVocabularyItem, type VocabularyItem } from "../../vocabulary";

export type PracticeCefrLevel = "A1" | "A2" | "B1" | "B2";
export const PRACTICE_CEFR_LEVELS: PracticeCefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
];

export type RawVocabularyTopic = {
  id: number;
  slug: string;
  title: string;
  title_vi: string | null;
  description: string;
  description_vi: string | null;
  group_name: string | null;
  group_name_vi: string | null;
  order: number;
  created_at: Date;
};

type RawTopicVocabularyItemId = {
  topic_id: number;
  vocabulary_item_id: number;
};

@Injectable()
export class TopicSource {
  constructor(protected readonly prisma: PrismaService) {}

  protected isPracticeCefrLevel(value: string): value is PracticeCefrLevel {
    return (PRACTICE_CEFR_LEVELS as readonly string[]).includes(value);
  }

  protected normalizePracticeCefrLevel(
    value?: string | null
  ): PracticeCefrLevel | undefined {
    return value && this.isPracticeCefrLevel(value) ? value : undefined;
  }

  protected async getRawVocabularyItemsByIds(
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
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
      },
    });
  }

  protected async getRawTopics() {
    return this.prisma.$queryRaw<RawVocabularyTopic[]>`
      SELECT id, slug, title, title_vi, description, description_vi,
             group_name, group_name_vi, "order", created_at
      FROM vocabulary_topics
      ORDER BY "order" ASC
    `;
  }

  protected async getRawTopicBySlug(slug: string) {
    const cleanSlug = slug.toLowerCase().trim();
    const topics = await this.prisma.$queryRaw<RawVocabularyTopic[]>`
      SELECT id, slug, title, title_vi, description, description_vi,
             group_name, group_name_vi, "order", created_at
      FROM vocabulary_topics
      WHERE LOWER(slug) = ${cleanSlug}
         OR LOWER(REPLACE(title, ' ', '-')) = ${cleanSlug}
         OR LOWER(REPLACE(title_vi, ' ', '-')) = ${cleanSlug}
      LIMIT 1
    `;

    if (topics[0]) return topics[0];

    const allTopics = await this.getRawTopics();
    const normalizedQuery = cleanSlug.replace(/[^a-z0-9]/g, "");

    const match = allTopics.find((t) => {
      const tSlugNorm = t.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
      const tTitleNorm = t.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const tTitleViNorm = (t.title_vi ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

      return (
        tSlugNorm === normalizedQuery ||
        tTitleNorm.includes(normalizedQuery) ||
        normalizedQuery.includes(tTitleNorm) ||
        (tTitleViNorm && (tTitleViNorm.includes(normalizedQuery) || normalizedQuery.includes(tTitleViNorm)))
      );
    });

    return match ?? allTopics[0] ?? null;
  }

  protected async getRawTopicVocabularyRelations(topicIds: number[]) {
    if (topicIds.length === 0) return [];
    return this.prisma.$queryRaw<RawTopicVocabularyItemId[]>`
      SELECT topic_id, vocabulary_item_id
      FROM vocabulary_item_topics
      WHERE topic_id IN (${Prisma.join(topicIds)})
      ORDER BY topic_id ASC, vocabulary_item_id ASC
    `;
  }

  protected getTopicStats(items: VocabularyItem[]) {
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

  protected mapVocabularyItem(item: Parameters<typeof mapVocabularyItem>[0]) {
    return mapVocabularyItem(item);
  }
}
