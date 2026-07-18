import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  calculateTopicDeficits,
  validateExpansionArtifact,
  type TopicExpansionArtifact,
} from "./topic-expansion.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

type GeneratedWord = Pick<
  VocabularyCatalogItem,
  | "word"
  | "normalizedWord"
  | "pos"
  | "posVi"
  | "cefrLevel"
  | "phonetic"
  | "primaryMeaningVi"
  | "meaningVi"
  | "exampleEn"
  | "exampleVi"
  | "examples"
>;

type ProviderResponse = {
  schemaVersion: 1;
  words: GeneratedWord[];
};

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const promptPath = path.join(vocabularyRoot, "prompts/topic-expansion.md");
const outputRoot = path.join(vocabularyRoot, "working/topic-expansion");
const provider = (process.env.VOCAB_AI_PROVIDER ?? "gemini").trim();
const model =
  process.env.VOCAB_TOPIC_MODEL?.trim() ||
  process.env.GEMINI_VOCAB_POS_CORRECTION_MODEL?.trim() ||
  "gemini-2.5-flash";

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const parseJson = (text: string): ProviderResponse => {
  const parsed = JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?/iu, "")
      .replace(/```$/u, "")
      .trim(),
  ) as Partial<ProviderResponse>;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.words)) {
    throw new Error("AI response must contain schemaVersion 1 and a words array");
  }
  return parsed as ProviderResponse;
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", enum: [1] },
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          word: { type: "string" },
          normalizedWord: { type: "string" },
          pos: { type: "string" },
          posVi: { type: "string" },
          cefrLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
          phonetic: { type: "string" },
          primaryMeaningVi: { type: "string" },
          meaningVi: { type: "string" },
          exampleEn: { type: "string" },
          exampleVi: { type: "string" },
          examples: {
            type: "array",
            minItems: 10,
            maxItems: 10,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                exampleEn: { type: "string" },
                exampleVi: { type: "string" },
              },
              required: ["exampleEn", "exampleVi"],
            },
          },
        },
        required: [
          "word", "normalizedWord", "pos", "posVi", "cefrLevel", "phonetic",
          "primaryMeaningVi", "meaningVi", "exampleEn", "exampleVi", "examples",
        ],
      },
    },
  },
  required: ["schemaVersion", "words"],
} as const;

const generate = async (systemInstruction: string, prompt: string) => {
  if (provider === "openai-compatible") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const baseUrl = process.env.OPENAI_BASE_URL?.trim().replace(/\/+$/u, "");
    if (!apiKey || !baseUrl) {
      throw new Error("OPENAI_API_KEY and OPENAI_BASE_URL are required");
    }
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${systemInstruction}\n\nJSON schema:\n${JSON.stringify(responseSchema)}` },
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
    return parseJson(content).words;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: responseSchema,
    },
  });
  return parseJson(response.text ?? "{}").words;
};

async function main() {
  const [catalog, topics, systemInstruction] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
    readFile(promptPath, "utf8"),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const minimumWords = Number.parseInt(
    process.env.VOCAB_TOPIC_MINIMUM_WORDS ?? "30",
    10,
  );
  const deficits = calculateTopicDeficits(topics, catalog, minimumWords);
  const topicArgument = process.argv
    .slice(2)
    .find((argument) => !argument.startsWith("--"));

  if (!topicArgument) {
    console.log(
      JSON.stringify({
        action: "vocabulary-topic-expansion-deficits",
        minimumWords,
        deficits,
        providerCalled: false,
        databaseUpdated: false,
      }),
    );
    return;
  }

  const deficit = deficits.find((entry) => entry.slug === topicArgument);
  if (!deficit) {
    throw new Error(`Topic "${topicArgument}" has no expansion deficit`);
  }
  const topic = topics.find((entry) => entry.slug === topicArgument)!;
  const existingWords = catalog
    .filter((item) => (item.topics ?? []).includes(topic.slug))
    .map((item) => ({ word: item.word, pos: item.pos }));
  const generatedWords = await generate(
    systemInstruction,
    `Generate exactly ${deficit.requestedCount} new words for this topic:\n${JSON.stringify(
      topic,
    )}\n\nDo not duplicate these existing words:\n${JSON.stringify(existingWords)}`,
  );
  const words: VocabularyCatalogItem[] = generatedWords.map((word) => ({
    ...word,
    source: "ai-topic-expansion",
    exampleSource: "ai-topic-expansion",
    dictionaryLookupCompleted: false,
    topics: [topic.slug],
  }));
  const artifact: TopicExpansionArtifact = {
    schemaVersion: 1,
    status: "review",
    targetTopicSlug: topic.slug,
    requestedCount: deficit.requestedCount,
    examplesPerWord: 10,
    generatedAt: new Date().toISOString(),
    words,
  };
  const validation = validateExpansionArtifact(catalog, artifact, topics);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join("\n"));
  }

  await mkdir(outputRoot, { recursive: true });
  const outputPath = path.join(outputRoot, `${topic.slug}.json`);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  console.log(
    JSON.stringify({
      action: "vocabulary-topic-expansion-created-for-review",
      topic: topic.slug,
      generatedWords: words.length,
      outputPath,
      databaseUpdated: false,
    }),
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
