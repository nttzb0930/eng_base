import {
  createClassificationExecutionIdentity,
  validateReusableClassificationOutput,
  type ClassificationOutputArtifact,
  type ClassificationProvider,
} from "./topic-classification-run.js";
import type {
  ClassificationOutput,
  ClassificationPlan,
} from "./topic-classification.js";

export type ClassificationOutputCollection = {
  outputs: ClassificationOutput[];
  errors: string[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const isProvider = (value: unknown): value is ClassificationProvider =>
  value === "gemini" || value === "openai-compatible";

export function collectClassificationOutputs(input: {
  plan: ClassificationPlan;
  artifacts: unknown[];
  rejectedBatchIds: ReadonlySet<string>;
  topicSlugs: ReadonlySet<string>;
}): ClassificationOutputCollection {
  const errors: string[] = [];
  const outputs: ClassificationOutput[] = [];
  const expectedBatchIds = new Set(
    input.plan.batches.map((batch) => batch.batchId),
  );
  const artifactsByBatchId = new Map<string, unknown[]>();

  for (const artifact of input.artifacts) {
    const record = asRecord(artifact);
    const batchId = typeof record?.batchId === "string" ? record.batchId : null;
    if (!batchId) {
      errors.push("Classification output has no batch id");
      continue;
    }
    if (!expectedBatchIds.has(batchId)) {
      errors.push(`Unknown batch id ${batchId}`);
      continue;
    }
    const matches = artifactsByBatchId.get(batchId) ?? [];
    matches.push(artifact);
    artifactsByBatchId.set(batchId, matches);
  }

  const executionSignatures = new Set<string>();

  for (const batch of input.plan.batches) {
    if (input.rejectedBatchIds.has(batch.batchId)) {
      errors.push(`Rejected batch id ${batch.batchId}`);
    }

    const matches = artifactsByBatchId.get(batch.batchId) ?? [];
    if (matches.length === 0) {
      errors.push(`Missing batch id ${batch.batchId}`);
      continue;
    }
    if (matches.length > 1) {
      errors.push(`Duplicate batch id ${batch.batchId}`);
      continue;
    }

    const artifact = asRecord(matches[0]);
    if (!artifact || artifact.schemaVersion !== 2) {
      errors.push(`Batch ${batch.batchId}: schema-version-mismatch`);
      continue;
    }
    if (!isProvider(artifact.provider)) {
      errors.push(`Batch ${batch.batchId}: provider-mismatch`);
      continue;
    }
    if (typeof artifact.model !== "string" || !artifact.model.trim()) {
      errors.push(`Batch ${batch.batchId}: model-mismatch`);
      continue;
    }

    executionSignatures.add(`${artifact.provider}|${artifact.model}`);
    const identity = createClassificationExecutionIdentity({
      plan: input.plan,
      batch,
      provider: artifact.provider,
      model: artifact.model,
    });
    const reuse = validateReusableClassificationOutput(
      artifact,
      identity,
      batch,
      input.topicSlugs,
    );
    if (!reuse.reusable) {
      errors.push(`Batch ${batch.batchId}: ${reuse.reason}`);
      continue;
    }

    const output = artifact as ClassificationOutputArtifact;
    outputs.push({
      batchId: batch.batchId,
      records: output.records.map((record) => ({
        id: record.id,
        topics: [...record.topics],
      })),
    });
  }

  if (executionSignatures.size > 1) {
    errors.push("Mixed classification providers or models");
  }

  return { outputs, errors };
}
