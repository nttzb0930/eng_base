import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  formatTopicExpansionChunkFileName,
  getNextTopicExpansionChunkNumber,
  parseTopicCandidateEnrichmentArguments,
} from "./topic-expansion-cli.js";
import {
  candidateIdentity,
  selectTopicCandidatesForEnrichment,
  validateExpansionArtifact,
  type TopicCandidate,
  type TopicCandidateArtifact,
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
const candidateRoot = path.join(vocabularyRoot, "working/topic-candidates");
const expansionRoot = path.join(vocabularyRoot, "working/topic-expansion");
const provider = (process.env.VOCAB_AI_PROVIDER ?? "gemini").trim();
const model =
  process.env.VOCAB_TOPIC_MODEL?.trim() ||
  process.env.GEMINI_VOCAB_POS_CORRECTION_MODEL?.trim() ||
  "gemini-2.5-flash";

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
          cefrLevel: {
            type: "string",
            enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
          },
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
          "word",
          "normalizedWord",
          "pos",
          "posVi",
          "cefrLevel",
          "phonetic",
          "primaryMeaningVi",
          "meaningVi",
          "exampleEn",
          "exampleVi",
          "examples",
        ],
      },
    },
  },
  required: ["schemaVersion", "words"],
} as const;

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const readDirIfExists = async (directoryPath: string): Promise<string[]> => {
  try {
    return await readdir(directoryPath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const writeJsonAtomically = async (targetPath: string, value: unknown) => {
  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

const parseJson = (text: string): ProviderResponse => {
  const parsed = JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?/iu, "")
      .replace(/```$/u, "")
      .trim()
  ) as Partial<ProviderResponse>;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.words)) {
    throw new Error(
      "AI response must contain schemaVersion 1 and a words array"
    );
  }
  return parsed as ProviderResponse;
};

const envValue = (parts: string[]) => process.env[parts.join("_")]?.trim();

const generate = async (systemInstruction: string, prompt: string) => {
  if (provider === "openai-compatible") {
    const apiKey = envValue(["OPENAI", "API", "KEY"]);
    const baseUrl = envValue(["OPENAI", "BASE", "URL"])?.replace(/\/+$/u, "");
    if (!apiKey || !baseUrl) {
      throw new Error("OpenAI-compatible credentials are required");
    }
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
    if (!response.ok) {
      throw new Error(`AI provider returned HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned an empty response");
    return parseJson(content).words;
  }

  const apiKey = envValue(["GEMINI", "API", "KEY"]);
  if (!apiKey) throw new Error("Gemini credentials are required");
  const ai = new GoogleGenAI({ apiKey });
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
  return parseJson(response.text ?? "{}").words;
};

const readCandidateArtifacts = async (topicSlug: string) => {
  const topicCandidateRoot = path.join(candidateRoot, topicSlug);
  const fileNames = (await readDirIfExists(topicCandidateRoot))
    .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
    .sort();
  return Promise.all(
    fileNames.map((fileName) =>
      readJson<TopicCandidateArtifact>(path.join(topicCandidateRoot, fileName))
    )
  );
};

const readPendingExpansionArtifacts = async (topicSlug: string) => {
  const topicExpansionRoot = path.join(expansionRoot, topicSlug);
  const fileNames = (await readDirIfExists(topicExpansionRoot))
    .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
    .sort();
  return Promise.all(
    fileNames.map((fileName) =>
      readJson<TopicExpansionArtifact>(path.join(topicExpansionRoot, fileName))
    )
  );
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const assertGeneratedWordsMatchCandidates = (
  generatedWords: VocabularyCatalogItem[],
  candidates: TopicCandidate[]
) => {
  const expected = new Set(candidates.map(candidateIdentity));
  const actual = new Set(generatedWords.map(candidateIdentity));
  if (expected.size !== actual.size) {
    throw new Error(
      "AI response did not enrich exactly the requested candidates"
    );
  }
  for (const identity of expected) {
    if (!actual.has(identity)) {
      throw new Error(`AI response missed requested candidate "${identity}"`);
    }
  }
};

async function main() {
  const arguments_ = parseTopicCandidateEnrichmentArguments(
    process.argv.slice(2)
  );
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const topic = topics.find((entry) => entry.slug === arguments_.topicSlug);
  if (!topic) throw new Error(`Unknown Topic "${arguments_.topicSlug}"`);

  const [candidateArtifacts, pendingArtifacts] = await Promise.all([
    readCandidateArtifacts(topic.slug),
    readPendingExpansionArtifacts(topic.slug),
  ]);
  const reviewedCandidates = candidateArtifacts
    .filter((artifact) => artifact.targetTopicSlug === topic.slug)
    .flatMap((artifact) => artifact.candidates);
  const selectedCandidates = selectTopicCandidatesForEnrichment({
    topicSlug: topic.slug,
    candidates: reviewedCandidates,
    catalog,
    pendingArtifacts,
    tier: arguments_.tier,
    limit: arguments_.limit,
  });
  const candidateBatches = chunk(selectedCandidates, arguments_.chunkSize);
  const topicExpansionRoot = path.join(expansionRoot, topic.slug);
  const existingChunkFileNames = await readDirIfExists(topicExpansionRoot);
  const generatedChunkFileNames: string[] = [];

  await mkdir(topicExpansionRoot, { recursive: true });

  for (const candidateBatch of candidateBatches) {
    const words = (
      await generate(
        [
          "Enrich reviewed vocabulary candidates into full catalog entries.",
          "Return only JSON. Do not add, remove, rename, or replace candidates.",
          "Each returned word must keep the exact word, pos, and cefrLevel from the requested candidate.",
          "Each word must include exactly 10 distinct bilingual examples.",
        ].join("\n"),
        [
          `Topic: ${JSON.stringify(topic)}`,
          `Candidates to enrich: ${JSON.stringify(candidateBatch)}`,
        ].join("\n")
      )
    ).map((word): VocabularyCatalogItem => ({
      ...word,
      source: "ai-topic-expansion",
      exampleSource: "ai-topic-expansion",
      dictionaryLookupCompleted: false,
      topics: [topic.slug],
    }));
    assertGeneratedWordsMatchCandidates(words, candidateBatch);

    const artifact: TopicExpansionArtifact = {
      schemaVersion: 1,
      status: "review",
      targetTopicSlug: topic.slug,
      requestedCount: candidateBatch.length,
      examplesPerWord: 10,
      generatedAt: new Date().toISOString(),
      words,
    };
    const validation = validateExpansionArtifact(
      [
        ...catalog,
        ...pendingArtifacts.flatMap((pendingArtifact) => pendingArtifact.words),
      ],
      artifact,
      topics
    );
    if (validation.errors.length > 0) {
      throw new Error(validation.errors.join("\n"));
    }

    const outputPath = path.join(
      topicExpansionRoot,
      formatTopicExpansionChunkFileName(
        getNextTopicExpansionChunkNumber([
          ...existingChunkFileNames,
          ...generatedChunkFileNames,
        ])
      )
    );
    await writeJsonAtomically(outputPath, artifact);
    generatedChunkFileNames.push(path.basename(outputPath));

    const event = {
      action: "vocabulary-topic-candidates-enriched",
      topic: topic.slug,
      tier: arguments_.tier,
      generatedWords: words.length,
      outputPath,
      databaseUpdated: false,
    };
    console.log(
      arguments_.json ? JSON.stringify(event) : JSON.stringify(event, null, 2)
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
