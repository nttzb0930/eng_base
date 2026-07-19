import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import { createPrismaAdapter } from "../../../src/database/prisma/prisma.config.js";
import type { VocabularyCatalogItem } from "../catalog/vocabulary-catalog.js";

const DATASET_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  "data",
  "vocabulary",
  "vocabulary-catalog.json"
);

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

async function main() {
  console.log("Fetching vocabulary items and examples from DB...");
  const dbItems = await prisma.vocabulary_items.findMany({
    include: {
      vocabulary_examples: {
        orderBy: { order: "asc" },
      },
    },
  });

  console.log(`Loaded ${dbItems.length} items from database.`);

  console.log("Reading existing vocabulary-catalog.json...");
  const fileRaw = await readFile(DATASET_PATH, "utf8");
  const fileItems = JSON.parse(fileRaw) as VocabularyCatalogItem[];

  const dbItemsMap = new Map<string, (typeof dbItems)[number]>();
  for (const item of dbItems) {
    const key = `${item.normalized_word}_${item.pos.toLowerCase()}_${item.cefr_level.toLowerCase()}`;
    dbItemsMap.set(key, item);
  }

  let updatedCount = 0;
  const mergedItems = fileItems.map((fileItem) => {
    const key = `${fileItem.normalizedWord}_${fileItem.pos.toLowerCase()}_${fileItem.cefrLevel.toLowerCase()}`;
    const dbItem = dbItemsMap.get(key);

    if (dbItem) {
      const hasNewData =
        dbItem.audio_url !== null ||
        dbItem.example_en !== null ||
        dbItem.vocabulary_examples.length > 0;

      if (hasNewData) {
        updatedCount++;
        return {
          ...fileItem,
          audioUrl: dbItem.audio_url,
          audioSource: dbItem.audio_source,
          exampleEn: dbItem.example_en,
          exampleVi: dbItem.example_vi,
          exampleSource: dbItem.example_source,
          examples: dbItem.vocabulary_examples.map((example) => ({
            exampleEn: example.example_en,
            exampleVi: example.example_vi ?? "",
          })),
        };
      }
    }
    return fileItem;
  });

  console.log(`Updated ${updatedCount} items in JSON with enriched data.`);

  console.log("Writing back to vocabulary-catalog.json...");
  await writeFile(
    DATASET_PATH,
    JSON.stringify(mergedItems, null, 2) + "\n",
    "utf8"
  );
  console.log("Export complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
