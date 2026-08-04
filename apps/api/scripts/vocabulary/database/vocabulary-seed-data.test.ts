import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import * as vocabularySeedData from "./vocabulary-seed-data.js";

const topic = {
  slug: "airport",
  title: "Airport",
  titleVi: "Sân bay",
  description: "Airport vocabulary.",
  descriptionVi: "Từ vựng dùng tại sân bay.",
  order: 1,
  group: "Travel",
  groupVi: "Du lịch",
};

const vocabulary = {
  word: "airport",
  normalizedWord: "airport",
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "A1",
  meaningVi: "sân bay",
  primaryMeaningVi: "sân bay",
  source: "fixture",
  topics: ["airport"],
};

async function withFixture(
  topics: unknown,
  catalog: unknown,
  assertion: (directory: string) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(tmpdir(), "vocabulary-seed-"));
  try {
    await Promise.all([
      writeFile(path.join(directory, "topics.json"), JSON.stringify(topics)),
      writeFile(
        path.join(directory, "vocabulary-catalog.json"),
        JSON.stringify(catalog),
      ),
    ]);
    await assertion(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("seed data builds relations from canonical topic arrays", async () => {
  await withFixture([topic], [vocabulary], async (directory) => {
    const data = await vocabularySeedData.loadVocabularySeedData(directory);

    assert.deepEqual(data.relations, [
      { vocabularyIdentity: "airport|noun|a1", topicSlug: "airport" },
    ]);
    assert.deepEqual(data.topics[0], topic);
  });
});

test("topic persistence mapping carries both locales and groups", () => {
  const mapTopic = (
    vocabularySeedData as typeof vocabularySeedData & {
      mapVocabularyTopicPersistenceData?: (value: typeof topic) => unknown;
    }
  ).mapVocabularyTopicPersistenceData;

  assert.deepEqual(mapTopic?.(topic), {
    title: "Airport",
    title_vi: "Sân bay",
    description: "Airport vocabulary.",
    description_vi: "Từ vựng dùng tại sân bay.",
    group_name: "Travel",
    group_name_vi: "Du lịch",
    order: 1,
  });
});

test("seed data rejects unknown topic slugs before database access", async () => {
  await withFixture([topic], [{ ...vocabulary, topics: ["hotel"] }], async (directory) => {
    await assert.rejects(
      vocabularySeedData.loadVocabularySeedData(directory),
      /unknown topic/iu,
    );
  });
});
