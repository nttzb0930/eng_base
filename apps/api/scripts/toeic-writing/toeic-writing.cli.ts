import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { createDautoeicToeicWritingSource } from "./dautoeic-toeic-writing-source.js";
import { createToeicWritingStorage } from "./toeic-writing.storage.js";

const profileSchema = z
  .object({
    apiBaseUrl: z.string().url(),
    allowedHosts: z.array(z.string().min(1)).min(1),
    timeoutMs: z.number().int().positive(),
    maxRetries: z.number().int().nonnegative(),
    downloadConcurrency: z.number().int().positive(),
    license: z.object({
      reference: z.string().min(1),
    }),
  })
  .passthrough();

function argument(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const values = argv
    .filter((value) => value.startsWith(prefix))
    .map((value) => value.slice(prefix.length).trim());
  if (values.length > 1) throw new Error(`--${name} may be provided only once`);
  return values[0] || undefined;
}

export function parseToeicWritingOptions(argv: string[]) {
  if (
    argv.some(
      (value) =>
        value.startsWith("--authorization=") ||
        value.startsWith("--access-token=")
    )
  ) {
    throw new Error("Source credentials are not accepted on the command line");
  }
  const unknown = argv.find(
    (value) =>
      value !== "--" &&
      !value.startsWith("--workers=") &&
      !value.startsWith("--approved-sha=")
  );
  if (unknown) throw new Error(`Unknown TOEIC Writing option: ${unknown}`);

  const workers = Number(argument(argv, "workers") ?? 4);
  if (!Number.isInteger(workers) || workers < 1 || workers > 12) {
    throw new Error("--workers must be between 1 and 12");
  }
  const approvedSha256 = argument(argv, "approved-sha");
  if (approvedSha256 && !/^[a-f0-9]{64}$/u.test(approvedSha256)) {
    throw new Error("--approved-sha must be a lowercase SHA-256");
  }

  return { workers, approvedSha256 };
}

export function loadToeicWritingStorageRuntime(argv: string[]) {
  const repositoryRoot = resolve(__dirname, "../../../..");
  return {
    repositoryRoot,
    options: parseToeicWritingOptions(argv),
    storage: createToeicWritingStorage({ repositoryRoot }),
  };
}

export function loadToeicWritingRemoteRuntime(argv: string[]) {
  const runtime = loadToeicWritingStorageRuntime(argv);
  const privateRoot = resolve(
    runtime.repositoryRoot,
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

  return {
    ...runtime,
    profile,
    licenseReference: profile.license.reference,
    source: createDautoeicToeicWritingSource({
      baseUrl: profile.apiBaseUrl,
      apiKey: readFileSync(apiKeyPath, "utf8"),
      accessToken: readFileSync(accessTokenPath, "utf8"),
      allowedHosts: profile.allowedHosts,
      request: fetch,
      timeoutMs: profile.timeoutMs,
      maxRetries: profile.maxRetries,
    }),
  };
}

export function requireToeicWritingApprovedSha(
  value: string | undefined
): string {
  if (!value) throw new Error("--approved-sha is required");
  return value;
}

export function safeToeicWritingCommandError(
  error: unknown,
  fallback: string
): string {
  return JSON.stringify({
    error: error instanceof Error ? error.message : fallback,
  });
}
