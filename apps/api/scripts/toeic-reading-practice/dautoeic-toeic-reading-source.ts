import { z } from "zod";

import type {
  ToeicPracticeStat,
  ToeicQuestionIndexRow,
  ToeicReadingPart,
  ToeicReadingSource,
  ToeicSourceSet,
  ToeicSourceTest,
} from "./toeic-reading-practice.types.js";

const sourceId = z.union([z.string().trim().min(1), z.number()]).transform(String);
const setSchema = z
  .object({
    id: sourceId,
    name: z.string().trim().min(1),
    order_index: z.coerce.number().int(),
    is_hidden: z.boolean(),
  })
  .passthrough();
const testSchema = z
  .object({
    id: sourceId,
    set_id: sourceId,
    name: z.string().trim().min(1),
    order_index: z.coerce.number().int(),
    is_free: z.boolean(),
    is_hidden: z.boolean(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();
const indexSchema = z
  .object({
    id: sourceId,
    test_id: sourceId,
    part: z.union([z.literal(5), z.literal(6), z.literal(7)]),
    question_number: z.coerce.number().int(),
    passage_id: sourceId.nullable().optional(),
    image_url: z.string().nullable().optional(),
  })
  .passthrough();
const statSchema = z
  .object({
    item_id: sourceId,
    part: z.union([z.literal(5), z.literal(6), z.literal(7)]),
    difficulty_level: z.coerce.number().int().min(1).max(5).nullable().optional(),
    error_rate: z.coerce.number().min(0).max(1).nullable().optional(),
    total_attempts: z.coerce.number().int().nonnegative().nullable().optional(),
  })
  .passthrough();

type SourceConfig = {
  baseUrl: string;
  authorization: string;
  allowedHosts: string[];
  request: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  pageSize?: number;
  maxResponseBytes?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

function assertAllowedUrl(value: string, hosts: Set<string>) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !hosts.has(url.hostname)) {
    throw new Error("TOEIC Reading source URL is not allowed");
  }
  return url;
}

export function createDautoeicToeicReadingSource(
  config: SourceConfig,
): ToeicReadingSource {
  const hosts = new Set(config.allowedHosts);
  const baseUrl = assertAllowedUrl(config.baseUrl, hosts);
  const pageSize = config.pageSize ?? 1_000;
  const maxResponseBytes = config.maxResponseBytes ?? 20 * 1024 * 1024;
  const sleep =
    config.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  async function request(url: URL, init: RequestInit = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const response = await config.request(url, {
        ...init,
        redirect: "follow",
        signal: AbortSignal.timeout(config.timeoutMs),
        headers: {
          Accept: "application/json",
          apikey: config.authorization,
          Authorization: `Bearer ${config.authorization}`,
          ...init.headers,
        },
      });
      if (response.url) assertAllowedUrl(response.url, hosts);
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `TOEIC Reading source authorization failed (${response.status})`,
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
        throw new Error(`TOEIC Reading source request failed (${response.status})`);
      }
      return response;
    }
  }

  async function readJson(url: URL, init?: RequestInit) {
    const response = await request(url, init);
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxResponseBytes) {
      throw new Error("TOEIC Reading source response exceeds size limit");
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxResponseBytes) {
      throw new Error("TOEIC Reading source response exceeds size limit");
    }
    return JSON.parse(text) as unknown;
  }

  async function paginated<T>(
    table: string,
    select: string,
    parse: (value: unknown) => T,
    filters?: (url: URL) => void,
  ) {
    const values: T[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const url = new URL(`/rest/v1/${table}`, baseUrl.origin);
      url.searchParams.set("select", select);
      filters?.(url);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));
      const page = await readJson(url);
      if (!Array.isArray(page)) {
        throw new Error("TOEIC Reading source response must be an array");
      }
      values.push(...page.map(parse));
      if (page.length < pageSize) return values;
    }
  }

  return {
    listSets(): Promise<ToeicSourceSet[]> {
      return paginated(
        "mock_test_sets",
        "id,name,order_index,is_hidden",
        (value) => {
          const row = setSchema.parse(value);
          return {
            sourceSetId: row.id,
            name: row.name,
            order: row.order_index,
            hidden: row.is_hidden,
          };
        },
        (url) => url.searchParams.set("order", "order_index.asc,id.asc"),
      );
    },

    listTests(): Promise<ToeicSourceTest[]> {
      return paginated(
        "mock_tests",
        "id,set_id,name,order_index,is_free,is_hidden,updated_at",
        (value) => {
          const row = testSchema.parse(value);
          return {
            sourceTestId: row.id,
            sourceSetId: row.set_id,
            title: row.name,
            order: row.order_index,
            free: row.is_free,
            hidden: row.is_hidden,
            updatedAt: row.updated_at ?? null,
          };
        },
        (url) => url.searchParams.set("order", "order_index.asc,id.asc"),
      );
    },

    listQuestionIndex(sourceTestId: string): Promise<ToeicQuestionIndexRow[]> {
      return paginated(
        "mock_test_questions",
        "id,test_id,part,question_number,passage_id,image_url",
        (value) => {
          const row = indexSchema.parse(value);
          return {
            sourceQuestionId: row.id,
            sourceTestId: row.test_id,
            part: row.part,
            sourceNumber: row.question_number,
            passageId: row.passage_id ?? null,
            imageUrl: row.image_url?.trim() || null,
          };
        },
        (url) => {
          url.searchParams.set("test_id", `eq.${sourceTestId}`);
          url.searchParams.set("part", "in.(5,6,7)");
          url.searchParams.set("order", "question_number.asc,id.asc");
        },
      );
    },

    readQuestions(sourceTestId: string) {
      return paginated(
        "mock_test_questions",
        [
          "id",
          "test_id",
          "part",
          "section",
          "question_number",
          "passage_id",
          "image_url",
          "question_text",
          "option_a",
          "option_b",
          "option_c",
          "option_d",
          "correct_answer",
          "order_index",
          "dich_nghia",
          "explanation_vi",
        ].join(","),
        (value) => value,
        (url) => {
          url.searchParams.set("test_id", `eq.${sourceTestId}`);
          url.searchParams.set("part", "in.(5,6,7)");
          url.searchParams.set("order", "question_number.asc,id.asc");
        },
      );
    },

    readPassages(sourceTestId: string) {
      return paginated(
        "mock_test_passages",
        [
          "id",
          "test_id",
          "part",
          "passage_type",
          "image_url",
          "title",
          "order_index",
          "passage_text",
          "passage_text_2",
          "passage_text_3",
          "dich_nghia",
        ].join(","),
        (value) => value,
        (url) => {
          url.searchParams.set("test_id", `eq.${sourceTestId}`);
          url.searchParams.set("part", "in.(6,7)");
          url.searchParams.set("order", "order_index.asc,id.asc");
        },
      );
    },

    async readPracticeStats(part: ToeicReadingPart) {
      const url = new URL(
        "/rest/v1/rpc/get_practice_stats_page",
        baseUrl.origin,
      );
      try {
        const value = await readJson(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ p_part: part, p_limit: 100_000, p_offset: 0 }),
        });
        if (!Array.isArray(value)) return null;
        return value.map((item): ToeicPracticeStat => {
          const row = statSchema.parse(item);
          return {
            sourceItemId: row.item_id,
            part: row.part,
            difficultyLevel: row.difficulty_level ?? null,
            errorRate: row.error_rate ?? null,
            totalAttempts: row.total_attempts ?? null,
          };
        });
      } catch {
        return null;
      }
    },
  };
}
