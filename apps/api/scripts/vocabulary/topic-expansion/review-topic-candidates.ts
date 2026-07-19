import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import { readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  applyTopicCandidateReview,
  type TopicCandidateArtifact,
  type TopicCandidateReviewDecision,
} from "./topic-expansion.js";
import { parseTopicCandidateReviewArguments } from "./topic-expansion-cli.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

type ProviderResponse = {
  schemaVersion: 1;
  decisions: TopicCandidateReviewDecision[];
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
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.decisions)) {
    throw new Error(
      "AI response must contain schemaVersion 1 and a decisions array"
    );
  }
  return parsed as ProviderResponse;
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", enum: [1] },
    decisions: {
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
          decision: {
            type: "string",
            enum: ["core", "supporting", "reject"],
          },
          reason: { type: "string" },
        },
        required: ["word", "pos", "cefrLevel", "decision", "reason"],
      },
    },
  },
  required: ["schemaVersion", "decisions"],
} as const;

const envValue = (parts: string[]) => process.env[parts.join("_")]?.trim();

const generateReview = async (prompt: string) => {
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
        temperature: 0,
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
    return parseJson(content).decisions;
  }

  const apiKey = envValue(["GEMINI", "API", "KEY"]);
  if (!apiKey) throw new Error("Gemini key is required");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: `Return only JSON matching this schema:\n${JSON.stringify(responseSchema)}`,
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: responseSchema,
    },
  });
  return parseJson(response.text ?? "{}").decisions;
};

async function main() {
  const arguments_ = parseTopicCandidateReviewArguments(process.argv.slice(2));
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const topic = topics.find((entry) => entry.slug === arguments_.topicSlug);
  if (!topic) throw new Error(`Unknown Topic "${arguments_.topicSlug}"`);

  const topicOutputRoot = path.join(outputRoot, topic.slug);
  const fileNames = arguments_.all
    ? (await readdir(topicOutputRoot))
        .filter((fileName) => /^chunk-\d{3}\.json$/u.test(fileName))
        .sort()
    : [arguments_.chunkFileName!];

  let reviewedFiles = 0;
  let keptCandidates = 0;
  let rejectedCandidates = 0;

  for (const fileName of fileNames) {
    const filePath = path.join(topicOutputRoot, fileName);
    const artifact = await readJson<TopicCandidateArtifact>(filePath);
    if (
      artifact.targetTopicSlug !== topic.slug ||
      artifact.candidates.length < 1
    ) {
      continue;
    }
    const decisions = await generateReview(
      [
        "Classify each candidate for Topic relevance.",
        `Topic: ${JSON.stringify(topic)}`,
        "Decision rules:",
        "- core: directly defines the topic and should be learned inside this topic.",
        "- supporting: related and useful for this topic, but broader or secondary.",
        "- reject: off-topic, romantic-only, object-only, overly generic, or too context-dependent.",
        "Return one decision for every candidate.",
        `Candidates: ${JSON.stringify(artifact.candidates)}`,
      ].join("\n")
    );
    const reviewed = applyTopicCandidateReview(artifact, decisions);
    await writeJsonAtomically(filePath, reviewed);
    reviewedFiles += 1;
    keptCandidates += reviewed.candidates.length;
    rejectedCandidates += reviewed.rejected.length - artifact.rejected.length;
  }

  const summary = {
    action: "vocabulary-topic-candidates-reviewed",
    topic: topic.slug,
    reviewedFiles,
    keptCandidates,
    rejectedCandidates,
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
