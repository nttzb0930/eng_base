import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { z } from "zod";

import { createDautoeicToeicDictationSource } from "./dautoeic-toeic-dictation-source.js";

const profileSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.literal("dautoeic"),
    apiBaseUrl: z.string().url(),
    allowedHosts: z.array(z.string().min(1)).min(1),
    timeoutMs: z.number().int().positive(),
    maxRetries: z.number().int().nonnegative(),
    downloadConcurrency: z.number().int().positive(),
    inventoryConcurrency: z.number().int().positive(),
  })
  .strict();

function argument(argv: string[], name: string) {
  const prefix = `--${name}=`;
  const values = argv
    .filter((value) => value.startsWith(prefix))
    .map((value) => value.slice(prefix.length).trim());
  if (values.length > 1) throw new Error(`--${name} may be provided only once`);
  return values[0] || undefined;
}

export function loadToeicDictationRuntime(argv: string[]) {
  const collection = argument(argv, "collection") ?? "2026";
  if (collection !== "2026") {
    throw new Error("--collection must be 2026 during Phase 1");
  }
  const repositoryRoot = resolve(__dirname, "../../../..");
  const profile = profileSchema.parse(
    JSON.parse(
      readFileSync(
        resolve(__dirname, "toeic-dictation.profile.json"),
        "utf8"
      )
    )
  );
  const authorizationPath = join(
    repositoryRoot,
    "var",
    "licensed-content",
    "dautoeic",
    "source-authorization.txt"
  );
  const authorization =
    argument(argv, "authorization") ??
    (existsSync(authorizationPath)
      ? readFileSync(authorizationPath, "utf8").trim()
      : undefined);
  if (!authorization) {
    throw new Error(
      "--authorization or private authorization file is required"
    );
  }
  return {
    repositoryRoot,
    profile,
    collectionName: "Đề 2026",
    inventoryConcurrency: profile.inventoryConcurrency,
    source: createDautoeicToeicDictationSource({
      baseUrl: profile.apiBaseUrl,
      authorization,
      allowedHosts: profile.allowedHosts,
      request: fetch,
      timeoutMs: profile.timeoutMs,
      maxRetries: profile.maxRetries,
    }),
  };
}
