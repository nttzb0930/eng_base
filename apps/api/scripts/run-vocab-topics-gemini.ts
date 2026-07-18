import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ClassificationOutput,
  ClassificationPlan,
} from "./lib/topic-classification.js";
import type { VocabularyTopicDefinition } from "./lib/vocabulary-catalog.js";

type ProviderResponse = {
  classifications: ClassificationOutput["records"];
};

type AiClient = { generate(prompt: string): Promise<ProviderResponse> };

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const promptPath = path.join(
  vocabularyRoot,
  "prompts/topic-classification.md",
);
const workingRoot = path.join(vocabularyRoot, "working/topic-classification");
const manifestPath = path.join(workingRoot, "manifest.json");
const outputRoot = path.join(workingRoot, "output");
const rejectedRoot = path.join(workingRoot, "rejected");
const provider = (process.env.VOCAB_AI_PROVIDER ?? "gemini").trim();
const model =
  process.env.VOCAB_TOPIC_MODEL?.trim() ||
  process.env.GEMINI_VOCAB_POS_CORRECTION_MODEL?.trim() ||
  "gemini-2.5-flash";

const responseSchema = {
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          topics: { type: "array", items: { type: "string" }, maxItems: 1 },
        },
        required: ["id", "topics"],
      },
    },
  },
  required: ["classifications"],
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
  return JSON.parse(cleaned) as ProviderResponse;
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
  const [plan, topics, systemInstruction] = await Promise.all([
    readJson<ClassificationPlan>(manifestPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
    readFile(promptPath, "utf8"),
  ]);
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
  const client = createClient(systemInstruction);
  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  const queue = [...batches];

  const worker = async () => {
    while (queue.length > 0) {
      const batch = queue.shift();
      if (!batch) return;
      const outputPath = path.join(outputRoot, batch.outputFile);
      if (await exists(outputPath)) continue;

      try {
        const response = await client.generate(
          `Classify every record into zero or one topic from this list:\n${JSON.stringify(
            [...topicSlugs],
          )}\n\nRecords:\n${JSON.stringify(batch.records)}`,
        );
        const records = response.classifications.map((record) => ({
          id: record.id,
          topics: record.topics.filter((slug) => topicSlugs.has(slug)).slice(0, 1),
        }));
        await writeJsonAtomically(outputPath, { records });
      } catch (error) {
        await writeJsonAtomically(path.join(rejectedRoot, batch.outputFile), {
          batchId: batch.batchId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, batches.length) }, worker),
  );
  console.log(
    JSON.stringify({
      action: "vocabulary-topic-classification-provider-run-finished",
      requestedBatches: batches.length,
      databaseUpdated: false,
    }),
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
