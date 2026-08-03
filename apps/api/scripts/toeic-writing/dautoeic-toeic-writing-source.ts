import { z } from "zod";

import { sha256Canonical } from "./toeic-writing.canonical.js";
import type {
  ToeicWritingCanonicalDifficulty,
  ToeicWritingPartOneSourceTask,
  ToeicWritingPartTwoRequirement,
  ToeicWritingPartTwoSourceTask,
  ToeicWritingSource,
} from "./toeic-writing.types.js";

type SourceConfig = {
  baseUrl: string;
  apiKey: string;
  accessToken: string;
  allowedHosts: string[];
  request: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  pageSize?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

const sourceId = z
  .union([z.string().trim().min(1), z.number()])
  .transform(String);
const partOneRowSchema = z
  .object({
    id: sourceId,
    external_id: z.coerce.number().int().positive(),
    image_path: z.string().trim().min(1),
    image_name: z.string().nullable().optional(),
    words: z.unknown(),
    words_vi: z.unknown().nullable().optional(),
    difficulty: z.string().trim().min(1),
    structure_suggestions: z.unknown().nullable().optional(),
    sample_sentences: z.unknown().nullable().optional(),
    sample_structures: z.unknown().nullable().optional(),
    samples_en: z.unknown().nullable().optional(),
    samples_vi: z.unknown().nullable().optional(),
    ideas: z.unknown().nullable().optional(),
    pattern: z.string().nullable().optional(),
    status: z.string().trim().min(1),
    is_hidden: z.boolean(),
  })
  .passthrough();
const partTwoRowSchema = z
  .object({
    id: sourceId,
    external_id: z.coerce.number().int().positive(),
    title: z.string().trim().min(1),
    title_vi: z.string().nullable().optional(),
    difficulty: z.string().nullable().optional(),
    directions: z.string().nullable().optional(),
    email: z.string().trim().min(1),
    email_vi: z.string().nullable().optional(),
    requirements: z.unknown().nullable().optional(),
    outline_1: z.unknown().nullable().optional(),
    outline_2: z.unknown().nullable().optional(),
    chunks_1: z.unknown(),
    chunks_2: z.unknown(),
    gap_references: z.unknown().nullable().optional(),
    sample_en: z.string().nullable().optional(),
    sample_vi: z.string().nullable().optional(),
    status: z.string().trim().min(1),
    is_hidden: z.boolean(),
  })
  .passthrough();

function credential(value: string, label: string): string {
  const normalized = value.trim().replace(/^Bearer\s+/iu, "");
  if (!normalized) throw new Error(`${label} is empty`);
  return normalized;
}

function allowedUrl(value: string | URL, hosts: Set<string>): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || !hosts.has(url.hostname)) {
    throw new Error("TOEIC Writing source URL is not allowed");
  }
  return url;
}

function difficulty(
  value: string | null | undefined
): ToeicWritingCanonicalDifficulty {
  const normalized = value?.trim().toLocaleUpperCase("en-US") ?? "MEDIUM";
  if (normalized === "EASY" || normalized === "MEDIUM") return normalized;
  throw new Error(`Unsupported TOEIC Writing difficulty: ${normalized}`);
}

function decoded(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  if (!normalized) return [];
  try {
    return JSON.parse(normalized) as unknown;
  } catch {
    return normalized.split(/\r?\n|,/u).map((item) => item.trim());
  }
}

function strings(value: unknown): string[] {
  const parsed = decoded(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "en" in item) {
        return String((item as { en?: unknown }).en ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function bilingualChunks(
  value: unknown
): Array<{ en: string; vi: string | null }> {
  const parsed = decoded(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item === "string") return { en: item.trim(), vi: null };
      if (!item || typeof item !== "object") return { en: "", vi: null };
      const record = item as Record<string, unknown>;
      return {
        en: String(record.en ?? "").trim(),
        vi:
          record.vi === null || record.vi === undefined
            ? null
            : String(record.vi).trim() || null,
      };
    })
    .filter((item) => item.en.length > 0);
}

function requirements(
  value: unknown,
  fallback: string | null | undefined
): ToeicWritingPartTwoRequirement[] {
  const parsed = decoded(value);
  if (Array.isArray(parsed)) {
    const mapped = parsed
      .map((item, index) => {
        if (typeof item === "string") {
          return { order: index + 1, textEn: item.trim(), textVi: null };
        }
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const textEn = String(
          record.textEn ?? record.en ?? record.text ?? ""
        ).trim();
        if (!textEn) return null;
        const textViValue = record.textVi ?? record.vi;
        return {
          order: index + 1,
          textEn,
          textVi:
            textViValue === null || textViValue === undefined
              ? null
              : String(textViValue).trim() || null,
        };
      })
      .filter((item): item is ToeicWritingPartTwoRequirement => item !== null);
    if (mapped.length > 0) return mapped;
  }

  return fallback?.trim()
    ? [{ order: 1, textEn: fallback.trim(), textVi: null }]
    : [];
}

function referencedGaps(chunks: string[], explicit: unknown): string[] {
  const supplied = strings(explicit);
  if (supplied.length > 0) return supplied;
  return [
    ...new Set(
      chunks.flatMap((chunk) =>
        [...chunk.matchAll(/\{\{([^{}]+)\}\}/gu)]
          .map((match) => match[1]?.trim() ?? "")
          .filter(Boolean)
      )
    ),
  ];
}

export function createDautoeicToeicWritingSource(
  config: SourceConfig
): ToeicWritingSource {
  const hosts = new Set(config.allowedHosts);
  const baseUrl = allowedUrl(config.baseUrl, hosts);
  const apiKey = credential(config.apiKey, "TOEIC Writing source API key");
  const accessToken = credential(
    config.accessToken,
    "TOEIC Writing source access token"
  );
  const pageSize = config.pageSize ?? 1_000;
  const sleep =
    config.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  async function sourceRequest(
    url: URL,
    init: RequestInit = {}
  ): Promise<Response> {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await config.request(url, {
          ...init,
          redirect: "follow",
          signal: AbortSignal.timeout(config.timeoutMs),
          headers: {
            Accept: "application/json",
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
            ...init.headers,
          },
        });
      } catch (error) {
        if (attempt >= config.maxRetries) throw error;
        await sleep(2 ** attempt * 250);
        continue;
      }
      if (response.url) allowedUrl(response.url, hosts);
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `TOEIC Writing source authorization failed (${response.status})`
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
          `TOEIC Writing source request failed (${response.status})`
        );
      }
      return response;
    }
  }

  async function paginated(table: string): Promise<unknown[]> {
    const result: unknown[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const url = allowedUrl(
        new URL(`/rest/v1/${table}`, baseUrl.origin),
        hosts
      );
      url.searchParams.set("select", "*");
      url.searchParams.set("status", "eq.published");
      url.searchParams.set("is_hidden", "eq.false");
      url.searchParams.set("order", "external_id.asc,id.asc");
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));
      const value = (await sourceRequest(url)).json() as Promise<unknown>;
      const page = await value;
      if (!Array.isArray(page)) {
        throw new Error("TOEIC Writing source response must be an array");
      }
      result.push(...page);
      if (page.length < pageSize) return result;
    }
  }

  function imageUrl(path: string): string {
    const encodedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return allowedUrl(
      new URL(
        `/storage/v1/object/authenticated/writing-part1-images/${encodedPath}`,
        baseUrl.origin
      ),
      hosts
    ).toString();
  }

  return {
    async listPartOneTasks() {
      return (await paginated("writing_part1_questions")).map((value) => {
        const row = partOneRowSchema.parse(value);
        const words = strings(row.words);
        const translations = strings(row.words_vi);
        const normalized = {
          sourceTaskId: row.id,
          part: 1 as const,
          order: row.external_id,
          title: row.image_name?.trim() || `Part 1 - ${row.external_id}`,
          difficulty: difficulty(row.difficulty),
          instructionsEn:
            "Write one sentence about the picture using the two given words.",
          instructionsVi: "Viết một câu về bức tranh, sử dụng hai từ đã cho.",
          imageUrl: imageUrl(row.image_path),
          payload: {
            requiredWords: words.map((word, index) => ({
              en: word,
              vi: translations[index] ?? null,
            })),
            pattern: row.pattern?.trim() || null,
            structureSuggestions: [
              ...strings(row.structure_suggestions),
              ...strings(row.sample_structures),
            ],
            ideas: strings(row.ideas),
            samplesEn: [
              ...strings(row.samples_en),
              ...strings(row.sample_sentences),
            ],
            samplesVi: strings(row.samples_vi),
          },
        };
        const result: ToeicWritingPartOneSourceTask = {
          ...normalized,
          sourceVersion: sha256Canonical(normalized),
        };
        return result;
      });
    },

    async listPartTwoTasks() {
      return (await paginated("writing_part2_questions")).map((value) => {
        const row = partTwoRowSchema.parse(value);
        const chunksLevel1 = bilingualChunks(row.chunks_1);
        const chunksLevel2 = bilingualChunks(row.chunks_2);
        const levelTwoEnglish = chunksLevel2.map((chunk) => chunk.en);
        const normalized = {
          sourceTaskId: row.id,
          part: 2 as const,
          order: row.external_id,
          title: row.title,
          difficulty: difficulty(row.difficulty),
          instructionsEn:
            row.directions?.trim() || "Read the email and write a response.",
          instructionsVi: null,
          imageUrl: null,
          payload: {
            promptEn: row.email,
            promptVi: row.email_vi?.trim() || null,
            requirements: requirements(row.requirements, row.directions),
            outlineLevel1: strings(row.outline_1),
            outlineLevel2: strings(row.outline_2),
            chunksLevel1: chunksLevel1.map((chunk) => chunk.en),
            chunksLevel2: levelTwoEnglish,
            gapReferences: referencedGaps(levelTwoEnglish, row.gap_references),
            sampleEn: row.sample_en?.trim() || levelTwoEnglish.join(" ").trim(),
            sampleVi:
              row.sample_vi?.trim() ||
              chunksLevel2
                .map((chunk) => chunk.vi)
                .filter((item): item is string => item !== null)
                .join(" ")
                .trim() ||
              null,
          },
        };
        const result: ToeicWritingPartTwoSourceTask = {
          ...normalized,
          sourceVersion: sha256Canonical(normalized),
        };
        return result;
      });
    },

    async inspectImage(value) {
      const url = allowedUrl(value, hosts);
      const response = await sourceRequest(url, {
        method: "HEAD",
        headers: { Accept: "*/*" },
      });
      const declaredBytes = Number(response.headers.get("content-length"));
      return {
        bytes:
          Number.isInteger(declaredBytes) && declaredBytes >= 0
            ? declaredBytes
            : null,
        contentType:
          response.headers.get("content-type")?.split(";")[0]?.trim() || null,
      };
    },

    async downloadImage(value) {
      const response = await sourceRequest(allowedUrl(value, hosts), {
        headers: { Accept: "image/*" },
      });
      if (!response.body) {
        throw new Error("TOEIC Writing image response has no body");
      }
      return response.body;
    },
  };
}
