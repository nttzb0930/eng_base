import { access, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createClassificationPlan,
  mergeClassifications,
  validateClassificationResults,
  type ClassificationOutput,
  type ClassificationPlan,
} from "./lib/topic-classification.js";
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
const outputRoot = path.join(workingRoot, "output");
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
  const [catalog, topics, plan] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
    readJson<ClassificationPlan>(manifestPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);

  const currentPlan = createClassificationPlan(catalog, plan.batchSize);
  if (currentPlan.catalogSha256 !== plan.catalogSha256) {
    throw new Error("Classification manifest does not match the canonical catalog");
  }

  const outputs: ClassificationOutput[] = [];
  for (const batch of plan.batches) {
    const outputPath = path.join(outputRoot, batch.outputFile);
    if (!(await exists(outputPath))) continue;
    const output = await readJson<{ records: ClassificationOutput["records"] }>(
      outputPath,
    );
    outputs.push({ batchId: batch.batchId, records: output.records });
  }

  const validation = validateClassificationResults(
    plan,
    outputs,
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
