import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
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

const readDirIfExists = async (directoryPath: string): Promise<string[]> => {
  try {
    return await readdir(directoryPath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

async function main() {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const allAccepted = args.includes("--all-accepted");
  const topicSlug = args.find((argument) => !argument.startsWith("--"));
  if (!topicSlug) {
    throw new Error(
      "Topic slug is required: data:merge-topic-expansion -- <slug>"
    );
  }
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);

  const artifacts = allAccepted
    ? (
        await Promise.all(
          (await readDirIfExists(path.join(outputRoot, topicSlug)))
            .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
            .sort()
            .map((fileName) =>
              readJson<TopicExpansionArtifact>(
                path.join(outputRoot, topicSlug, fileName)
              )
            )
        )
      ).filter((artifact) => artifact.status === "accepted")
    : [
        await readJson<TopicExpansionArtifact>(
          path.join(outputRoot, `${topicSlug}.json`)
        ),
      ];
  if (artifacts.length < 1) {
    throw new Error(`Topic "${topicSlug}" has no accepted expansion chunks`);
  }

  const merged = artifacts.reduce(
    (currentCatalog, artifact) =>
      mergeAcceptedExpansion(currentCatalog, artifact, topics),
    catalog
  );
  const report = assertVocabularySourcesValid(topics, merged);

  await mkdir(backupRoot, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const backupPath = path.join(
    backupRoot,
    `vocabulary-catalog.before-${topicSlug}-expansion.${timestamp}.json`
  );
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  await copyFile(catalogPath, backupPath);
  await writeFile(
    temporaryPath,
    `${JSON.stringify(merged, null, 2)}\n`,
    "utf8"
  );
  await rename(temporaryPath, catalogPath);
  console.log(
    JSON.stringify({
      action: "vocabulary-topic-expansion-merged",
      ...(allAccepted
        ? { action: "vocabulary-topic-expansion-chunks-merged" }
        : {}),
      topic: topicSlug,
      addedWords: artifacts.reduce(
        (total, artifact) => total + artifact.words.length,
        0
      ),
      mergedChunks: allAccepted ? artifacts.length : undefined,
      catalogItems: report.catalogItemCount,
      backupPath,
      databaseUpdated: false,
    })
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
