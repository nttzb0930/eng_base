import { createHash } from "node:crypto";

import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

export type ClassificationInputRecord = {
  id: number;
  word: string;
  pos: string;
  meaning: string;
  fullMeaning: string;
};

export type ClassificationBatch = {
  batchId: string;
  inputFile: string;
  outputFile: string;
  inputSha256: string;
  records: ClassificationInputRecord[];
};

export type ClassificationPlan = {
  schemaVersion: 2;
  catalogSha256: string;
  topicTaxonomySha256: string;
  promptSha256: string;
  totalRecords: number;
  batchSize: number;
  batches: ClassificationBatch[];
};

export type ClassificationRecord = {
  id: number;
  topics: string[];
};

export type ClassificationOutput = {
  batchId: string;
  records: ClassificationRecord[];
};

export type ClassificationValidationResult = {
  records: ClassificationRecord[];
  classifiedRecords: number;
  unclassifiedRecords: number;
  errors: string[];
};

export const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");

export function createClassificationPlan(
  catalog: VocabularyCatalogItem[],
  batchSize: number,
  sources: {
    topics: VocabularyTopicDefinition[];
    prompt: string;
  },
): ClassificationPlan {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Classification batch size must be a positive integer");
  }

  const records: ClassificationInputRecord[] = catalog.map((item, index) => ({
    id: index + 1,
    word: item.word,
    pos: item.pos,
    meaning: item.primaryMeaningVi,
    fullMeaning: item.meaningVi,
  }));
  const batches: ClassificationBatch[] = [];

  for (let index = 0; index < records.length; index += batchSize) {
    const batchRecords = records.slice(index, index + batchSize);
    const batchId = `batch-${String(batches.length + 1).padStart(3, "0")}`;
    batches.push({
      batchId,
      inputFile: `${batchId}.json`,
      outputFile: `${batchId}.json`,
      inputSha256: sha256(batchRecords),
      records: batchRecords,
    });
  }

  return {
    schemaVersion: 2,
    catalogSha256: sha256(catalog),
    topicTaxonomySha256: sha256(sources.topics),
    promptSha256: sha256(sources.prompt),
    totalRecords: records.length,
    batchSize,
    batches,
  };
}

export function validateClassificationResults(
  plan: ClassificationPlan,
  outputs: ClassificationOutput[],
  topicSlugs: ReadonlySet<string>,
): ClassificationValidationResult {
  const errors: string[] = [];
  const expectedIds = new Set(
    plan.batches.flatMap((batch) => batch.records.map((record) => record.id)),
  );
  const expectedBatchIds = new Set(plan.batches.map((batch) => batch.batchId));
  const seenBatchIds = new Set<string>();
  const seenIds = new Set<number>();
  const records: ClassificationRecord[] = [];

  for (const output of outputs) {
    if (!expectedBatchIds.has(output.batchId)) {
      errors.push(`Unknown batch id ${output.batchId}`);
    } else if (seenBatchIds.has(output.batchId)) {
      errors.push(`Duplicate batch id ${output.batchId}`);
    } else {
      seenBatchIds.add(output.batchId);
    }

    const expectedIdsForBatch = new Set(
      plan.batches
        .find((batch) => batch.batchId === output.batchId)
        ?.records.map((record) => record.id) ?? [],
    );

    for (const record of output.records) {
      if (!expectedIds.has(record.id)) {
        errors.push(`Unknown record id ${record.id}`);
      } else if (!expectedIdsForBatch.has(record.id)) {
        errors.push(`Record id ${record.id} belongs to a different batch`);
      }
      if (seenIds.has(record.id)) {
        errors.push(`Duplicate record id ${record.id}`);
      } else {
        seenIds.add(record.id);
        records.push({ id: record.id, topics: [...record.topics] });
      }
      if (record.topics.length > 1) {
        errors.push(`Record id ${record.id} must have at most one topic`);
      }
      for (const slug of record.topics) {
        if (!topicSlugs.has(slug)) {
          errors.push(`Unknown topic slug "${slug}" for record id ${record.id}`);
        }
      }
    }
  }

  for (const batchId of expectedBatchIds) {
    if (!seenBatchIds.has(batchId)) errors.push(`Missing batch id ${batchId}`);
  }
  for (const id of expectedIds) {
    if (!seenIds.has(id)) errors.push(`Missing record id ${id}`);
  }

  records.sort((left, right) => left.id - right.id);
  const classifiedRecords = records.filter(
    (record) => record.topics.length > 0,
  ).length;

  return {
    records,
    classifiedRecords,
    unclassifiedRecords: records.length - classifiedRecords,
    errors,
  };
}

export function validateClassificationBatchResponse(
  batch: ClassificationBatch,
  records: ClassificationRecord[],
  topicSlugs: ReadonlySet<string>,
): ClassificationValidationResult {
  return validateClassificationResults(
    {
      schemaVersion: 2,
      catalogSha256: "single-batch-validation",
      topicTaxonomySha256: "single-batch-validation",
      promptSha256: "single-batch-validation",
      totalRecords: batch.records.length,
      batchSize: batch.records.length,
      batches: [batch],
    },
    [{ batchId: batch.batchId, records }],
    topicSlugs,
  );
}

export function mergeClassifications(
  catalog: VocabularyCatalogItem[],
  records: ClassificationRecord[],
): VocabularyCatalogItem[] {
  const topicsById = new Map(records.map((record) => [record.id, record.topics]));

  return catalog.map((item, index) => {
    const id = index + 1;
    const topics = topicsById.get(id);
    if (!topics) throw new Error(`Missing classification for record id ${id}`);
    return { ...item, topics: [...topics] };
  });
}
