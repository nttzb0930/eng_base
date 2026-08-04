import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createClassificationPlan,
  validateClassificationBatchResponse,
  type ClassificationRecord,
  type ClassificationOutput,
  type ClassificationPlan,
} from "./topic-classification.js";
import {
  createClassificationExecutionIdentity,
  createClassificationProgressReporter,
  getClassificationRunExitCode,
  sanitizeProviderError,
  validateReusableClassificationOutput,
  type ClassificationProvider,
  type ClassificationRunSummary,
} from "./topic-classification-run.js";
import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

type ProviderResponse = {
  schemaVersion: 1;
  classifications: ClassificationOutput["records"];
};

type AiClient = { generate(prompt: string): Promise<ProviderResponse> };

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const promptPath = path.join(
  vocabularyRoot,
  "prompts/topic-classification.md",
);
const workingRoot = path.join(vocabularyRoot, "working/topic-classification");
const manifestPath = path.join(workingRoot, "manifest.json");
const outputRoot = path.join(workingRoot, "output");
const rejectedRoot = path.join(workingRoot, "rejected");
const providerValue = (process.env.VOCAB_AI_PROVIDER ?? "gemini").trim();
if (providerValue !== "gemini" && providerValue !== "openai-compatible") {
  throw new Error(`Unsupported vocabulary AI provider "${providerValue}"`);
}
const provider: ClassificationProvider = providerValue;
const model =
  process.env.VOCAB_TOPIC_MODEL?.trim() ||
  process.env.GEMINI_VOCAB_POS_CORRECTION_MODEL?.trim() ||
  "gemini-2.5-flash";
const debug =
  process.env.VOCAB_AI_DEBUG?.trim().toLowerCase() === "true";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", enum: [1] },
    classifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "integer" },
          topics: { type: "array", items: { type: "string" }, maxItems: 1 },
        },
        required: ["id", "topics"],
      },
    },
  },
  required: ["schemaVersion", "classifications"],
} as const;

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const exists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const writeJsonAtomically = async (filePath: string, value: unknown) => {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
};

const parseJson = (text: string) => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/iu, "")
    .replace(/```$/u, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<ProviderResponse>;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.classifications)) {
    throw new Error(
      "AI response must contain schemaVersion 1 and a classifications array",
    );
  }
  return parsed as ProviderResponse;
};

const createClient = (systemInstruction: string): AiClient => {
  if (provider === "openai-compatible") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const baseUrl = process.env.OPENAI_BASE_URL?.trim().replace(/\/+$/u, "");
    if (!apiKey || !baseUrl) {
      throw new Error("OPENAI_API_KEY and OPENAI_BASE_URL are required");
    }
    return {
      async generate(prompt) {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `${systemInstruction}\n\nJSON schema:\n${JSON.stringify(responseSchema)}`,
              },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content;
        if (!content) throw new Error("AI provider returned an empty response");
        return parseJson(content);
      },
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generate(prompt) {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: responseSchema,
        },
      });
      return parseJson(response.text ?? "{}");
    },
  };
};

async function main() {
  const [plan, catalog, topics, systemInstruction] = await Promise.all([
    readJson<ClassificationPlan>(manifestPath),
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
    readFile(promptPath, "utf8"),
  ]);
  const currentPlan = createClassificationPlan(catalog, plan.batchSize, {
    topics,
    prompt: systemInstruction,
  });
  if (!isDeepStrictEqual(currentPlan, plan)) {
    throw new Error(
      "Classification manifest is stale; run data:prepare-topics again",
    );
  }
  const targetBatch = process.argv
    .slice(2)
    .find((argument) => /^batch-\d{3}$/u.test(argument));
  const concurrency = Math.max(
    1,
    Number.parseInt(process.env.VOCAB_AI_CONCURRENCY ?? "3", 10) || 3,
  );
  const batches = targetBatch
    ? plan.batches.filter((batch) => batch.batchId === targetBatch)
    : plan.batches;
  if (targetBatch && batches.length === 0) {
    throw new Error(`Unknown classification batch ${targetBatch}`);
  }

  await Promise.all([
    mkdir(outputRoot, { recursive: true }),
    mkdir(rejectedRoot, { recursive: true }),
  ]);
  const reporter = createClassificationProgressReporter({
    debug,
    write: (line) => console.log(line),
  });
  reporter.emit({
    event: "run-start",
    requested: batches.length,
    totalBatches: batches.length,
    concurrency: Math.min(concurrency, batches.length),
    provider,
    model,
  });
  const client = createClient(systemInstruction);
  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  const queue = [...batches];
  const batchIndexById = new Map(
    batches.map((batch, index) => [batch.batchId, index + 1]),
  );
  const summary: ClassificationRunSummary & { stale: number } = {
    requested: batches.length,
    succeeded: 0,
    reused: 0,
    rejected: 0,
    stale: 0,
  };

  const worker = async () => {
    while (queue.length > 0) {
      const batch = queue.shift();
      if (!batch) return;
      const batchIndex = batchIndexById.get(batch.batchId);
      const startedAt = Date.now();
      const outputPath = path.join(outputRoot, batch.outputFile);
      const rejectedPath = path.join(rejectedRoot, batch.outputFile);
      const identity = createClassificationExecutionIdentity({
        plan,
        batch,
        provider,
        model,
      });
      reporter.emit({
        event: "batch-start",
        batchId: batch.batchId,
        batchIndex,
        totalBatches: batches.length,
        provider,
        model,
        inputSha256: identity.inputSha256,
        executionSha256: identity.executionSha256,
        recordCount: batch.records.length,
      });

      if (await exists(outputPath)) {
        let reuse = { reusable: false, reason: "invalid-output" };
        try {
          reuse = validateReusableClassificationOutput(
            await readJson<unknown>(outputPath),
            identity,
            batch,
            topicSlugs,
          );
        } catch {
          reuse = { reusable: false, reason: "invalid-output" };
        }

        if (reuse.reusable) {
          summary.reused += 1;
          await rm(rejectedPath, { force: true });
          reporter.emit({
            event: "batch-reused",
            batchId: batch.batchId,
            batchIndex,
            totalBatches: batches.length,
            durationMs: Date.now() - startedAt,
            reason: reuse.reason,
            provider,
            model,
            inputSha256: identity.inputSha256,
            executionSha256: identity.executionSha256,
            recordCount: batch.records.length,
          });
          continue;
        }

        summary.stale += 1;
        reporter.emit({
          event: "batch-stale",
          batchId: batch.batchId,
          batchIndex,
          totalBatches: batches.length,
          reason: reuse.reason,
          provider,
          model,
          inputSha256: identity.inputSha256,
          executionSha256: identity.executionSha256,
          recordCount: batch.records.length,
        });
      }

      try {
        const response = await client.generate(
          `Classify every record into zero or one topic from this list:\n${JSON.stringify(
            [...topicSlugs],
          )}\n\nRecords:\n${JSON.stringify(batch.records)}`,
        );
        const records = response.classifications as ClassificationRecord[];
        const validation = validateClassificationBatchResponse(
          batch,
          records,
          topicSlugs,
        );
        if (validation.errors.length > 0) {
          throw new Error(validation.errors.join("\n"));
        }
        await writeJsonAtomically(outputPath, { ...identity, records });
        await rm(rejectedPath, { force: true });
        summary.succeeded += 1;
        reporter.emit({
          event: "batch-success",
          batchId: batch.batchId,
          batchIndex,
          totalBatches: batches.length,
          durationMs: Date.now() - startedAt,
          provider,
          model,
          inputSha256: identity.inputSha256,
          executionSha256: identity.executionSha256,
          recordCount: records.length,
        });
      } catch (error) {
        const sanitized = sanitizeProviderError(error);
        summary.rejected += 1;
        await writeJsonAtomically(rejectedPath, {
          schemaVersion: 2,
          batchId: batch.batchId,
          executionSha256: identity.executionSha256,
          errorCode: sanitized.code,
          errorMessage: sanitized.message,
        });
        reporter.emit({
          event: "batch-rejected",
          batchId: batch.batchId,
          batchIndex,
          totalBatches: batches.length,
          durationMs: Date.now() - startedAt,
          reason: sanitized.code,
          provider,
          model,
          inputSha256: identity.inputSha256,
          executionSha256: identity.executionSha256,
          recordCount: batch.records.length,
        });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, batches.length) }, worker),
  );
  reporter.emit({
    event: "run-finished",
    requested: summary.requested,
    succeeded: summary.succeeded,
    reused: summary.reused,
    stale: summary.stale,
    rejected: summary.rejected,
    provider,
    model,
  });
  if (getClassificationRunExitCode(summary) !== 0) {
    throw new Error(
      `Topic classification incomplete: ${summary.succeeded + summary.reused}/${summary.requested} batches completed`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
