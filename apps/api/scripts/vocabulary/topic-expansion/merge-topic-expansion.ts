import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  mergeAcceptedExpansion,
  type TopicExpansionArtifact,
} from "./topic-expansion.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const outputRoot = path.join(vocabularyRoot, "working/topic-expansion");
const backupRoot = path.join(vocabularyRoot, "backups");

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

async function main() {
  const topicSlug = process.argv
    .slice(2)
    .find((argument) => !argument.startsWith("--"));
  if (!topicSlug) {
    throw new Error("Topic slug is required: data:merge-topic-expansion -- <slug>");
  }
  const artifactPath = path.join(outputRoot, `${topicSlug}.json`);
  const [catalog, topics, artifact] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
    readJson<TopicExpansionArtifact>(artifactPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const merged = mergeAcceptedExpansion(catalog, artifact, topics);
  const report = assertVocabularySourcesValid(topics, merged);

  await mkdir(backupRoot, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const backupPath = path.join(
    backupRoot,
    `vocabulary-catalog.before-${topicSlug}-expansion.${timestamp}.json`,
  );
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  await copyFile(catalogPath, backupPath);
  await writeFile(temporaryPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  await rename(temporaryPath, catalogPath);
  console.log(
    JSON.stringify({
      action: "vocabulary-topic-expansion-merged",
      topic: topicSlug,
      addedWords: artifact.words.length,
      catalogItems: report.catalogItemCount,
      backupPath,
      databaseUpdated: false,
    }),
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
