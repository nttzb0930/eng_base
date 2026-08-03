import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { resolveGeminiConfiguration } from "../../src/config/gemini.config";
import {
  createGeminiWritingClient,
  GeminiWritingProvider,
} from "../../src/module/toeic-writing/provider/gemini-writing.provider";
import type {
  WritingAiProvider,
  WritingImageMimeType,
} from "../../src/module/toeic-writing/provider/writing-ai-provider";
import { resolveLicensedContentRoot } from "../../src/config/application.config";
import type { ToeicWritingCanonicalTask } from "../toeic-writing/toeic-writing.types";
import type { ToeicWritingAiStorage } from "./toeic-writing-ai.storage";
import { createToeicWritingAiStorage } from "./toeic-writing-ai.storage";
import { pictureContextCandidateSchema } from "./toeic-writing-ai.validation";

export type PartOneEnrichmentTask = {
  source: string;
  sourceTaskId: string;
  sourceVersion: string;
  contentVersion: string;
  imageSha256: string;
  imagePath: string;
  mimeType: WritingImageMimeType;
  requiredWords: string[];
};

type EnrichmentSummary = {
  eligible: number;
  completed: string[];
  skipped: string[];
  rejected: Array<{ sourceTaskId: string; reason: string }>;
  failed: Array<{ sourceTaskId: string; category: string }>;
  workers: number;
  dryRun: boolean;
};

async function mapWorkers<T>(
  values: T[],
  workers: number,
  operation: (value: T) => Promise<void>
) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(workers, values.length) }, async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        const value = values[index];
        if (!value) return;
        await operation(value);
      }
    })
  );
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/Bearer\s+[^\s}]+/giu, "Bearer [redacted]")
    .replace(/(?:api[-_ ]?key|key)\s*[:=]\s*[^\s,}]+/giu, "[redacted]")
    .slice(0, 500);
}

export async function enrichPartOneCandidates(input: {
  tasks: PartOneEnrichmentTask[];
  storage: ToeicWritingAiStorage;
  provider: Pick<WritingAiProvider, "enrichPicture">;
  model: string;
  promptVersion: string;
  workers: number;
  dryRun: boolean;
  verbose?: boolean;
  onProgress?: (message: string) => void;
}): Promise<EnrichmentSummary> {
  const summary: EnrichmentSummary = {
    eligible: input.tasks.length,
    completed: [],
    skipped: [],
    rejected: [],
    failed: [],
    workers: input.workers,
    dryRun: input.dryRun,
  };
  if (input.dryRun) return summary;

  await mapWorkers(input.tasks, input.workers, async (task) => {
    const existing = await input.storage.readCandidate(
      task,
      input.promptVersion
    );
    if (existing) {
      summary.skipped.push(task.sourceTaskId);
      input.onProgress?.(`[skip] ${task.sourceTaskId}`);
      return;
    }
    if (input.verbose) {
      input.onProgress?.(`[start] ${task.sourceTaskId}`);
    }
    try {
      const context = await input.provider.enrichPicture({
        imageBytes: await readFile(task.imagePath),
        mimeType: task.mimeType,
        requiredWords: task.requiredWords,
      });
      const candidate = pictureContextCandidateSchema.parse({
        schemaVersion: 1,
        source: task.source,
        sourceTaskId: task.sourceTaskId,
        sourceVersion: task.sourceVersion,
        contentVersion: task.contentVersion,
        imageSha256: task.imageSha256,
        model: input.model,
        promptVersion: input.promptVersion,
        context,
      });
      await input.storage.writeCandidate(candidate);
      summary.completed.push(task.sourceTaskId);
      input.onProgress?.(`[done] ${task.sourceTaskId}`);
    } catch (error) {
      if (error && typeof error === "object" && "issues" in error) {
        summary.rejected.push({
          sourceTaskId: task.sourceTaskId,
          reason: "INVALID_CONTEXT",
        });
        if (input.verbose) {
          input.onProgress?.(`[reject] ${task.sourceTaskId} INVALID_CONTEXT`);
        }
      } else {
        const category = error instanceof Error ? error.name : "Error";
        summary.failed.push({
          sourceTaskId: task.sourceTaskId,
          category,
        });
        if (input.verbose) {
          input.onProgress?.(
            `[fail] ${task.sourceTaskId} ${category}: ${safeErrorMessage(error)}`
          );
        }
      }
    }
  });

  summary.completed.sort();
  summary.skipped.sort();
  summary.rejected.sort((a, b) => a.sourceTaskId.localeCompare(b.sourceTaskId));
  summary.failed.sort((a, b) => a.sourceTaskId.localeCompare(b.sourceTaskId));
  return summary;
}

function option(argv: string[], name: string): string | undefined {
  return argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];
}

function parseOptions(argv: string[]) {
  const workers = Number(option(argv, "workers") ?? 2);
  if (!Number.isInteger(workers) || workers < 1 || workers > 8) {
    throw new Error("--workers must be between 1 and 8");
  }
  const promptVersion =
    option(argv, "prompt-version") ?? "toeic-writing-image-context-v1";
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(promptVersion)) {
    throw new Error("--prompt-version is invalid");
  }
  const known = new Set(["--", "--dry-run", "--verbose"]);
  const unknown = argv.find(
    (value) =>
      !known.has(value) &&
      !value.startsWith("--workers=") &&
      !value.startsWith("--prompt-version=")
  );
  if (unknown) throw new Error(`Unknown enrichment option: ${unknown}`);
  return {
    workers,
    promptVersion,
    dryRun: argv.includes("--dry-run"),
    verbose: argv.includes("--verbose"),
  };
}

async function discoverTasks(writingRoot: string) {
  const bySourceId = new Map<string, ToeicWritingCanonicalTask>();
  for (const sourceEntry of await readdir(writingRoot, {
    withFileTypes: true,
  })) {
    if (!sourceEntry.isDirectory() || sourceEntry.name === "inventories")
      continue;
    const sourceRoot = join(writingRoot, sourceEntry.name);
    for (const versionEntry of await readdir(sourceRoot, {
      withFileTypes: true,
    })) {
      if (!versionEntry.isDirectory()) continue;
      try {
        const task = JSON.parse(
          await readFile(
            join(sourceRoot, versionEntry.name, "content.json"),
            "utf8"
          )
        ) as ToeicWritingCanonicalTask;
        const existing = bySourceId.get(task.sourceTaskId);
        if (!existing || task.retrievedAt > existing.retrievedAt) {
          bySourceId.set(task.sourceTaskId, task);
        }
      } catch {
        // Incomplete packages are ignored and remain visible in the source validator.
      }
    }
  }
  return [...bySourceId.values()]
    .filter(
      (task): task is Extract<ToeicWritingCanonicalTask, { part: 1 }> =>
        task.part === 1
    )
    .sort((a, b) => a.order - b.order)
    .map((task) => ({
      source: task.source,
      sourceTaskId: task.sourceTaskId,
      sourceVersion: task.sourceVersion,
      contentVersion: task.sourceVersion,
      imageSha256: task.media.sha256,
      imagePath: resolve(writingRoot, task.media.storageKey),
      mimeType: task.media.mimeType,
      requiredWords: task.payload.requiredWords.map(({ en }) => en),
    }));
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const repositoryRoot = resolve(__dirname, "../../../..");
  const licensedRoot = resolveLicensedContentRoot(
    process.env.LICENSED_CONTENT_ROOT,
    join(repositoryRoot, "apps/api")
  );
  const tasks = await discoverTasks(join(licensedRoot, "writing"));
  const storage = createToeicWritingAiStorage(join(licensedRoot, "writing-ai"));
  const configuration = resolveGeminiConfiguration(process.env);
  if (!options.dryRun && (!configuration.enabled || !configuration.apiKey)) {
    throw new Error("Gemini must be explicitly enabled for image enrichment");
  }
  const provider = options.dryRun
    ? { enrichPicture: () => Promise.reject(new Error("dry-run")) }
    : new GeminiWritingProvider(
        createGeminiWritingClient(configuration.apiKey, configuration.apiEndpoint),
        configuration
      );
  const summary = await enrichPartOneCandidates({
    tasks,
    storage,
    provider,
    model: configuration.visionModel,
    promptVersion: options.promptVersion,
    workers: options.workers,
    dryRun: options.dryRun,
    verbose: options.verbose,
    onProgress: console.log,
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.rejected.length || summary.failed.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Enrichment failed",
      })
    );
    process.exitCode = 1;
  });
}
