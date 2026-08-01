import { z } from "zod";

import type {
  ToeicVocabularyCacheRow,
  ToeicVocabularyCacheSource,
} from "./toeic-vocabulary-cache.types.js";

const rowSchema = z
  .object({
    question_id: z.string().min(1),
    status: z.literal("ready"),
    vocabulary: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

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

function token(value: string) {
  return value.trim().replace(/^Bearer\s+/iu, "");
}

function allowedUrl(value: string, hosts: Set<string>) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !hosts.has(url.hostname)) {
    throw new Error("TOEIC vocabulary cache source URL is not allowed");
  }
  return url;
}

export function createDautoeicVocabularyCacheSource(
  config: SourceConfig
): ToeicVocabularyCacheSource {
  const hosts = new Set(config.allowedHosts);
  const baseUrl = allowedUrl(config.baseUrl, hosts);
  const apiKey = token(config.apiKey);
  const accessToken = token(config.accessToken);
  const sleep =
    config.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  async function request(questionIds: string[]) {
    const url = new URL(
      "/rest/v1/mock_test_question_vocabulary",
      baseUrl.origin
    );
    url.searchParams.set("select", "question_id,status,vocabulary");
    url.searchParams.set("question_id", `in.(${questionIds.join(",")})`);
    url.searchParams.set("status", "eq.ready");

    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await config.request(url, {
          headers: {
            Accept: "application/json",
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(config.timeoutMs),
        });
      } catch (error) {
        if (attempt >= config.maxRetries) throw error;
        await sleep(2 ** attempt * 250);
        continue;
      }
      if (response.url) allowedUrl(response.url, hosts);
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `TOEIC vocabulary cache authorization failed (${response.status})`
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
          `TOEIC vocabulary cache request failed (${response.status})`
        );
      }
      const value = (await response.json()) as unknown;
      if (!Array.isArray(value)) {
        throw new Error("TOEIC vocabulary cache response must be an array");
      }
      return value.map((item): ToeicVocabularyCacheRow => {
        const row = rowSchema.parse(item);
        return {
          questionId: row.question_id,
          vocabulary: row.vocabulary,
        };
      });
    }
  }

  return { readReady: request };
}
