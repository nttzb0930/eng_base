import { loadToeicVocabularyCacheRuntime } from "./toeic-vocabulary-cache.cli.js";
import { inventoryToeicVocabularyCache } from "./toeic-vocabulary-cache.inventory.js";
import { loadLocalToeicVocabularyScope } from "./toeic-vocabulary-cache.local.js";
import { checkpointEntries, sha256 } from "./toeic-vocabulary-cache.storage.js";

async function main() {
  const runtime = loadToeicVocabularyCacheRuntime(process.argv.slice(2));
  const readingInventorySha256 =
    runtime.options.readingInventorySha256 ??
    (await runtime.storage.latestReadingInventorySha256());
  const scope = await loadLocalToeicVocabularyScope({
    repositoryRoot: runtime.repositoryRoot,
    readingInventorySha256,
  });
  if (scope.questionIds.length === 0) {
    throw new Error("No local TOEIC questions were found for the inventory");
  }
  const scopeSha256 = sha256({
    readingInventorySha256,
    sourceTestIds: scope.sourceTestIds,
    questionIds: scope.questionIds,
  });
  const checkpoint = await runtime.storage.readCheckpoint(scopeSha256);
  const entries = checkpointEntries(checkpoint);
  const queried = new Set(checkpoint?.queriedQuestionIds ?? []);
  let writeQueue = Promise.resolve();

  const result = await inventoryToeicVocabularyCache({
    questionIds: scope.questionIds,
    batchSize: runtime.options.batchSize,
    workers: runtime.options.workers,
    source: runtime.source,
    completed: entries,
    queriedQuestionIds: [...queried],
    async onBatch(batchEntries, queriedQuestionIds) {
      Object.assign(entries, batchEntries);
      queriedQuestionIds.forEach((questionId) => queried.add(questionId));
      const snapshot = {
        schemaVersion: 1 as const,
        scopeSha256,
        completed: false,
        queriedQuestionIds: [...queried].sort(),
        entries: { ...entries },
      };
      writeQueue = writeQueue.then(() =>
        runtime.storage.writeCheckpoint(snapshot)
      );
      await writeQueue;
    },
  });
  await writeQueue;

  const deterministic = {
    schemaVersion: 1 as const,
    source: "dautoeic" as const,
    readingInventorySha256,
    sourceTestIds: scope.sourceTestIds,
    questionIds: scope.questionIds,
    entries: result.entries,
    missingQuestionIds: result.missingQuestionIds,
  };
  const inventorySha256 = sha256(deterministic);
  const observedAt = new Date().toISOString();
  const storageKey = await runtime.storage.writeInventory(inventorySha256, {
    ...deterministic,
    observedAt,
    inventorySha256,
  });
  await runtime.storage.writeCheckpoint({
    schemaVersion: 1,
    scopeSha256,
    completed: true,
    queriedQuestionIds: scope.questionIds,
    entries: result.entries,
  });

  console.log(
    JSON.stringify(
      {
        storageKey,
        inventorySha256,
        selectedTestCount: scope.sourceTestIds.length,
        questionCount: result.questionCount,
        readyCount: result.readyCount,
        missingCount: result.missingCount,
        vocabularyItemCount: Object.values(result.entries).reduce(
          (total, vocabulary) => total + vocabulary.length,
          0
        ),
        resumedQuestionCount: checkpoint?.queriedQuestionIds.length ?? 0,
        workers: runtime.options.workers,
        batchSize: runtime.options.batchSize,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error
          ? error.message
          : "TOEIC vocabulary cache inventory failed",
    })
  );
  process.exitCode = 1;
});
