import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { z } from "zod";

import { createDautoeicToeicListeningSource } from "./dautoeic-toeic-listening-source.js";
import { createFileToeicListeningStorage } from "./toeic-listening-practice.storage.js";

const profileSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.literal("dautoeic"),
    apiBaseUrl: z.string().url(),
    allowedHosts: z.array(z.string().min(1)).min(1),
    timeoutMs: z.number().int().positive(),
    maxRetries: z.number().int().nonnegative(),
    downloadConcurrency: z.number().int().positive(),
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

export function parseToeicListeningOptions(argv: string[]) {
  const readingInventorySha256 = argument(argv, "reading-inventory-sha");
  if (
    readingInventorySha256 !== undefined &&
    !/^[a-f0-9]{64}$/u.test(readingInventorySha256)
  ) {
    throw new Error("--reading-inventory-sha must be a lowercase SHA-256");
  }
  const approvedSha256 = argument(argv, "approved-sha");
  if (approvedSha256 !== undefined && !/^[a-f0-9]{64}$/u.test(approvedSha256)) {
    throw new Error("--approved-sha must be a lowercase SHA-256");
  }
  return {
    readingInventorySha256,
    approvedSha256,
    authorization: argument(argv, "authorization"),
  };
}

export function loadToeicListeningRuntime(input: {
  argv: string[];
  requireReadingInventorySha: boolean;
  requireApprovedSha: boolean;
}) {
  const options = parseToeicListeningOptions(input.argv);
  if (input.requireReadingInventorySha && !options.readingInventorySha256) {
    throw new Error("--reading-inventory-sha is required");
  }
  if (input.requireApprovedSha && !options.approvedSha256) {
    throw new Error("--approved-sha is required");
  }
  const repositoryRoot = resolve(__dirname, "../../../..");
  const profile = profileSchema.parse(
    JSON.parse(
      readFileSync(
        resolve(__dirname, "toeic-listening-practice.profile.json"),
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
    options.authorization ??
    (existsSync(authorizationPath)
      ? readFileSync(authorizationPath, "utf8").trim()
      : undefined);
  if (!authorization) {
    throw new Error(
      "--authorization or private authorization file is required"
    );
  }
  return {
    options,
    profile,
    storage: createFileToeicListeningStorage(repositoryRoot),
    source: createDautoeicToeicListeningSource({
      baseUrl: profile.apiBaseUrl,
      authorization,
      allowedHosts: profile.allowedHosts,
      request: fetch,
      timeoutMs: profile.timeoutMs,
      maxRetries: profile.maxRetries,
    }),
  };
}

export function loadToeicListeningInventoryRuntime(argv: string[]) {
  return loadToeicListeningRuntime({
    argv,
    requireReadingInventorySha: true,
    requireApprovedSha: false,
  });
}
