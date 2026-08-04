import { z } from "zod";

import type {
  ApprovedToeicTestIdentity,
  ToeicListeningMediaInspection,
  ToeicListeningQuestionIndexRow,
  ToeicListeningSource,
  ToeicListeningStimulusIndexRow,
} from "./toeic-listening-practice.types.js";

const sourceId = z
  .union([z.string().trim().min(1), z.number()])
  .transform(String);
const testSchema = z
  .object({
    id: sourceId,
    set_id: sourceId,
    name: z.string().trim().min(1),
    order_index: z.coerce.number().int(),
    media_folder: z.string().nullable().optional(),
    media_version: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();
const questionSchema = z
  .object({
    id: sourceId,
    test_id: sourceId,
    part: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    question_number: z.coerce.number().int(),
    passage_id: sourceId.nullable().optional(),
    audio_url: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
  })
  .passthrough();
const stimulusSchema = z
  .object({
    id: sourceId,
    test_id: sourceId,
    part: z.union([z.literal(3), z.literal(4)]),
    audio_url: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
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

function assertAllowedUrl(value: string, hosts: Set<string>, base?: URL) {
  let url: URL;
  try {
    url = base ? new URL(value, base) : new URL(value);
  } catch {
    throw new Error("TOEIC Listening source URL is invalid");
  }
  if (url.protocol !== "https:" || !hosts.has(url.hostname)) {
    throw new Error("TOEIC Listening source URL is not allowed");
  }
  return url;
}

export function createDautoeicToeicListeningSource(
  config: SourceConfig
): ToeicListeningSource {
  const hosts = new Set(config.allowedHosts);
  const baseUrl = assertAllowedUrl(config.baseUrl, hosts);
  const mediaInfo = new Map<
    string,
    { folder: string | null; version: string | null }
  >();
  const encodeMediaPath = (value: string) =>
    value
      .split("/")
      .map((segment) => {
        if (!segment) return segment;
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join("/");
  const mediaUrl = (value: string | null | undefined, sourceTestId: string) => {
    const normalized = value?.trim();
    if (!normalized) return null;
    if (/^https?:/iu.test(normalized)) {
      return assertAllowedUrl(normalized, hosts).toString();
    }
    const info = mediaInfo.get(sourceTestId);
    if (info?.folder && info.folder !== "none") {
      const path = `/storage/v1/object/public/mock-test-media/${encodeMediaPath(info.folder)}/${encodeMediaPath(normalized)}`;
      const resolved = new URL(path, baseUrl);
      if (info.version) resolved.searchParams.set("v", info.version);
      return assertAllowedUrl(resolved.toString(), hosts).toString();
    }
    return assertAllowedUrl(normalized, hosts, baseUrl).toString();
  };
  const pageSize = config.pageSize ?? 1_000;
  const maxResponseBytes = config.maxResponseBytes ?? 20 * 1024 * 1024;
  const sleep =
    config.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  async function sourceRequest(url: URL, init: RequestInit = {}) {
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
          `TOEIC Listening source authorization failed (${response.status})`
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
        throw new Error(
          `TOEIC Listening source request failed (${response.status})`
        );
      }
      return response;
    }
  }

  async function readJson(url: URL) {
    const response = await sourceRequest(url);
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxResponseBytes) {
      throw new Error("TOEIC Listening source response exceeds size limit");
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxResponseBytes) {
      throw new Error("TOEIC Listening source response exceeds size limit");
    }
    return JSON.parse(text) as unknown;
  }

  async function paginated<T>(
    table: string,
    select: string,
    parse: (value: unknown) => T,
    filters: (url: URL) => void
  ) {
    const values: T[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const url = new URL(`/rest/v1/${table}`, baseUrl.origin);
      url.searchParams.set("select", select);
      filters(url);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));
      const page = await readJson(url);
      if (!Array.isArray(page)) {
        throw new Error("TOEIC Listening source response must be an array");
      }
      values.push(...page.map(parse));
      if (page.length < pageSize) return values;
    }
  }

  async function ensureMediaInfo(sourceTestId: string) {
    if (mediaInfo.has(sourceTestId)) return;
    const values = await paginated(
      "mock_tests",
      "id,set_id,name,order_index,media_folder,media_version",
      (value) => testSchema.parse(value),
      (url) => url.searchParams.set("id", `eq.${sourceTestId}`)
    );
    const row = values[0];
    if (!row) throw new Error("TOEIC Listening source test was not found");
    mediaInfo.set(sourceTestId, {
      folder: row.media_folder?.trim() || null,
      version:
        row.media_version === null || row.media_version === undefined
          ? null
          : String(row.media_version),
    });
  }

  return {
    listTests(): Promise<ApprovedToeicTestIdentity[]> {
      return paginated(
        "mock_tests",
        "id,set_id,name,order_index,media_folder,media_version",
        (value) => {
          const row = testSchema.parse(value);
          mediaInfo.set(row.id, {
            folder: row.media_folder?.trim() || null,
            version:
              row.media_version === null || row.media_version === undefined
                ? null
                : String(row.media_version),
          });
          return {
            sourceTestId: row.id,
            sourceSetId: row.set_id,
            title: row.name,
            order: row.order_index,
          };
        },
        (url) => url.searchParams.set("order", "order_index.asc,id.asc")
      );
    },

    async listQuestionIndex(
      sourceTestId: string
    ): Promise<ToeicListeningQuestionIndexRow[]> {
      await ensureMediaInfo(sourceTestId);
      return paginated(
        "mock_test_questions",
        "id,test_id,part,question_number,passage_id,audio_url,image_url",
        (value) => {
          const row = questionSchema.parse(value);
          return {
            sourceQuestionId: row.id,
            sourceTestId: row.test_id,
            part: row.part,
            sourceNumber: row.question_number,
            stimulusId: row.passage_id ?? null,
            audioUrl: mediaUrl(row.audio_url, row.test_id),
            imageUrl: mediaUrl(row.image_url, row.test_id),
          };
        },
        (url) => {
          url.searchParams.set("test_id", `eq.${sourceTestId}`);
          url.searchParams.set("part", "in.(1,2,3,4)");
          url.searchParams.set("order", "question_number.asc,id.asc");
        }
      );
    },

    async listStimulusIndex(
      sourceTestId: string
    ): Promise<ToeicListeningStimulusIndexRow[]> {
      await ensureMediaInfo(sourceTestId);
      return paginated(
        "mock_test_passages",
        "id,test_id,part,audio_url,image_url",
        (value) => {
          const row = stimulusSchema.parse(value);
          return {
            sourceStimulusId: row.id,
            sourceTestId: row.test_id,
            part: row.part,
            audioUrl: mediaUrl(row.audio_url, row.test_id),
            imageUrl: mediaUrl(row.image_url, row.test_id),
          };
        },
        (url) => {
          url.searchParams.set("test_id", `eq.${sourceTestId}`);
          url.searchParams.set("part", "in.(3,4)");
          url.searchParams.set("order", "order_index.asc,id.asc");
        }
      );
    },

    async readQuestions(sourceTestId: string) {
      await ensureMediaInfo(sourceTestId);
      return paginated(
        "mock_test_questions",
        "*",
        (value) => {
          const row = value as Record<string, unknown>;
          return {
            ...row,
            audio_url:
              typeof row.audio_url === "string"
                ? mediaUrl(row.audio_url, sourceTestId)
                : row.audio_url,
            image_url:
              typeof row.image_url === "string"
                ? mediaUrl(row.image_url, sourceTestId)
                : row.image_url,
          };
        },
        (url) => {
          url.searchParams.set("test_id", `eq.${sourceTestId}`);
          url.searchParams.set("part", "in.(1,2,3,4)");
          url.searchParams.set("order", "question_number.asc,id.asc");
        }
      );
    },

    async readStimuli(sourceTestId: string) {
      await ensureMediaInfo(sourceTestId);
      return paginated(
        "mock_test_passages",
        "*",
        (value) => {
          const row = value as Record<string, unknown>;
          return {
            ...row,
            audio_url:
              typeof row.audio_url === "string"
                ? mediaUrl(row.audio_url, sourceTestId)
                : row.audio_url,
            image_url:
              typeof row.image_url === "string"
                ? mediaUrl(row.image_url, sourceTestId)
                : row.image_url,
          };
        },
        (url) => {
          url.searchParams.set("test_id", `eq.${sourceTestId}`);
          url.searchParams.set("part", "in.(3,4)");
          url.searchParams.set("order", "order_index.asc,id.asc");
        }
      );
    },

    async downloadMedia(value: string, offset: number) {
      const url = assertAllowedUrl(value, hosts, baseUrl);
      const response = await config.request(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(config.timeoutMs),
        headers: offset > 0 ? { Range: `bytes=${offset}-` } : undefined,
      });
      if (response.url) assertAllowedUrl(response.url, hosts);
      if (!response.ok) {
        throw new Error(
          `TOEIC Listening media request failed (${response.status})`
        );
      }
      return {
        status: response.status,
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType:
          response.headers.get("content-type")?.split(";")[0]?.trim() || null,
      };
    },

    async inspectMedia(value: string): Promise<ToeicListeningMediaInspection> {
      const url = assertAllowedUrl(value, hosts, baseUrl);
      try {
        const response = await config.request(url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(config.timeoutMs),
          headers: { Accept: "*/*" },
        });
        if (response.url) assertAllowedUrl(response.url, hosts);
        if (!response.ok) {
          return { url: value, bytes: null, contentType: null };
        }
        const declared = Number(response.headers.get("content-length"));
        return {
          url: value,
          bytes: Number.isInteger(declared) && declared >= 0 ? declared : null,
          contentType:
            response.headers.get("content-type")?.split(";")[0]?.trim() || null,
        };
      } catch {
        return { url: value, bytes: null, contentType: null };
      }
    },
  };
}
