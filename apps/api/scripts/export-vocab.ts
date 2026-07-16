import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const DATASET_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  "data",
  "vocabulary",
  "phase1-vocabulary.json"
);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
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

  console.log("Reading existing phase1-vocabulary.json...");
  const fileRaw = await readFile(DATASET_PATH, "utf8");
  const fileItems = JSON.parse(fileRaw) as any[];

  const dbItemsMap = new Map<string, typeof dbItems[number]>();
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
          examples: dbItem.vocabulary_examples.map((x) => x.example_en),
        };
      }
    }
    return fileItem;
  });

  console.log(`Updated ${updatedCount} items in JSON with enriched data.`);

  console.log("Writing back to phase1-vocabulary.json...");
  await writeFile(DATASET_PATH, JSON.stringify(mergedItems, null, 2) + "\n", "utf8");
  console.log("Export complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
