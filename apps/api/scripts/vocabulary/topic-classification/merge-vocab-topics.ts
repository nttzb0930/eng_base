import { access, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createClassificationPlan,
  mergeClassifications,
  validateClassificationResults,
  type ClassificationPlan,
} from "./topic-classification.js";
import { collectClassificationOutputs } from "./topic-classification-merge.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const promptPath = path.join(
  vocabularyRoot,
  "prompts/topic-classification.md",
);
const workingRoot = path.join(vocabularyRoot, "working/topic-classification");
const outputRoot = path.join(workingRoot, "output");
const rejectedRoot = path.join(workingRoot, "rejected");
const manifestPath = path.join(workingRoot, "manifest.json");
const backupRoot = path.join(vocabularyRoot, "backups");
const checkOnly = process.argv.slice(2).includes("--check");

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const exists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  const [catalog, topics, plan, prompt] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
    readJson<ClassificationPlan>(manifestPath),
    readFile(promptPath, "utf8"),
  ]);
  assertVocabularySourcesValid(topics, catalog);

  const currentPlan = createClassificationPlan(catalog, plan.batchSize, {
    topics,
    prompt,
  });
  if (!isDeepStrictEqual(currentPlan, plan)) {
    throw new Error(
      "Classification manifest does not match canonical catalog, taxonomy, or prompt",
    );
  }

  const artifacts: unknown[] = [];
  const rejectedBatchIds = new Set<string>();
  for (const batch of plan.batches) {
    const outputPath = path.join(outputRoot, batch.outputFile);
    if (await exists(outputPath)) {
      artifacts.push(await readJson<unknown>(outputPath));
    }
    if (await exists(path.join(rejectedRoot, batch.outputFile))) {
      rejectedBatchIds.add(batch.batchId);
    }
  }

  const collection = collectClassificationOutputs({
    plan,
    artifacts,
    rejectedBatchIds,
    topicSlugs: new Set(topics.map((topic) => topic.slug)),
  });
  if (collection.errors.length > 0) {
    throw new Error(collection.errors.join("\n"));
  }

  const validation = validateClassificationResults(
    plan,
    collection.outputs,
    new Set(topics.map((topic) => topic.slug)),
  );
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join("\n"));
  }

  const merged = mergeClassifications(catalog, validation.records);
  const catalogReport = assertVocabularySourcesValid(topics, merged);
  const report = {
    action: checkOnly
      ? "vocabulary-topic-classification-checked"
      : "vocabulary-topic-classification-merged",
    totalRecords: plan.totalRecords,
    classifiedRecords: validation.classifiedRecords,
    unclassifiedRecords: validation.unclassifiedRecords,
    usedTopicSlugs: catalogReport.usedTopicSlugs.length,
    unusedTopicSlugs: catalogReport.unusedTopicSlugs,
    databaseUpdated: false,
  };

  if (checkOnly) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  await mkdir(backupRoot, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const backupPath = path.join(
    backupRoot,
    `vocabulary-catalog.before-topic-merge.${timestamp}.json`,
  );
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  await copyFile(catalogPath, backupPath);
  await writeFile(temporaryPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  await rename(temporaryPath, catalogPath);
  console.log(JSON.stringify({ ...report, backupPath }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
