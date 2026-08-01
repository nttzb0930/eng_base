import { z } from "zod";

import type {
  ToeicGrammarLesson,
  ToeicGrammarQuestion,
  ToeicGrammarSource,
} from "./toeic-grammar.types.js";

type SourceConfig = {
  baseUrl: string;
  apiKey: string;
  accessToken: string;
  allowedHosts: string[];
  request: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export class GrammarSourceAuthorizationError extends Error {
  override name = "GrammarSourceAuthorizationError";
}

export class GrammarSourceHttpError extends Error {
  override name = "GrammarSourceHttpError";
}

const text = z.string().trim().min(1);
const topicRowSchema = z.object({
  id: text,
  title_en: z.string().nullable().optional(),
  title_vi: text,
  description_vi: z.string().nullable().optional(),
  order_index: z.number().int(),
  icon: z.string().nullable().optional(),
});
const subtopicRowSchema = z.object({
  id: text,
  topic_id: text,
  title_en: z.string().nullable().optional(),
  title_vi: text,
  description_vi: z.string().nullable().optional(),
  access_level: z.string().nullable().optional(),
  order_index: z.number().int(),
});
const lessonRowSchema = z.object({
  id: text,
  subtopic_id: text,
  title_en: z.string().nullable().optional(),
  title_vi: text,
  content_type: text,
  theory_content_en: z.string().nullable().optional(),
  theory_content_vi: z.string().nullable().optional(),
  lesson_content_json: z.unknown().nullable().optional(),
  html_content: z.string().nullable().optional(),
  order_index: z.number().int(),
});
const setRowSchema = z
  .object({
    set_id: text.optional(),
    id: text.optional(),
    set_name: text.optional(),
    name: text.optional(),
    year: z.number().int().nullable().optional(),
    access_level: z.string().nullable().optional(),
  })
  .refine((row) => Boolean(row.set_id ?? row.id), "Set ID is required")
  .refine((row) => Boolean(row.set_name ?? row.name), "Set name is required");
const questionRowSchema = z
  .object({
    question_id: text.optional(),
    id: text.optional(),
    topic_id: z.string().nullable().optional(),
    subtopic_id: z.string().nullable().optional(),
    question_number: z.number().int().positive().nullable().optional(),
    question_text: text,
    option_a: text,
    option_b: text,
    option_c: text,
    option_d: text,
    correct_answer: z.enum(["A", "B", "C", "D"]),
    explanation_vi: z.string().nullable().optional(),
    explanation_en: z.string().nullable().optional(),
    dich_nghia: z.string().nullable().optional(),
    dich_nghia_dap_an: z.string().nullable().optional(),
    tu_vung: z
      .union([z.array(z.unknown()), z.string()])
      .nullable()
      .optional(),
    prefer_ai_explanation: z.boolean().nullable().optional(),
  })
  .refine(
    (row) => Boolean(row.question_id ?? row.id),
    "Question ID is required"
  );

function token(value: string) {
  const normalized = value.trim().replace(/^Bearer\s+/iu, "");
  if (!normalized) throw new Error("Grammar source credential is empty");
  return normalized;
}

function allowedUrl(value: string | URL, hosts: Set<string>) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !hosts.has(url.hostname)) {
    throw new Error("TOEIC Grammar source URL is not allowed");
  }
  return url;
}

function mapQuestion(value: unknown): ToeicGrammarQuestion {
  const row = questionRowSchema.parse(value);
  const id = row.question_id ?? row.id;
  if (!id) throw new Error("Question ID is required");
  const choices = [
    ["A", row.option_a],
    ["B", row.option_b],
    ["C", row.option_c],
    ["D", row.option_d],
  ] as const;
  return {
    sourceQuestionId: id,
    sourceTopicId: row.topic_id?.trim() || null,
    sourceSubtopicId: row.subtopic_id?.trim() || null,
    questionNumber: row.question_number ?? null,
    questionText: row.question_text,
    options: choices.map(([label, choiceText]) => ({
      label,
      text: choiceText,
      correct: row.correct_answer === label,
    })),
    explanationVi: row.explanation_vi?.trim() || null,
    explanationEn: row.explanation_en?.trim() || null,
    questionTranslation: row.dich_nghia?.trim() || null,
    answerTranslation: row.dich_nghia_dap_an?.trim() || null,
    vocabulary:
      typeof row.tu_vung === "string"
        ? row.tu_vung
            .split(/\r?\n\s*\r?\n/u)
            .map((entry) => entry.trim())
            .filter(Boolean)
        : (row.tu_vung ?? []),
    preferAiExplanation: row.prefer_ai_explanation ?? false,
  };
}

function mapLesson(value: unknown): ToeicGrammarLesson {
  const row = lessonRowSchema.parse(value);
  return {
    sourceLessonId: row.id,
    sourceSubtopicId: row.subtopic_id,
    titleEn: row.title_en?.trim() || null,
    titleVi: row.title_vi,
    contentType: row.content_type,
    theoryContentEn: row.theory_content_en?.trim() || null,
    theoryContentVi: row.theory_content_vi?.trim() || null,
    lessonContentJson: row.lesson_content_json ?? null,
    htmlContent: row.html_content?.trim() || null,
    orderIndex: row.order_index,
  };
}

export function createDautoeicGrammarSource(
  config: SourceConfig
): ToeicGrammarSource {
  const hosts = new Set(config.allowedHosts);
  const baseUrl = allowedUrl(config.baseUrl, hosts);
  const apiKey = token(config.apiKey);
  const accessToken = token(config.accessToken);
  const sleep =
    config.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  async function requestJson(input: {
    path: string;
    authenticated: boolean;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
  }) {
    const url = allowedUrl(new URL(input.path, baseUrl.origin), hosts);
    for (const [key, value] of Object.entries(input.query ?? {})) {
      url.searchParams.set(key, value);
    }
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await config.request(url, {
          method: input.body ? "POST" : "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            apikey: apiKey,
            Authorization: `Bearer ${
              input.authenticated ? accessToken : apiKey
            }`,
          },
          body: input.body ? JSON.stringify(input.body) : undefined,
          signal: AbortSignal.timeout(config.timeoutMs),
        });
      } catch (error) {
        if (attempt >= config.maxRetries) throw error;
        await sleep(2 ** attempt * 250);
        continue;
      }
      if (response.url) allowedUrl(response.url, hosts);
      if (response.status === 401 || response.status === 403) {
        throw new GrammarSourceAuthorizationError(
          `TOEIC Grammar source authorization failed (${response.status})`
        );
      }
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < config.maxRetries
      ) {
        await sleep(2 ** attempt * 250);
        continue;
      }
      if (!response.ok) {
        throw new GrammarSourceHttpError(
          `TOEIC Grammar source request failed (${response.status})`
        );
      }
      const value = (await response.json()) as unknown;
      if (!Array.isArray(value)) {
        throw new Error("TOEIC Grammar source response must be an array");
      }
      return value;
    }
  }

  return {
    async readCatalog() {
      const [topicRows, subtopicRows] = await Promise.all([
        requestJson({
          path: "/rest/v1/grammar_topics",
          authenticated: false,
          query: { select: "*", is_hidden: "eq.false", order: "order_index" },
        }),
        requestJson({
          path: "/rest/v1/grammar_subtopics",
          authenticated: false,
          query: { select: "*", is_hidden: "eq.false", order: "order_index" },
        }),
      ]);
      const topics = topicRows.map((value) => {
        const row = topicRowSchema.parse(value);
        return {
          sourceTopicId: row.id,
          titleEn: row.title_en?.trim() || null,
          titleVi: row.title_vi,
          descriptionVi: row.description_vi?.trim() || null,
          icon: row.icon?.trim() || null,
          orderIndex: row.order_index,
        };
      });
      const visibleTopicIds = new Set(
        topics.map((topic) => topic.sourceTopicId)
      );
      return {
        topics,
        subtopics: subtopicRows
          .map((value) => subtopicRowSchema.parse(value))
          .filter((row) => visibleTopicIds.has(row.topic_id))
          .map((row) => ({
            sourceSubtopicId: row.id,
            sourceTopicId: row.topic_id,
            titleEn: row.title_en?.trim() || null,
            titleVi: row.title_vi,
            descriptionVi: row.description_vi?.trim() || null,
            accessLevel: row.access_level?.trim() || null,
            orderIndex: row.order_index,
          })),
      };
    },

    async readLessons(sourceSubtopicIds) {
      const lessons: ToeicGrammarLesson[] = [];
      for (let index = 0; index < sourceSubtopicIds.length; index += 40) {
        const batch = sourceSubtopicIds.slice(index, index + 40);
        if (batch.length === 0) continue;
        const rows = await requestJson({
          path: "/rest/v1/lessons",
          authenticated: true,
          query: {
            select: "*",
            subtopic_id: `in.(${batch.join(",")})`,
            order: "order_index",
          },
        });
        lessons.push(...rows.map(mapLesson));
      }
      return lessons;
    },

    async readSets() {
      const rows = await requestJson({
        path: "/rest/v1/rpc/get_grammar_bank_sets",
        authenticated: false,
        body: {},
      });
      return rows.map((value) => {
        const row = setRowSchema.parse(value);
        const sourceSetId = row.set_id ?? row.id;
        const name = row.set_name ?? row.name;
        if (!sourceSetId || !name) throw new Error("Invalid Grammar set");
        return {
          sourceSetId,
          name,
          year: row.year ?? null,
          accessLevel: row.access_level?.trim() || null,
        };
      });
    },

    async readTopicQuestions(sourceTopicId) {
      const rows = await requestJson({
        path: "/rest/v1/questions",
        authenticated: true,
        query: { select: "*", topic_id: `eq.${sourceTopicId}` },
      });
      return rows.map(mapQuestion);
    },

    async readSetQuestions(sourceSetId) {
      const rows = await requestJson({
        path: "/rest/v1/rpc/get_grammar_bank_questions",
        authenticated: true,
        body: { _set_id: sourceSetId },
      });
      return rows.map(mapQuestion);
    },

    async readDifficultyQuestions(level) {
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        throw new Error("Grammar difficulty level must be between 1 and 5");
      }
      const rows = await requestJson({
        path: "/rest/v1/rpc/get_grammar_bank_difficulty_level",
        authenticated: true,
        body: { _level: level },
      });
      return rows.map(mapQuestion);
    },
  };
}
