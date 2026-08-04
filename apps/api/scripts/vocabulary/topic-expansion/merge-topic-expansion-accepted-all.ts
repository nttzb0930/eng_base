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
const expansionRoot = path.join(vocabularyRoot, "working/topic-expansion");
const reportRoot = path.join(expansionRoot, "reports");
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

const writeJsonAtomically = async (targetPath: string, value: unknown) => {
  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, targetPath);
};

const parseArguments = (args: string[]) => {
  let json = false;
  for (const argument of args) {
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    throw new Error(`Unknown Topic expansion merge-all flag "${argument}"`);
  }
  return { json };
};

const readAcceptedArtifacts = async (topics: VocabularyTopicDefinition[]) => {
  const artifacts: Array<{
    topicSlug: string;
    fileName: string;
    artifact: TopicExpansionArtifact;
  }> = [];

  for (const topic of topics.sort((left, right) => left.order - right.order)) {
    const topicExpansionRoot = path.join(expansionRoot, topic.slug);
    const fileNames = (await readDirIfExists(topicExpansionRoot))
      .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
      .sort();

    for (const fileName of fileNames) {
      const artifact = await readJson<TopicExpansionArtifact>(
        path.join(topicExpansionRoot, fileName)
      );
      if (artifact.status !== "accepted") continue;
      artifacts.push({ topicSlug: topic.slug, fileName, artifact });
    }
  }

  return artifacts;
};

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);

  const acceptedArtifacts = await readAcceptedArtifacts(topics);
  if (acceptedArtifacts.length < 1) {
    throw new Error("No accepted Topic expansion chunks found");
  }

  const merged = acceptedArtifacts.reduce(
    (currentCatalog, entry) =>
      mergeAcceptedExpansion(currentCatalog, entry.artifact, topics),
    catalog
  );
  const sourceReport = assertVocabularySourcesValid(topics, merged);

  await mkdir(backupRoot, { recursive: true });
  await mkdir(reportRoot, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const backupPath = path.join(
    backupRoot,
    `vocabulary-catalog.before-all-topic-expansion.${timestamp}.json`
  );
  const reportPath = path.join(
    reportRoot,
    `topic-expansion-merge-all.${timestamp}.json`
  );

  await copyFile(catalogPath, backupPath);
  await writeJsonAtomically(catalogPath, merged);

  const report = {
    action: "vocabulary-topic-expansion-accepted-all-merged",
    mergedChunks: acceptedArtifacts.length,
    addedWords: acceptedArtifacts.reduce(
      (total, entry) => total + entry.artifact.words.length,
      0
    ),
    catalogItems: sourceReport.catalogItemCount,
    backupPath,
    reportPath,
    databaseUpdated: false,
    topics: [...new Set(acceptedArtifacts.map((entry) => entry.topicSlug))].map(
      (topicSlug) => ({
        topicSlug,
        mergedChunks: acceptedArtifacts.filter(
          (entry) => entry.topicSlug === topicSlug
        ).length,
        addedWords: acceptedArtifacts
          .filter((entry) => entry.topicSlug === topicSlug)
          .reduce((total, entry) => total + entry.artifact.words.length, 0),
      })
    ),
  };

  await writeJsonAtomically(reportPath, report);
  console.log(
    arguments_.json ? JSON.stringify(report) : JSON.stringify(report, null, 2)
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
