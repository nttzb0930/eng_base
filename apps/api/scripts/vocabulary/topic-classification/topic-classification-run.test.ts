import assert from "node:assert/strict";
import test from "node:test";

import { createClassificationPlan } from "./topic-classification.js";
import type { ClassificationExecutionIdentity } from "./topic-classification-run.js";
import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

const topics: VocabularyTopicDefinition[] = [
  {
    slug: "airport",
    title: "Airport",
    titleVi: "Sân bay",
    description: "Airport vocabulary.",
    descriptionVi: "Từ vựng dùng tại sân bay.",
    order: 1,
    group: "Travel",
    groupVi: "Du lịch",
  },
];

const catalog: VocabularyCatalogItem[] = [
  {
    word: "airport",
    normalizedWord: "airport",
    pos: "noun",
    posVi: "danh từ",
    cefrLevel: "A1",
    meaningVi: "sân bay",
    primaryMeaningVi: "sân bay",
    source: "fixture",
    topics: [],
  },
];

type RunModule = {
  createClassificationExecutionIdentity?: (input: {
    plan: ReturnType<typeof createClassificationPlan>;
    batch: ReturnType<typeof createClassificationPlan>["batches"][number];
    provider: "gemini" | "openai-compatible";
    model: string;
  }) => ClassificationExecutionIdentity;
  validateReusableClassificationOutput?: (
    value: unknown,
    expectedIdentity: ClassificationExecutionIdentity,
    batch: ReturnType<typeof createClassificationPlan>["batches"][number],
    topicSlugs: ReadonlySet<string>,
  ) => { reusable: boolean; reason: string };
  createClassificationProgressReporter?: (input: {
    debug: boolean;
    write: (line: string) => void;
  }) => {
    emit: (event: Record<string, unknown>) => void;
  };
  sanitizeProviderError?: (error: unknown) => {
    code: string;
    message: string;
  };
  getClassificationRunExitCode?: (summary: {
    requested: number;
    succeeded: number;
    reused: number;
    rejected: number;
  }) => 0 | 1;
};

const plan = createClassificationPlan(catalog, 50, {
  topics,
  prompt: "Classify every record.",
});
const batch = plan.batches[0]!;

async function loadRunModule() {
  return import("./topic-classification-run.js")
    .then((module) => module as RunModule)
    .catch(() => ({} as RunModule));
}

test("execution identity is deterministic and includes provider and model", async () => {
  const { createClassificationExecutionIdentity } = await loadRunModule();
  assert.equal(typeof createClassificationExecutionIdentity, "function");
  if (!createClassificationExecutionIdentity) return;

  const input = {
    plan,
    batch,
    provider: "openai-compatible" as const,
    model: "gemini-3-flash",
  };
  const first = createClassificationExecutionIdentity(input);
  const second = createClassificationExecutionIdentity(input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 2);
  assert.equal(first.provider, "openai-compatible");
  assert.equal(first.model, "gemini-3-flash");
  assert.match(String(first.executionSha256), /^[a-f0-9]{64}$/u);
});

test("only an exact v2 output identity is reusable", async () => {
  const {
    createClassificationExecutionIdentity,
    validateReusableClassificationOutput,
  } = await loadRunModule();
  assert.equal(typeof createClassificationExecutionIdentity, "function");
  assert.equal(typeof validateReusableClassificationOutput, "function");
  if (
    !createClassificationExecutionIdentity ||
    !validateReusableClassificationOutput
  ) {
    return;
  }

  const identity = createClassificationExecutionIdentity({
    plan,
    batch,
    provider: "openai-compatible",
    model: "gemini-3-flash",
  });
  const output = {
    ...identity,
    records: [{ id: 1, topics: ["airport"] }],
  };

  assert.deepEqual(
    validateReusableClassificationOutput(
      output,
      identity,
      batch,
      new Set(["airport"]),
    ),
    { reusable: true, reason: "exact-match" },
  );
});

test("stale and legacy outputs expose bounded mismatch reasons", async () => {
  const {
    createClassificationExecutionIdentity,
    validateReusableClassificationOutput,
  } = await loadRunModule();
  assert.equal(typeof createClassificationExecutionIdentity, "function");
  assert.equal(typeof validateReusableClassificationOutput, "function");
  if (
    !createClassificationExecutionIdentity ||
    !validateReusableClassificationOutput
  ) {
    return;
  }

  const identity = createClassificationExecutionIdentity({
    plan,
    batch,
    provider: "openai-compatible",
    model: "gemini-3-flash",
  });
  const validate = (value: unknown) =>
    validateReusableClassificationOutput(
      value,
      identity,
      batch,
      new Set(["airport"]),
    );

  assert.deepEqual(validate({ records: [] }), {
    reusable: false,
    reason: "schema-version-mismatch",
  });
  assert.deepEqual(
    validate({
      ...identity,
      inputSha256: "stale",
      records: [{ id: 1, topics: ["airport"] }],
    }),
    { reusable: false, reason: "input-sha256-mismatch" },
  );
  assert.deepEqual(
    validate({
      ...identity,
      provider: "gemini",
      records: [{ id: 1, topics: ["airport"] }],
    }),
    { reusable: false, reason: "provider-mismatch" },
  );
});

test("basic progress events always emit and discard sensitive details", async () => {
  const { createClassificationProgressReporter } = await loadRunModule();
  assert.equal(typeof createClassificationProgressReporter, "function");
  if (!createClassificationProgressReporter) return;

  const lines: string[] = [];
  const reporter = createClassificationProgressReporter({
    debug: false,
    write: (line) => lines.push(line),
  });
  reporter.emit({
    event: "batch-success",
    batchId: "batch-001",
    batchIndex: 1,
    totalBatches: 60,
    durationMs: 1200,
    provider: "openai-compatible",
    model: "gemini-3-flash",
    inputSha256: "a".repeat(64),
    executionSha256: "b".repeat(64),
    prompt: "full prompt must never be logged",
    apiKey: "sk-secret-value",
    rawResponse: "full response must never be logged",
  });

  assert.equal(lines.length, 1);
  const output = lines[0]!;
  assert.match(output, /"event":"batch-success"/u);
  assert.match(output, /"batchId":"batch-001"/u);
  assert.match(output, /"durationMs":1200/u);
  assert.doesNotMatch(
    output,
    /provider|model|Sha256|prompt|apiKey|rawResponse|sk-secret/u,
  );
});

test("debug progress adds bounded provider and fingerprint metadata", async () => {
  const { createClassificationProgressReporter } = await loadRunModule();
  assert.equal(typeof createClassificationProgressReporter, "function");
  if (!createClassificationProgressReporter) return;

  const lines: string[] = [];
  const reporter = createClassificationProgressReporter({
    debug: true,
    write: (line) => lines.push(line),
  });
  reporter.emit({
    event: "batch-stale",
    batchId: "batch-001",
    batchIndex: 1,
    totalBatches: 60,
    reason: "input-sha256-mismatch",
    provider: "openai-compatible",
    model: "gemini-3-flash",
    inputSha256: "a".repeat(64),
    executionSha256: "b".repeat(64),
    recordCount: 50,
  });

  const output = JSON.parse(lines[0]!) as Record<string, unknown>;
  assert.equal(output.provider, "openai-compatible");
  assert.equal(output.model, "gemini-3-flash");
  assert.equal(output.inputFingerprint, "a".repeat(12));
  assert.equal(output.executionFingerprint, "b".repeat(12));
  assert.equal(output.reason, "input-sha256-mismatch");
  assert.equal(output.recordCount, 50);
  assert.equal("inputSha256" in output, false);
  assert.equal("executionSha256" in output, false);
});

test("provider errors are bounded and credentials are redacted", async () => {
  const { sanitizeProviderError } = await loadRunModule();
  assert.equal(typeof sanitizeProviderError, "function");
  if (!sanitizeProviderError) return;

  const sanitized = sanitizeProviderError(
    new Error(
      `Bearer top-secret sk-secret-value https://user:password@example.com/${"x".repeat(300)}`,
    ),
  );

  assert.equal(sanitized.code, "PROVIDER_ERROR");
  assert.ok(sanitized.message.length <= 160);
  assert.doesNotMatch(
    sanitized.message,
    /top-secret|sk-secret-value|user:password|https?:\/\//u,
  );
  assert.equal(
    sanitizeProviderError(new Error("AI provider returned HTTP 429")).code,
    "HTTP_429",
  );
});

test("rejected or missing batches make the runner fail nonzero", async () => {
  const { getClassificationRunExitCode } = await loadRunModule();
  assert.equal(typeof getClassificationRunExitCode, "function");
  if (!getClassificationRunExitCode) return;

  assert.equal(
    getClassificationRunExitCode({
      requested: 2,
      succeeded: 1,
      reused: 1,
      rejected: 0,
    }),
    0,
  );
  assert.equal(
    getClassificationRunExitCode({
      requested: 2,
      succeeded: 1,
      reused: 0,
      rejected: 0,
    }),
    1,
  );
  assert.equal(
    getClassificationRunExitCode({
      requested: 2,
      succeeded: 1,
      reused: 0,
      rejected: 1,
    }),
    1,
  );
});
