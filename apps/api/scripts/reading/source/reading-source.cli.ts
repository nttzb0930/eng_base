import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { z } from "zod";

import { createDautoeicReadingSource } from "./dautoeic-reading-source.js";
import { createFileReadingSourceStorage } from "./reading-source.storage.js";

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

function readArgument(argv: string[], name: string) {
  const prefix = `--${name}=`;
  const matches = argv.filter((argument) => argument.startsWith(prefix));
  if (matches.length > 1) throw new Error(`--${name} may be provided only once`);
  return matches[0]?.slice(prefix.length).trim() || undefined;
}

function loadProfile() {
  const path = resolve(__dirname, "reading-source.profile.json");
  return profileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function loadReadingSourceRuntime(input: {
  argv: string[];
  repositoryRoot?: string;
  requireAuthorization?: boolean;
  requireApprovedSha?: boolean;
}) {
  const repositoryRoot = resolve(
    input.repositoryRoot ?? resolve(process.cwd(), "../.."),
  );
  const profile = loadProfile();
  const privateAuthorizationPath = join(
    repositoryRoot,
    "var",
    "licensed-content",
    "dautoeic",
    "source-authorization.txt",
  );
  const authorization =
    readArgument(input.argv, "authorization") ??
    (existsSync(privateAuthorizationPath)
      ? readFileSync(privateAuthorizationPath, "utf8").trim()
      : undefined);
  if (input.requireAuthorization && !authorization) {
    throw new Error(
      "--authorization or private authorization file is required",
    );
  }

  const approvedSha256 = readArgument(input.argv, "approved-sha");
  if (
    input.requireApprovedSha &&
    !/^[a-f0-9]{64}$/u.test(approvedSha256 ?? "")
  ) {
    throw new Error("--approved-sha must be a lowercase SHA-256");
  }

  const storage = createFileReadingSourceStorage({ repositoryRoot });
  const source = authorization
    ? createDautoeicReadingSource({
        baseUrl: profile.apiBaseUrl,
        authorization,
        allowedHosts: profile.allowedHosts,
        request: fetch,
        timeoutMs: profile.timeoutMs,
        maxRetries: profile.maxRetries,
      })
    : undefined;

  return {
    profile,
    authorization,
    approvedSha256,
    repositoryRoot,
    source,
    storage,
  };
}
