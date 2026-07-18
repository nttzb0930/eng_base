import "dotenv/config";

import path from "node:path";

import prisma from "../../support/script-prisma.js";
import { loadVocabularySeedData } from "./vocabulary-seed-data.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyDataDirectory = path.join(
  repositoryRoot,
  "data/vocabulary",
);

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

async function main() {
  const seedData = await loadVocabularySeedData(vocabularyDataDirectory);

  for (const topic of seedData.topics) {
    await prisma.vocabulary_topics.upsert({
      where: { slug: topic.slug },
      update: {
        title: topic.title,
        description: topic.description,
        order: topic.order,
      },
      create: {
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        order: topic.order,
      },
    });
  }

  await prisma.vocabulary_topics.deleteMany({
    where: { slug: { notIn: seedData.topics.map((topic) => topic.slug) } },
  });

  const [vocabularyItems, topics] = await Promise.all([
    prisma.vocabulary_items.findMany({
      select: {
        id: true,
        normalized_word: true,
        pos: true,
        cefr_level: true,
      },
    }),
    prisma.vocabulary_topics.findMany({ select: { id: true, slug: true } }),
  ]);
  const vocabularyIdByIdentity = new Map(
    vocabularyItems.map((item) => [
      `${item.normalized_word.trim().toLowerCase()}|${item.pos.trim().toLowerCase()}|${item.cefr_level.trim().toLowerCase()}`,
      item.id,
    ]),
  );
  const topicIdBySlug = new Map(topics.map((topic) => [topic.slug, topic.id]));
  const relationRows = seedData.relations.map((relation) => {
    const vocabularyItemId = vocabularyIdByIdentity.get(
      relation.vocabularyIdentity,
    );
    const topicId = topicIdBySlug.get(relation.topicSlug);
    if (vocabularyItemId === undefined || topicId === undefined) {
      throw new Error(
        `Cannot resolve vocabulary topic relation ${relation.vocabularyIdentity} -> ${relation.topicSlug}`,
      );
    }
    return { vocabulary_item_id: vocabularyItemId, topic_id: topicId };
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.vocabulary_item_topics.deleteMany();
    for (const rows of chunk(relationRows, 500)) {
      await transaction.vocabulary_item_topics.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }
  });

  console.log(
    JSON.stringify({
      action: "seed-canonical-vocabulary-topics",
      topics: seedData.topics.length,
      relations: relationRows.length,
      databaseUpdated: true,
    }),
  );
}

void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
