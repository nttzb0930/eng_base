import { z } from "zod";

import type {
  ToeicDictationItemRow,
  ToeicDictationSource,
  ToeicDictationSetRow,
} from "./toeic-dictation.types";

const sourceId = z.union([z.string().trim().min(1), z.number()]).transform(String);
const part = z
  .union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.string().regex(/^part[1-4]$/u),
  ])
  .transform((value) => (typeof value === "number" ? value : Number(value.slice(-1))))
  .pipe(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]));

const setSchema = z
  .object({
    id: sourceId,
    name: z.string().trim().min(1),
    folder_path: z.string().nullable().optional(),
    toeic_part: part,
    access_level: z.enum(["free", "pro"]),
    order_index: z.coerce.number().int(),
    collection_name: z.string().trim().min(1),
    chapter_name: z.string().nullable().optional(),
    subtitle: z.string().nullable().optional(),
    is_hidden: z.boolean().default(false),
  })
  .passthrough();

const itemSchema = z
  .object({
    id: sourceId,
    set_id: sourceId,
    order_index: z.coerce.number().int(),
    group_id: sourceId.nullable().optional(),
    group_order: z.coerce.number().int().nullable().optional(),
    audio_url: z.string().nullable().optional(),
    transcript: z.string().nullable().optional(),
    translation_vi: z.string().nullable().optional(),
    duration_seconds: z.coerce.number().nonnegative().nullable().optional(),
    is_hidden: z.boolean().default(false),
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
};

function assertAllowedUrl(value: string, hosts: Set<string>, base?: URL) {
  let url: URL;
  try {
    url = base ? new URL(value, base) : new URL(value);
  } catch {
    throw new Error("TOEIC Dictation source URL is invalid");
  }
  if (url.protocol !== "https:" || !hosts.has(url.hostname)) {
    throw new Error("TOEIC Dictation source URL is not allowed");
  }
  return url;
}

export function createDautoeicToeicDictationSource(
  config: SourceConfig
): ToeicDictationSource {
  const hosts = new Set(config.allowedHosts);
  const baseUrl = assertAllowedUrl(config.baseUrl, hosts);
  const pageSize = config.pageSize ?? 1_000;

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
          `TOEIC Dictation source authorization failed (${response.status})`
        );
      }
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < config.maxRetries
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 250));
        continue;
      }
      if (!response.ok) {
        throw new Error(`TOEIC Dictation source request failed (${response.status})`);
      }
      return response;
    }
  }

  async function readJson(url: URL) {
    return (await sourceRequest(url)).json() as Promise<unknown>;
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
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));
      filters(url);
      const page = await readJson(url);
      if (!Array.isArray(page)) {
        throw new Error("TOEIC Dictation source response must be an array");
      }
      values.push(...page.map(parse));
      if (page.length < pageSize) return values;
    }
  }

  return {
    listSets(collectionName) {
      return paginated(
        "listening_sets",
        "id,name,folder_path,toeic_part,access_level,order_index,collection_name,chapter_name,subtitle,is_hidden",
        (value) => {
          const row = setSchema.parse(value);
          const result: ToeicDictationSetRow = {
            sourceSetId: row.id,
            name: row.name,
            folderPath: row.folder_path ?? null,
            part: row.toeic_part,
            accessLevel: row.access_level,
            order: row.order_index,
            collectionName: row.collection_name,
            chapterName: row.chapter_name ?? null,
            subtitle: row.subtitle ?? null,
            isHidden: row.is_hidden,
          };
          return result;
        },
        (url) => {
          url.searchParams.set("collection_name", `eq.${collectionName}`);
          url.searchParams.set("is_hidden", "eq.false");
          url.searchParams.set("order", "order_index.asc,id.asc");
        }
      );
    },

    listItems(sourceSetId) {
      return paginated(
        "listening_items",
        "id,set_id,order_index,group_id,group_order,audio_url,transcript,translation_vi,duration_seconds,is_hidden",
        (value) => {
          const row = itemSchema.parse(value);
          const result: ToeicDictationItemRow = {
            sourceItemId: row.id,
            sourceSetId: row.set_id,
            order: row.order_index,
            groupId: row.group_id ?? null,
            groupOrder: row.group_order ?? null,
            audioUrl: row.audio_url ?? null,
            transcript: row.transcript ?? null,
            translationVi: row.translation_vi ?? null,
            durationSeconds: row.duration_seconds ?? null,
            isHidden: row.is_hidden,
          };
          return result;
        },
        (url) => {
          url.searchParams.set("set_id", `eq.${sourceSetId}`);
          url.searchParams.set("is_hidden", "eq.false");
          url.searchParams.set("order", "order_index.asc,id.asc");
        }
      );
    },

    async inspectMedia(value) {
      const url = assertAllowedUrl(value, hosts, baseUrl);
      const response = await config.request(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(config.timeoutMs),
        headers: { Accept: "*/*" },
      });
      if (response.url) assertAllowedUrl(response.url, hosts);
      if (!response.ok) return { bytes: null, contentType: null };
      const declared = Number(response.headers.get("content-length"));
      return {
        bytes: Number.isInteger(declared) && declared >= 0 ? declared : null,
        contentType:
          response.headers.get("content-type")?.split(";")[0]?.trim() || null,
      };
    },
  };
}
