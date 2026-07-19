import {
  sha256,
  validateClassificationBatchResponse,
  type ClassificationBatch,
  type ClassificationPlan,
  type ClassificationRecord,
} from "./topic-classification.js";

export type ClassificationProvider = "gemini" | "openai-compatible";

export type ClassificationExecutionIdentity = {
  schemaVersion: 2;
  batchId: string;
  inputSha256: string;
  catalogSha256: string;
  topicTaxonomySha256: string;
  promptSha256: string;
  provider: ClassificationProvider;
  model: string;
  executionSha256: string;
};

export type ClassificationOutputArtifact = ClassificationExecutionIdentity & {
  records: ClassificationRecord[];
};

export type ReuseValidationResult = {
  reusable: boolean;
  reason: string;
};

export type ClassificationRunSummary = {
  requested: number;
  succeeded: number;
  reused: number;
  rejected: number;
};

export type ClassificationProgressEvent = {
  event: string;
  batchId?: string;
  batchIndex?: number;
  totalBatches?: number;
  durationMs?: number;
  requested?: number;
  succeeded?: number;
  reused?: number;
  stale?: number;
  rejected?: number;
  concurrency?: number;
  reason?: string;
  provider?: string;
  model?: string;
  inputSha256?: string;
  executionSha256?: string;
  recordCount?: number;
};

const definedEntries = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

export function createClassificationProgressReporter(input: {
  debug: boolean;
  write: (line: string) => void;
}) {
  return {
    emit(event: ClassificationProgressEvent | Record<string, unknown>) {
      const typedEvent = event as ClassificationProgressEvent;
      const basic = {
        event: typedEvent.event,
        batchId: typedEvent.batchId,
        batchIndex: typedEvent.batchIndex,
        totalBatches: typedEvent.totalBatches,
        durationMs: typedEvent.durationMs,
        requested: typedEvent.requested,
        succeeded: typedEvent.succeeded,
        reused: typedEvent.reused,
        stale: typedEvent.stale,
        rejected: typedEvent.rejected,
        concurrency: typedEvent.concurrency,
      };
      const debug = input.debug
        ? {
            reason: typedEvent.reason,
            provider: typedEvent.provider,
            model: typedEvent.model,
            inputFingerprint: typedEvent.inputSha256?.slice(0, 12),
            executionFingerprint: typedEvent.executionSha256?.slice(0, 12),
            recordCount: typedEvent.recordCount,
          }
        : {};

      input.write(JSON.stringify(definedEntries({ ...basic, ...debug })));
    },
  };
}

export function sanitizeProviderError(error: unknown) {
  const original = error instanceof Error ? error.message : String(error);
  const httpStatus = original.match(/\bHTTP\s+(\d{3})\b/iu)?.[1];
  const redacted = original
    .replace(/\bBearer\s+\S+/giu, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/gu, "[REDACTED_KEY]")
    .replace(/\b(?:https?|postgres(?:ql)?):\/\/\S+/giu, "[REDACTED_URL]")
    .replace(/\s+/gu, " ")
    .trim();

  return {
    code: httpStatus ? `HTTP_${httpStatus}` : "PROVIDER_ERROR",
    message: redacted.slice(0, 160),
  };
}

export function getClassificationRunExitCode(
  summary: ClassificationRunSummary,
): 0 | 1 {
  const completed = summary.succeeded + summary.reused;
  return summary.rejected === 0 && completed === summary.requested ? 0 : 1;
}

export function createClassificationExecutionIdentity(input: {
  plan: ClassificationPlan;
  batch: ClassificationBatch;
  provider: ClassificationProvider;
  model: string;
}): ClassificationExecutionIdentity {
  const identity = {
    schemaVersion: 2 as const,
    batchId: input.batch.batchId,
    inputSha256: input.batch.inputSha256,
    catalogSha256: input.plan.catalogSha256,
    topicTaxonomySha256: input.plan.topicTaxonomySha256,
    promptSha256: input.plan.promptSha256,
    provider: input.provider,
    model: input.model,
  };

  return {
    ...identity,
    executionSha256: sha256(identity),
  };
}

export function validateReusableClassificationOutput(
  value: unknown,
  expectedIdentity: ClassificationExecutionIdentity,
  batch: ClassificationBatch,
  topicSlugs: ReadonlySet<string>,
): ReuseValidationResult {
  if (!value || typeof value !== "object") {
    return { reusable: false, reason: "invalid-output" };
  }

  const output = value as Partial<ClassificationOutputArtifact>;
  const comparisons = [
    ["schemaVersion", "schema-version-mismatch"],
    ["batchId", "batch-id-mismatch"],
    ["inputSha256", "input-sha256-mismatch"],
    ["catalogSha256", "catalog-sha256-mismatch"],
    ["topicTaxonomySha256", "taxonomy-sha256-mismatch"],
    ["promptSha256", "prompt-sha256-mismatch"],
    ["provider", "provider-mismatch"],
    ["model", "model-mismatch"],
    ["executionSha256", "execution-sha256-mismatch"],
  ] as const;

  for (const [field, reason] of comparisons) {
    if (output[field] !== expectedIdentity[field]) {
      return { reusable: false, reason };
    }
  }

  if (!Array.isArray(output.records)) {
    return { reusable: false, reason: "invalid-records" };
  }

  const validation = validateClassificationBatchResponse(
    batch,
    output.records,
    topicSlugs,
  );
  if (validation.errors.length > 0) {
    return { reusable: false, reason: "record-validation-failed" };
  }

  return { reusable: true, reason: "exact-match" };
}
