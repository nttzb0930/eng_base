import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { createDautoeicVocabularyCacheSource } from "./toeic-vocabulary-cache.source.js";
import { createToeicVocabularyCacheStorage } from "./toeic-vocabulary-cache.storage.js";

const profileSchema = z.object({
  apiBaseUrl: z.string().url(),
  allowedHosts: z.array(z.string().min(1)).min(1),
  timeoutMs: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
});

function argument(argv: string[], name: string) {
  const prefix = `--${name}=`;
  const values = argv
    .filter((value) => value.startsWith(prefix))
    .map((value) => value.slice(prefix.length).trim());
  if (values.length > 1) throw new Error(`--${name} may be provided only once`);
  return values[0] || undefined;
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  name: string
) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return parsed;
}

export function parseToeicVocabularyCacheOptions(argv: string[]) {
  const readingInventorySha256 = argument(argv, "reading-inventory-sha");
  if (
    readingInventorySha256 !== undefined &&
    !/^[a-f0-9]{64}$/u.test(readingInventorySha256)
  ) {
    throw new Error("--reading-inventory-sha must be a lowercase SHA-256");
  }
  return {
    readingInventorySha256,
    workers: positiveInteger(argument(argv, "workers"), 4, "workers"),
    batchSize: positiveInteger(argument(argv, "batch-size"), 50, "batch-size"),
  };
}

export function loadToeicVocabularyCacheRuntime(argv: string[]) {
  const repositoryRoot = resolve(__dirname, "../../../..");
  const privateRoot = resolve(
    repositoryRoot,
    "var",
    "licensed-content",
    "dautoeic"
  );
  const apiKeyPath = resolve(privateRoot, "source-authorization.txt");
  const accessTokenPath = resolve(privateRoot, "source-user-access-token.txt");
  if (!existsSync(apiKeyPath)) {
    throw new Error("Private source authorization file is required");
  }
  if (!existsSync(accessTokenPath)) {
    throw new Error("Private source user access token file is required");
  }
  const profile = profileSchema.parse(
    JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          "../toeic-reading-practice/toeic-reading-practice.profile.json"
        ),
        "utf8"
      )
    )
  );
  const source = createDautoeicVocabularyCacheSource({
    baseUrl: profile.apiBaseUrl,
    apiKey: readFileSync(apiKeyPath, "utf8"),
    accessToken: readFileSync(accessTokenPath, "utf8"),
    allowedHosts: profile.allowedHosts,
    request: fetch,
    timeoutMs: profile.timeoutMs,
    maxRetries: profile.maxRetries,
  });
  return {
    repositoryRoot,
    options: parseToeicVocabularyCacheOptions(argv),
    source,
    storage: createToeicVocabularyCacheStorage(repositoryRoot),
  };
}
