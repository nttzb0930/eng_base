import { normalizeGrammarSnapshot } from "./toeic-grammar.canonical.js";
import type {
  ToeicGrammarInventory,
  ToeicGrammarQuestion,
  ToeicGrammarSource,
} from "./toeic-grammar.types.js";

type DownloadStorage = {
  readInventory(sha256: string): Promise<unknown>;
  readCheckpoint?(snapshotVersion: string): Promise<unknown>;
  writeCheckpoint?(
    snapshotVersion: string,
    value: unknown
  ): Promise<void>;
  writeSnapshotFile?(
    snapshotVersion: string,
    name: string,
    value: unknown
  ): Promise<void>;
};

type Checkpoint = { units: Record<string, ToeicGrammarQuestion[]> };

function approvedSha(value: string) {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error("approvedSha256 must be an exact SHA-256");
  }
}

function parseInventory(value: unknown): ToeicGrammarInventory {
  if (!value || typeof value !== "object") throw new Error("Invalid inventory");
  return value as ToeicGrammarInventory;
}

function parseCheckpoint(value: unknown): Checkpoint {
  if (!value || typeof value !== "object" || !("units" in value)) {
    return { units: {} };
  }
  return value as Checkpoint;
}

export async function downloadToeicGrammar(input: {
  approvedSha256: string;
  source: ToeicGrammarSource;
  storage: DownloadStorage;
  workers: number;
}) {
  approvedSha(input.approvedSha256);
  if (!Number.isInteger(input.workers) || input.workers < 1 || input.workers > 8) {
    throw new Error("workers must be between 1 and 8");
  }
  const inventory = parseInventory(
    await input.storage.readInventory(input.approvedSha256)
  );
  if (inventory.inventorySha256 !== input.approvedSha256) {
    throw new Error("Approved inventory identity does not match stored inventory");
  }
  if (!input.storage.writeSnapshotFile) {
    throw new Error("Grammar snapshot storage is incomplete");
  }
  const snapshotVersion = input.approvedSha256;
  const checkpoint = parseCheckpoint(
    await input.storage.readCheckpoint?.(snapshotVersion)
  );
  const units = [
    ...inventory.topics.map((topic) => ({
      key: `topic:${topic.sourceTopicId}`,
      read: () => input.source.readTopicQuestions(topic.sourceTopicId),
    })),
    ...inventory.sets.map((set) => ({
      key: `set:${set.sourceSetId}`,
      read: () => input.source.readSetQuestions(set.sourceSetId),
    })),
    ...inventory.difficultyLevels.map((difficulty) => ({
      key: `level:${difficulty.level}`,
      read: () => input.source.readDifficultyQuestions(difficulty.level),
    })),
  ];
  let cursor = 0;
  let checkpointWrite = Promise.resolve();
  const runWorker = async () => {
    while (true) {
      const unit = units[cursor++];
      if (!unit) return;
      if (checkpoint.units[unit.key]) continue;
      checkpoint.units[unit.key] = await unit.read();
      if (input.storage.writeCheckpoint) {
        checkpointWrite = checkpointWrite.then(() =>
          input.storage.writeCheckpoint?.(snapshotVersion, checkpoint)
        );
        await checkpointWrite;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(input.workers, Math.max(1, units.length)) }, () =>
      runWorker()
    )
  );

  const questions = Object.values(checkpoint.units).flat();
  const snapshot = normalizeGrammarSnapshot({
    schemaVersion: 1,
    source: "dautoeic",
    snapshotVersion,
    inventorySha256: inventory.inventorySha256,
    topics: inventory.topics,
    subtopics: inventory.subtopics,
    questions,
    sets: inventory.sets.map((set) => ({
      ...set,
      questionIds: (checkpoint.units[`set:${set.sourceSetId}`] ?? []).map(
        (question) => question.sourceQuestionId
      ),
    })),
    difficultyLevels: inventory.difficultyLevels.map((difficulty) => ({
      level: difficulty.level,
      questionIds: (checkpoint.units[`level:${difficulty.level}`] ?? []).map(
        (question) => question.sourceQuestionId
      ),
    })),
  });
  const validation = {
    schemaVersion: 1,
    valid: true,
    errors: [] as string[],
    validatedAt: new Date().toISOString(),
  };
  const manifest = {
    schemaVersion: 1,
    source: "dautoeic",
    snapshotVersion,
    inventorySha256: inventory.inventorySha256,
    contentSha256: snapshot.contentSha256,
  };
  await input.storage.writeSnapshotFile(snapshotVersion, "content.json", snapshot);
  await input.storage.writeSnapshotFile(
    snapshotVersion,
    "validation.json",
    validation
  );
  await input.storage.writeSnapshotFile(
    snapshotVersion,
    "manifest.json",
    manifest
  );
  return {
    snapshotVersion,
    contentSha256: snapshot.contentSha256,
    questionCount: snapshot.questions.length,
    topicCount: snapshot.topics.length,
    setCount: snapshot.sets.length,
  };
}
