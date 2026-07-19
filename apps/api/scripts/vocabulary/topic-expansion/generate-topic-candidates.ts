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
  dedupeTopicCandidates,
  type TopicCandidate,
  type TopicCandidateArtifact,
} from "./topic-expansion.js";
import {
  formatTopicExpansionChunkFileName,
  getNextTopicExpansionChunkNumber,
  parseTopicCandidateGenerationArguments,
} from "./topic-expansion-cli.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

type ProviderResponse = {
  schemaVersion: 1;
  candidates: TopicCandidate[];
};

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const outputRoot = path.join(vocabularyRoot, "working/topic-candidates");
const provider = (process.env.VOCAB_AI_PROVIDER ?? "gemini").trim();
const model =
  process.env.VOCAB_TOPIC_MODEL?.trim() ||
  process.env.GEMINI_VOCAB_POS_CORRECTION_MODEL?.trim() ||
  "gemini-2.5-flash";

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
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.candidates)) {
    throw new Error(
      "AI response must contain schemaVersion 1 and a candidates array"
    );
  }
  return parsed as ProviderResponse;
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", enum: [1] },
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          word: { type: "string" },
          pos: { type: "string" },
          cefrLevel: {
            type: "string",
            enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
          },
        },
        required: ["word", "pos", "cefrLevel"],
      },
    },
  },
  required: ["schemaVersion", "candidates"],
} as const;

const envValue = (parts: string[]) => process.env[parts.join("_")]?.trim();

const generate = async (prompt: string) => {
  if (provider === "openai-compatible") {
    const apiKey = envValue(["OPENAI", "API", "KEY"]);
    const baseUrl = envValue(["OPENAI", "BASE", "URL"])?.replace(/\/+$/u, "");
    if (!apiKey || !baseUrl) {
      throw new Error("OpenAI-compatible key and base URL are required");
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
            content: `Return only JSON matching this schema:\n${JSON.stringify(responseSchema)}`,
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
    return parseJson(content).candidates;
  }

  const apiKey = envValue(["GEMINI", "API", "KEY"]);
  if (!apiKey) throw new Error("Gemini key is required");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: `Return only JSON matching this schema:\n${JSON.stringify(responseSchema)}`,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: responseSchema,
    },
  });
  return parseJson(response.text ?? "{}").candidates;
};

async function main() {
  const arguments_ = parseTopicCandidateGenerationArguments(
    process.argv.slice(2)
  );
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const topic = topics.find((entry) => entry.slug === arguments_.topicSlug);
  if (!topic) throw new Error(`Unknown Topic "${arguments_.topicSlug}"`);

  const topicOutputRoot = path.join(outputRoot, topic.slug);
  await mkdir(topicOutputRoot, { recursive: true });
  const fileNames = await readDirIfExists(topicOutputRoot);
  const pendingArtifacts = (
    await Promise.all(
      fileNames
        .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
        .sort()
        .map((fileName) =>
          readJsonIfExists<TopicCandidateArtifact>(
            path.join(topicOutputRoot, fileName)
          )
        )
    )
  ).filter((artifact): artifact is TopicCandidateArtifact => artifact !== null);

  const candidates = await generate(
    [
      `Generate exactly ${arguments_.count} candidate English vocabulary words for this topic.`,
      `Topic: ${JSON.stringify(topic)}`,
      "Select core vocabulary for the topic: words that directly name the people, objects, qualities, states, actions, or phrases that define the topic.",
      "A candidate must be topic-defining, not merely usable in a sentence about the topic.",
      "Return only word identities. Do not include meanings, examples, or audio.",
      "Avoid generic verbs and broad social actions unless they are direct topic labels.",
      "For a friends/friendship topic, avoid weak contextual verbs such as defend, lend, entertain, help, make, get, do, and give unless the word itself names a friendship concept.",
      "Prefer concrete topic labels and stable collocations over context-only verbs.",
      "Avoid proper nouns, phrases longer than three words, idioms that require a full sentence, and words unrelated to the topic.",
    ].join("\n")
  );

  const artifact = dedupeTopicCandidates(catalog, pendingArtifacts, {
    schemaVersion: 1,
    status: "review",
    targetTopicSlug: topic.slug,
    requestedCount: arguments_.count,
    generatedAt: new Date().toISOString(),
    candidates,
    rejected: [],
  });
  const outputPath = path.join(
    topicOutputRoot,
    formatTopicExpansionChunkFileName(
      getNextTopicExpansionChunkNumber(fileNames)
    )
  );
  await writeJsonAtomically(outputPath, artifact);

  const summary = {
    action: "vocabulary-topic-candidates-generated",
    topic: topic.slug,
    requestedCandidates: arguments_.count,
    acceptedCandidates: artifact.candidates.length,
    rejectedCandidates: artifact.rejected.length,
    outputPath,
    databaseUpdated: false,
  };
  console.log(
    arguments_.json ? JSON.stringify(summary) : JSON.stringify(summary, null, 2)
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
