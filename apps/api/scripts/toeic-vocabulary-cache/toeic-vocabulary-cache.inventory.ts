import type {
  ToeicVocabularyCacheInventory,
  ToeicVocabularyCacheSource,
  ToeicVocabularyItem,
} from "./toeic-vocabulary-cache.types.js";

type InventoryInput = {
  questionIds: string[];
  batchSize: number;
  workers: number;
  source: ToeicVocabularyCacheSource;
  completed?: Record<string, ToeicVocabularyItem[]>;
  queriedQuestionIds?: string[];
  onBatch?: (
    entries: Record<string, ToeicVocabularyItem[]>,
    queriedQuestionIds: string[]
  ) => Promise<void>;
};

function positiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

export async function inventoryToeicVocabularyCache(
  input: InventoryInput
): Promise<ToeicVocabularyCacheInventory> {
  positiveInteger(input.batchSize, "batchSize");
  positiveInteger(input.workers, "workers");

  const questionIds = [...new Set(input.questionIds)].sort();
  const entries: Record<string, ToeicVocabularyItem[]> = {
    ...(input.completed ?? {}),
  };
  const queried = new Set([
    ...Object.keys(entries),
    ...(input.queriedQuestionIds ?? []),
  ]);
  const pending = questionIds.filter((questionId) => !queried.has(questionId));
  const batches: string[][] = [];
  for (let index = 0; index < pending.length; index += input.batchSize) {
    batches.push(pending.slice(index, index + input.batchSize));
  }

  let cursor = 0;
  const runWorker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      const batch = batches[index];
      if (!batch) return;
      const rows = await input.source.readReady(batch);
      const batchEntries = Object.fromEntries(
        rows.map((row) => [row.questionId, row.vocabulary])
      );
      Object.assign(entries, batchEntries);
      await input.onBatch?.(batchEntries, batch);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(input.workers, Math.max(1, batches.length)) },
      runWorker
    )
  );

  const readyEntries = Object.fromEntries(
    questionIds
      .filter((questionId) => questionId in entries)
      .map((questionId) => [questionId, entries[questionId] ?? []])
  );
  const missingQuestionIds = questionIds.filter(
    (questionId) => !(questionId in readyEntries)
  );

  return {
    questionCount: questionIds.length,
    readyCount: Object.keys(readyEntries).length,
    missingCount: missingQuestionIds.length,
    entries: readyEntries,
    missingQuestionIds,
  };
}
