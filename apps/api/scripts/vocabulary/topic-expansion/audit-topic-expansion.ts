import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  candidateIdentity,
  validateExpansionArtifact,
  type TopicCandidateArtifact,
  type TopicExpansionArtifact,
} from "./topic-expansion.js";
import {
  assertVocabularySourcesValid,
  vocabularyIdentity,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

type AuditEntry = {
  topic: string;
  fileName: string;
  statusBefore: TopicExpansionArtifact["status"];
  statusAfter: TopicExpansionArtifact["status"];
  words: number;
  accepted: boolean;
  errors: string[];
};

type AuditReport = {
  action: "vocabulary-topic-expansion-audited";
  acceptValid: boolean;
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  acceptedFiles: number;
  reviewFiles: number;
  rejectedFiles: number;
  totalWords: number;
  acceptedWords: number;
  invalidWords: number;
  reportPath: string;
  databaseUpdated: false;
  entries: AuditEntry[];
};

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const candidateRoot = path.join(vocabularyRoot, "working/topic-candidates");
const expansionRoot = path.join(vocabularyRoot, "working/topic-expansion");
const reportRoot = path.join(expansionRoot, "reports");

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

const parseArguments = (args: string[]) => {
  let acceptValid = false;
  let json = false;

  for (const argument of args) {
    if (argument === "--") continue;
    if (argument === "--accept-valid") {
      acceptValid = true;
      continue;
    }
    if (argument === "--json") {
      json = true;
      continue;
    }
    throw new Error(`Unknown Topic expansion audit flag "${argument}"`);
  }

  return { acceptValid, json };
};

const readTopicCandidateIdentities = async (topicSlug: string) => {
  const topicCandidateRoot = path.join(candidateRoot, topicSlug);
  const candidateFileNames = (await readDirIfExists(topicCandidateRoot))
    .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
    .sort();
  const identities = new Set<string>();

  for (const fileName of candidateFileNames) {
    const artifact = await readJson<TopicCandidateArtifact>(
      path.join(topicCandidateRoot, fileName)
    );
    if (artifact.targetTopicSlug !== topicSlug) continue;
    for (const candidate of artifact.candidates) {
      identities.add(candidateIdentity(candidate));
    }
  }

  return identities;
};

const validateCandidateIdentities = (
  artifact: TopicExpansionArtifact,
  candidateIdentities: Set<string>
) => {
  const errors: string[] = [];
  for (const word of artifact.words) {
    const identity = vocabularyIdentity(word);
    if (!candidateIdentities.has(identity)) {
      errors.push(
        `Vocabulary "${identity}" does not match a reviewed Topic candidate`
      );
    }
  }
  return errors;
};

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);

  const entries: AuditEntry[] = [];
  const acceptedCatalog: VocabularyCatalogItem[] = [...catalog];
  const candidateIdentitiesByTopic = new Map<string, Set<string>>();

  for (const topic of topics.sort((left, right) => left.order - right.order)) {
    const topicExpansionRoot = path.join(expansionRoot, topic.slug);
    const fileNames = (await readDirIfExists(topicExpansionRoot))
      .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
      .sort();
    if (fileNames.length < 1) continue;

    const candidateIdentities =
      candidateIdentitiesByTopic.get(topic.slug) ??
      (await readTopicCandidateIdentities(topic.slug));
    candidateIdentitiesByTopic.set(topic.slug, candidateIdentities);

    for (const fileName of fileNames) {
      const filePath = path.join(topicExpansionRoot, fileName);
      const artifact = await readJson<TopicExpansionArtifact>(filePath);
      const identityErrors = validateCandidateIdentities(
        artifact,
        candidateIdentities
      );
      const validation = validateExpansionArtifact(
        acceptedCatalog,
        artifact,
        topics
      );
      const errors = [...identityErrors, ...validation.errors];
      const statusBefore = artifact.status;
      let statusAfter = artifact.status;
      let accepted = false;

      if (errors.length === 0) {
        acceptedCatalog.push(...artifact.words);
        if (arguments_.acceptValid && artifact.status !== "accepted") {
          statusAfter = "accepted";
          await writeJsonAtomically(filePath, {
            ...artifact,
            status: statusAfter,
          });
          accepted = true;
        }
      }

      entries.push({
        topic: topic.slug,
        fileName,
        statusBefore,
        statusAfter,
        words: artifact.words.length,
        accepted,
        errors,
      });
    }
  }

  await mkdir(reportRoot, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const reportPath = path.join(
    reportRoot,
    `topic-expansion-audit.${timestamp}.json`
  );
  const report: AuditReport = {
    action: "vocabulary-topic-expansion-audited",
    acceptValid: arguments_.acceptValid,
    totalFiles: entries.length,
    validFiles: entries.filter((entry) => entry.errors.length === 0).length,
    invalidFiles: entries.filter((entry) => entry.errors.length > 0).length,
    acceptedFiles: entries.filter((entry) => entry.statusAfter === "accepted")
      .length,
    reviewFiles: entries.filter((entry) => entry.statusAfter === "review")
      .length,
    rejectedFiles: entries.filter((entry) => entry.statusAfter === "rejected")
      .length,
    totalWords: entries.reduce((total, entry) => total + entry.words, 0),
    acceptedWords: entries
      .filter((entry) => entry.statusAfter === "accepted")
      .reduce((total, entry) => total + entry.words, 0),
    invalidWords: entries
      .filter((entry) => entry.errors.length > 0)
      .reduce((total, entry) => total + entry.words, 0),
    reportPath,
    databaseUpdated: false,
    entries,
  };

  await writeJsonAtomically(reportPath, report);
  const summary = { ...report, entries: undefined };
  console.log(
    arguments_.json ? JSON.stringify(summary) : JSON.stringify(summary, null, 2)
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
