import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  auditCategories,
  auditUnclassifiedVocabulary,
} from "./unclassified-vocabulary-audit.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const auditRoot = path.join(
  vocabularyRoot,
  "working/topic-classification/audit"
);

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const writeJsonAtomically = async (targetPath: string, value: unknown) => {
  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

async function main() {
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);

  const audit = auditUnclassifiedVocabulary(catalog);
  await mkdir(auditRoot, { recursive: true });
  await Promise.all(
    auditCategories.map((category) =>
      writeJsonAtomically(
        path.join(auditRoot, `${category}.json`),
        audit.reports[category]
      )
    )
  );

  console.log(
    JSON.stringify({
      action: "unclassified-vocabulary-audited",
      totalCatalogRecords: audit.totalCatalogRecords,
      classifiedRecords: audit.classifiedRecords,
      unclassifiedRecords: audit.unclassifiedRecords,
      functionWords: audit.reports["function-words"].totalRecords,
      contentRecoveryCandidates:
        audit.reports["content-recovery-candidates"].totalRecords,
      normalizationReview: audit.reports["normalization-review"].totalRecords,
      outputDirectory: auditRoot,
      providerCalled: false,
      databaseUpdated: false,
    })
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
