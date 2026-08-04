import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { z } from "zod";

import { createDautoeicToeicReadingSource } from "./dautoeic-toeic-reading-source.js";
import { createFileToeicReadingStorage } from "./toeic-reading-practice.storage.js";

const profileSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.literal("dautoeic"),
    sourceWebUrl: z.string().url(),
    apiBaseUrl: z.string().url(),
    allowedHosts: z.array(z.string().min(1)).min(1),
    license: z
      .object({
        name: z.string().min(1),
        reference: z.string().url(),
        intendedUse: z.string().min(1),
      })
      .strict(),
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

export function parseToeicReadingOptions(argv: string[]) {
  const sourceSet = argument(argv, "set") ?? "2026";
  const limitText = argument(argv, "limit-tests") ?? "10";
  const limitTests = Number(limitText);
  if (!Number.isInteger(limitTests) || limitTests <= 0) {
    throw new Error("--limit-tests must be a positive integer");
  }
  const approvedSha256 = argument(argv, "approved-sha");
  if (approvedSha256 !== undefined && !/^[a-f0-9]{64}$/u.test(approvedSha256)) {
    throw new Error("--approved-sha must be a lowercase SHA-256");
  }
  return {
    sourceSet,
    limitTests,
    approvedSha256,
    authorization: argument(argv, "authorization"),
  };
}

export function loadToeicReadingRuntime(input: {
  argv: string[];
  requireAuthorization: boolean;
  requireApprovedSha: boolean;
}) {
  const options = parseToeicReadingOptions(input.argv);
  const repositoryRoot = resolve(__dirname, "../../../..");
  const profile = profileSchema.parse(
    JSON.parse(
      readFileSync(
        resolve(__dirname, "toeic-reading-practice.profile.json"),
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
  if (input.requireAuthorization && !authorization) {
    throw new Error(
      "--authorization or private authorization file is required"
    );
  }
  if (input.requireApprovedSha && !options.approvedSha256) {
    throw new Error("--approved-sha is required");
  }
  return {
    options,
    profile,
    storage: createFileToeicReadingStorage({ repositoryRoot }),
    source: authorization
      ? createDautoeicToeicReadingSource({
          baseUrl: profile.apiBaseUrl,
          authorization,
          allowedHosts: profile.allowedHosts,
          request: fetch,
          timeoutMs: profile.timeoutMs,
          maxRetries: profile.maxRetries,
        })
      : undefined,
  };
}
