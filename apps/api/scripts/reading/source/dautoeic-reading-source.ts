import { z } from "zod";

import { parseReadingSourceRow } from "./reading-source.canonical.js";
import type {
  DautoeicReadingSource,
  ReadingSourceAccessSummary,
} from "./reading-source.types.js";

const accessSummarySchema = z
  .object({
    id: z
      .union([z.string().trim().min(1), z.number().int().nonnegative()])
      .transform(String),
    level: z
      .union([z.literal("1"), z.literal("2"), z.literal(1), z.literal(2)])
      .transform((value): "1" | "2" => String(value) as "1" | "2"),
    is_free: z.boolean(),
    is_hidden: z.boolean(),
  })
  .strict();

const accessColumns = "id,level,is_free,is_hidden";
const contentColumns = [
  "id",
  "title",
  "topic",
  "level",
  "order_index",
  "content_html",
  "questions_json",
  "vocabulary_json",
  "is_free",
  "is_hidden",
  "updated_at",
].join(",");

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

function assertAllowedUrl(value: string, allowedHosts: Set<string>) {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Reading source URL must use HTTPS");
  }
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`Reading source host is not in the allowlist`);
  }
  return url;
}

function schemaMessage(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
    .join("\n");
}

export function createDautoeicReadingSource(
  config: SourceConfig,
): DautoeicReadingSource {
  const allowedHosts = new Set(config.allowedHosts);
  const baseUrl = assertAllowedUrl(config.baseUrl, allowedHosts);
  const pageSize = config.pageSize ?? 1_000;
  const maxResponseBytes = config.maxResponseBytes ?? 20 * 1024 * 1024;
  const sleep =
    config.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  const request = async (url: URL, init: RequestInit) => {
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

      if (response.url) assertAllowedUrl(response.url, allowedHosts);
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Reading source authorization failed (${response.status})`,
        );
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < config.maxRetries) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        const delay = Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1_000
          : 2 ** attempt * 250;
        await sleep(delay);
        continue;
      }
      if (!response.ok) {
        throw new Error(`Reading source request failed (${response.status})`);
      }
      return response;
    }
  };

  const readJsonPage = async (url: URL): Promise<unknown[]> => {
    const response = await request(url, { method: "GET" });
    const declaredBytes = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > maxResponseBytes
    ) {
      throw new Error("Reading source response exceeds the size limit");
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxResponseBytes) {
      throw new Error("Reading source response exceeds the size limit");
    }
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Reading source response must be an array");
    }
    return parsed;
  };

  const paginated = async <T>(
    buildUrl: (offset: number) => URL,
    parse: (input: unknown) => T,
  ) => {
    const values: T[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await readJsonPage(buildUrl(offset));
      values.push(...page.map(parse));
      if (page.length < pageSize) return values;
    }
  };

  const tableUrl = () =>
    new URL("/rest/v1/reading_passages", baseUrl.origin);

  return {
    listAccessSummaries() {
      return paginated(
        (offset) => {
          const url = tableUrl();
          url.searchParams.set("select", accessColumns);
          url.searchParams.set("order", "id.asc");
          url.searchParams.set("limit", String(pageSize));
          url.searchParams.set("offset", String(offset));
          return url;
        },
        (input): ReadingSourceAccessSummary => {
          const parsed = accessSummarySchema.safeParse(input);
          if (!parsed.success) throw new Error(schemaMessage(parsed.error));
          return {
            sourceId: parsed.data.id,
            sourceLevel: parsed.data.level,
            isFree: parsed.data.is_free,
            isHidden: parsed.data.is_hidden,
          };
        },
      );
    },

    listReadingRows() {
      return paginated(
        (offset) => {
          const url = tableUrl();
          url.searchParams.set("select", contentColumns);
          url.searchParams.set("is_free", "eq.true");
          url.searchParams.set("is_hidden", "eq.false");
          url.searchParams.set("order", "order_index.asc,id.asc");
          url.searchParams.set("limit", String(pageSize));
          url.searchParams.set("offset", String(offset));
          return url;
        },
        parseReadingSourceRow,
      );
    },

    async inspectEmbeddedImage(value) {
      const url = assertAllowedUrl(value, allowedHosts);
      const response = await request(url, {
        method: "HEAD",
        headers: { Accept: "image/*" },
      });
      const declaredBytes = response.headers.get("content-length");
      const bytes = declaredBytes === null ? null : Number(declaredBytes);
      return {
        url: url.href,
        bytes: bytes !== null && Number.isFinite(bytes) ? bytes : null,
        mimeType: response.headers.get("content-type"),
      };
    },

    openEmbeddedImage(value) {
      const url = assertAllowedUrl(value, allowedHosts);
      return request(url, {
        method: "GET",
        headers: { Accept: "image/*" },
      });
    },
  };
}
