import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import prisma from "./support/script-prisma";

const main = async () => {
  const vocabularyItems = await prisma.vocabulary_items.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      word: true,
      normalized_word: true,
      pos: true,
      pos_vi: true,
      cefr_level: true,
      phonetic: true,
      phonetic_source: true,
      audio_url: true,
      audio_source: true,
      example_en: true,
      example_vi: true,
      example_source: true,
      meaning_vi: true,
      primary_meaning_vi: true,
      source: true,
      created_at: true,
      updated_at: true,
      vocabulary_examples: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          example_en: true,
          example_vi: true,
          source: true,
          order: true,
          created_at: true,
        },
      },
      vocabulary_item_topics: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          topic_id: true,
          vocabulary_topics: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
      challenges: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          lesson_id: true,
          type: true,
          direction: true,
          question: true,
          order: true,
          challenge_options: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              text: true,
              correct: true,
              image_src: true,
              audio_src: true,
            },
          },
        },
      },
    },
  });

  const counts = vocabularyItems.reduce(
    (summary, item) => {
      summary.examples += item.vocabulary_examples.length;
      summary.topicLinks += item.vocabulary_item_topics.length;
      summary.challenges += item.challenges.length;
      summary.challengeOptions += item.challenges.reduce(
        (total, challenge) => total + challenge.challenge_options.length,
        0
      );
      return summary;
    },
    {
      vocabularyItems: vocabularyItems.length,
      examples: 0,
      topicLinks: 0,
      challenges: 0,
      challengeOptions: 0,
    }
  );

  const outputDirectory = path.resolve(
    process.cwd(),
    "..",
    "..",
    "data",
    "vocabulary"
  );
  const outputPath = path.join(outputDirectory, "vocab-db-snapshot.json");
  const snapshot = {
    exportedAt: new Date().toISOString(),
    source: "database",
    scope: [
      "vocabulary_items",
      "vocabulary_examples",
      "vocabulary_item_topics",
      "vocabulary_topics",
      "challenges",
      "challenge_options",
    ],
    excludedUserData: [
      "user_saved_words",
      "user_vocabulary_progress",
      "challenge_progress",
      "practice_sessions",
      "practice_session_items",
    ],
    counts,
    records: vocabularyItems,
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ outputPath, counts }, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
