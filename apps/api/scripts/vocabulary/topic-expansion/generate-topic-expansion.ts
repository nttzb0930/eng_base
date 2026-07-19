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
  createTopicExpansionExclusionWords,
  createTopicDeficitReport,
  formatTopicExpansionChunkFileName,
  formatGenerationCreated,
  formatGenerationStart,
  formatTopicDeficitReport,
  formatTopicExpansionEvent,
  getNextTopicExpansionChunkNumber,
  parseTopicExpansionArguments,
  resolveTopicExpansionRequest,
} from "./topic-expansion-cli.js";
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
const debugEnabled = process.env.VOCAB_AI_DEBUG === "true";
const chunkSize = Number.parseInt(
  process.env.VOCAB_TOPIC_EXPANSION_CHUNK_SIZE ?? "30",
  10
);
const startedAt = Date.now();

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const readJsonIfExists = async <T>(filePath: string): Promise<T | null> => {
  try {
    return await readJson<T>(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

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
          {
            role: "system",
            content: `${systemInstruction}\n\nJSON schema:\n${JSON.stringify(responseSchema)}`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok)
      throw new Error(`AI provider returned HTTP ${response.status}`);
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
  const arguments_ = parseTopicExpansionArguments(process.argv.slice(2));
  const [catalog, topics, systemInstruction] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
    readFile(promptPath, "utf8"),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const minimumWords = Number.parseInt(
    process.env.VOCAB_TOPIC_MINIMUM_WORDS ?? "30",
    10
  );
  const deficits = calculateTopicDeficits(topics, catalog, minimumWords);

  await mkdir(outputRoot, { recursive: true });

  if (arguments_.topicSlug === null) {
    const reportPath = path.join(outputRoot, "deficits.json");
    const report = createTopicDeficitReport({
      topics,
      deficits,
      minimumWords,
      catalogItems: catalog.length,
    });
    await writeJsonAtomically(reportPath, report);

    if (arguments_.json) {
      console.log(JSON.stringify(report));
    } else {
      console.log(formatTopicDeficitReport(report, reportPath));
    }
    return;
  }

  const deficit = deficits.find((entry) => entry.slug === arguments_.topicSlug);
  if (!deficit) {
    throw new Error(`Topic "${arguments_.topicSlug}" has no expansion deficit`);
  }
  const topic = topics.find((entry) => entry.slug === arguments_.topicSlug)!;
  const effectiveChunkSize = arguments_.chunkSize ?? chunkSize;
  const queueMode = arguments_.chunks > 1 || arguments_.chunkSize !== null;
  const topicOutputRoot = path.join(outputRoot, topic.slug);
  const queueFileNames = await readDirIfExists(topicOutputRoot);
  const pendingQueueArtifacts = (
    await Promise.all(
      queueFileNames
        .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
        .sort()
        .map((fileName) =>
          readJson<TopicExpansionArtifact>(path.join(topicOutputRoot, fileName))
        )
    )
  ).filter((artifact) => artifact.targetTopicSlug === topic.slug);
  const legacyArtifact = await readJsonIfExists<TopicExpansionArtifact>(
    path.join(outputRoot, `${topic.slug}.json`)
  );
  const pendingArtifacts =
    legacyArtifact?.targetTopicSlug === topic.slug
      ? [legacyArtifact, ...pendingQueueArtifacts]
      : pendingQueueArtifacts;
  const pendingWordCount = pendingArtifacts.reduce(
    (total, artifact) => total + artifact.words.length,
    0
  );
  const generatedInThisRun: VocabularyCatalogItem[] = [];
  const generatedChunkFileNames: string[] = [];
  const emitDebug = (
    event: Parameters<typeof formatTopicExpansionEvent>[0]
  ) => {
    if (!debugEnabled) return;
    console.log(formatTopicExpansionEvent(event, arguments_.json));
  };

  for (let chunkIndex = 0; chunkIndex < arguments_.chunks; chunkIndex += 1) {
    const remainingDeficit = {
      ...deficit,
      requestedCount: Math.max(
        0,
        deficit.requestedCount - pendingWordCount - generatedInThisRun.length
      ),
    };
    if (remainingDeficit.requestedCount < 1) break;
    const expansionRequest = resolveTopicExpansionRequest(
      remainingDeficit,
      effectiveChunkSize
    );
    const existingWords = createTopicExpansionExclusionWords({
      topicSlug: topic.slug,
      catalog,
      pendingArtifacts,
      generatedInThisRun,
    });

    emitDebug({
      event: "run-start",
      topic: topic.slug,
      durationMs: Date.now() - startedAt,
      requestedWords: expansionRequest.requestedWords,
      totalMissingWords: expansionRequest.totalMissingWords,
      chunkSize: expansionRequest.chunkSize,
      chunked: expansionRequest.chunked,
    });

    if (arguments_.json) {
      console.log(
        JSON.stringify({
          event: "generation-start",
          topic: topic.slug,
          requestedWords: expansionRequest.requestedWords,
          totalMissingWords: expansionRequest.totalMissingWords,
          chunkSize: expansionRequest.chunkSize,
          chunked: expansionRequest.chunked,
        })
      );
    } else {
      console.log(
        formatGenerationStart(topic, expansionRequest.requestedWords)
      );
    }

    const providerStartedAt = Date.now();
    emitDebug({
      event: "provider-request-start",
      topic: topic.slug,
      durationMs: providerStartedAt - startedAt,
      requestedWords: expansionRequest.requestedWords,
    });
    const generatedWords = await generate(
      systemInstruction,
      `Generate exactly ${expansionRequest.requestedWords} new words for this topic:\n${JSON.stringify(
        topic
      )}\n\nDo not duplicate these existing words:\n${JSON.stringify(existingWords)}`
    );
    emitDebug({
      event: "provider-response-received",
      topic: topic.slug,
      durationMs: Date.now() - providerStartedAt,
      generatedWords: generatedWords.length,
    });
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
      requestedCount: expansionRequest.requestedWords,
      examplesPerWord: 10,
      generatedAt: new Date().toISOString(),
      words,
    };
    const validationStartedAt = Date.now();
    emitDebug({
      event: "validation-start",
      topic: topic.slug,
      durationMs: validationStartedAt - startedAt,
      generatedWords: words.length,
    });
    const duplicateGuardCatalog = [
      ...catalog,
      ...pendingArtifacts.flatMap((pendingArtifact) => pendingArtifact.words),
      ...generatedInThisRun,
    ];
    const validation = validateExpansionArtifact(
      duplicateGuardCatalog,
      artifact,
      topics
    );
    if (validation.errors.length > 0) {
      emitDebug({
        event: "validation-failed",
        topic: topic.slug,
        durationMs: Date.now() - validationStartedAt,
        errorCount: validation.errors.length,
      });
      throw new Error(validation.errors.join("\n"));
    }
    emitDebug({
      event: "validation-success",
      topic: topic.slug,
      durationMs: Date.now() - validationStartedAt,
      generatedWords: words.length,
    });

    const outputPath = queueMode
      ? path.join(
          topicOutputRoot,
          formatTopicExpansionChunkFileName(
            getNextTopicExpansionChunkNumber([
              ...queueFileNames,
              ...generatedChunkFileNames,
            ])
          )
        )
      : path.join(outputRoot, `${topic.slug}.json`);
    if (queueMode) await mkdir(topicOutputRoot, { recursive: true });
    await writeJsonAtomically(outputPath, artifact);
    generatedChunkFileNames.push(path.basename(outputPath));
    generatedInThisRun.push(...words);
    emitDebug({
      event: "artifact-written",
      topic: topic.slug,
      durationMs: Date.now() - startedAt,
      generatedWords: words.length,
      outputPath,
    });

    if (arguments_.json) {
      console.log(
        JSON.stringify({
          event: "generation-created-for-review",
          topic: topic.slug,
          generatedWords: words.length,
          outputPath,
          databaseUpdated: false,
        })
      );
    } else {
      console.log(formatGenerationCreated(topic, words.length, outputPath));
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
