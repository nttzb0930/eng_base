import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { loadVocabularySeedData } from "./vocabulary-seed-data.js";

const topic = {
  slug: "airport",
  title: "Airport",
  description: "Airport vocabulary.",
  order: 1,
  group: "Travel",
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
    const data = await loadVocabularySeedData(directory);

    assert.deepEqual(data.relations, [
      { vocabularyIdentity: "airport|noun|a1", topicSlug: "airport" },
    ]);
  });
});

test("seed data rejects unknown topic slugs before database access", async () => {
  await withFixture([topic], [{ ...vocabulary, topics: ["hotel"] }], async (directory) => {
    await assert.rejects(loadVocabularySeedData(directory), /unknown topic/iu);
  });
});
