import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClassificationPlan } from "./lib/topic-classification.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "./lib/vocabulary-catalog.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const workingRoot = path.join(vocabularyRoot, "working/topic-classification");
const inputRoot = path.join(workingRoot, "input");
const manifestPath = path.join(workingRoot, "manifest.json");
const batchSize = Number.parseInt(process.env.VOCAB_TOPIC_BATCH_SIZE ?? "50", 10);

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

async function main() {
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const plan = createClassificationPlan(catalog, batchSize);

  await rm(inputRoot, { recursive: true, force: true });
  await Promise.all([
    mkdir(inputRoot, { recursive: true }),
    mkdir(path.join(workingRoot, "output"), { recursive: true }),
    mkdir(path.join(workingRoot, "rejected"), { recursive: true }),
    mkdir(path.join(workingRoot, "jobs"), { recursive: true }),
  ]);

  for (const batch of plan.batches) {
    await writeFile(
      path.join(inputRoot, batch.inputFile),
      `${JSON.stringify(
        { schemaVersion: 1, batchId: batch.batchId, records: batch.records },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
  await writeFile(manifestPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify({
      action: "vocabulary-topic-classification-prepared",
      totalRecords: plan.totalRecords,
      batchSize: plan.batchSize,
      totalBatches: plan.batches.length,
      manifestPath,
      databaseUpdated: false,
    }),
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
