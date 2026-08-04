import {
  copyFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import type { PrismaClient } from "@prisma/client";

import { resolveDatabaseUrl } from "../../../src/config/database-url.js";
import {
  assertVocabularySourcesValid,
  vocabularyIdentity,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";
import {
  applyVocabularyAudioImports,
  buildVocabularyAudioReconciliationPlan,
  type VocabularyAudioDatabaseRow,
  type VocabularyAudioReconciliationPlan,
  type VocabularyAudioReconciliationSummary,
} from "./vocabulary-audio-reconciliation.js";

export type VocabularyAudioReconciliationArguments = {
  mode: "plan" | "apply";
  confirmation?: string;
  dataDirectory?: string;
};

export type VocabularyAudioReconciliationRuntime = {
  databaseTarget: string;
  loadSources(dataDirectory: string): Promise<{
    catalog: VocabularyCatalogItem[];
    topics: VocabularyTopicDefinition[];
  }>;
  loadDatabaseRows(): Promise<VocabularyAudioDatabaseRow[]>;
  writeReport(plan: VocabularyAudioReconciliationPlan): Promise<string>;
  writeCatalog(input: {
    dataDirectory: string;
    catalog: VocabularyCatalogItem[];
    merged: VocabularyCatalogItem[];
    topics: VocabularyTopicDefinition[];
  }): Promise<{ backupPath: string }>;
  print(value: unknown): void;
};

export type VocabularyAudioReconciliationCommandResult = {
  action:
    | "vocabulary-audio-reconciliation-plan"
    | "vocabulary-audio-reconciliation-apply";
  committed: boolean;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  confirmation: string;
  blocked: boolean;
  summary: VocabularyAudioReconciliationSummary;
  reportPath: string;
  backupPath?: string;
};

export function parseVocabularyAudioReconciliationArguments(
  values: string[]
): VocabularyAudioReconciliationArguments {
  const arguments_ = values.filter((value) => value !== "--");
  const modes = arguments_.filter((value) =>
    ["plan", "apply"].includes(value)
  );
  if (modes.length !== 1) {
    throw new Error(
      "Vocabulary audio reconciliation mode must be exactly one of: plan, apply"
    );
  }

  const mode = modes[0] as VocabularyAudioReconciliationArguments["mode"];
  const confirmationIndex = arguments_.indexOf("--confirm");
  const dataDirectoryIndex = arguments_.indexOf("--data-dir");
  const confirmation =
    confirmationIndex >= 0 ? arguments_[confirmationIndex + 1] : undefined;
  const dataDirectory =
    dataDirectoryIndex >= 0 ? arguments_[dataDirectoryIndex + 1] : undefined;

  if (confirmationIndex >= 0 && !confirmation) {
    throw new Error("--confirm requires a value");
  }
  if (dataDirectoryIndex >= 0 && !dataDirectory) {
    throw new Error("--data-dir requires a path");
  }

  const recognized = new Set([
    mode,
    "--confirm",
    confirmation,
    "--data-dir",
    dataDirectory,
  ]);
  const unknown = arguments_.filter((value) => !recognized.has(value));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown Vocabulary audio reconciliation argument: ${unknown[0]}`
    );
  }

  return {
    mode,
    ...(confirmation ? { confirmation } : {}),
    ...(dataDirectory ? { dataDirectory } : {}),
  };
}

export function sanitizeAudioReconciliationDatabaseTarget(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const port = parsed.port || "5432";
  const database = decodeURIComponent(parsed.pathname.replace(/^\//u, ""));
  const schema = parsed.searchParams.get("schema") || "public";
  return `${parsed.hostname}:${port}/${database}?schema=${schema}`;
}

const commandResult = (
  plan: VocabularyAudioReconciliationPlan,
  reportPath: string,
  committed: boolean,
  backupPath?: string
): VocabularyAudioReconciliationCommandResult => ({
  action: committed
    ? "vocabulary-audio-reconciliation-apply"
    : "vocabulary-audio-reconciliation-plan",
  committed,
  databaseTarget: plan.databaseTarget,
  sourceSha256: plan.sourceSha256,
  liveSha256: plan.liveSha256,
  planSha256: plan.planSha256,
  confirmation: plan.confirmation,
  blocked: plan.blocked,
  summary: plan.summary,
  reportPath,
  ...(backupPath ? { backupPath } : {}),
});

export async function runVocabularyAudioReconciliation(
  runtime: VocabularyAudioReconciliationRuntime,
  arguments_: VocabularyAudioReconciliationArguments
): Promise<VocabularyAudioReconciliationCommandResult> {
  const dataDirectory =
    arguments_.dataDirectory ??
    path.resolve(process.cwd(), "../../data/vocabulary");
  const { catalog, topics } = await runtime.loadSources(dataDirectory);
  assertVocabularySourcesValid(topics, catalog);
  const databaseRows = await runtime.loadDatabaseRows();
  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget: runtime.databaseTarget,
  });
  const reportPath = await runtime.writeReport(plan);

  if (arguments_.mode === "plan") {
    const result = commandResult(plan, reportPath, false);
    runtime.print(result);
    return result;
  }

  if (plan.blocked) {
    throw new Error(
      "Vocabulary audio reconciliation apply is blocked by plan issues"
    );
  }
  if (arguments_.confirmation !== plan.confirmation) {
    throw new Error(
      `Apply confirmation does not match the current plan; required: ${plan.confirmation}`
    );
  }

  const merged = applyVocabularyAudioImports(catalog, plan);
  assertVocabularySourcesValid(topics, merged);
  const { backupPath } = await runtime.writeCatalog({
    dataDirectory,
    catalog,
    merged,
    topics,
  });
  const result = commandResult(plan, reportPath, true, backupPath);
  runtime.print(result);
  return result;
}

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

export async function writeReconciledVocabularyCatalog(input: {
  dataDirectory: string;
  catalog: VocabularyCatalogItem[];
  merged: VocabularyCatalogItem[];
  topics: VocabularyTopicDefinition[];
  now?: Date;
}): Promise<{ backupPath: string }> {
  const { dataDirectory, catalog, merged, topics } = input;
  assertVocabularySourcesValid(topics, merged);
  const sourceIdentities = catalog.map(vocabularyIdentity);
  const mergedIdentities = merged.map(vocabularyIdentity);
  if (
    catalog.length !== merged.length ||
    !isDeepStrictEqual(sourceIdentities, mergedIdentities)
  ) {
    throw new Error(
      "Reconciled Vocabulary catalog identity sequence does not match source"
    );
  }

  const catalogPath = path.join(dataDirectory, "vocabulary-catalog.json");
  const currentCatalog = await readJson<VocabularyCatalogItem[]>(catalogPath);
  if (!isDeepStrictEqual(currentCatalog, catalog)) {
    throw new Error("Vocabulary catalog drifted before atomic write");
  }

  const backupDirectory = path.join(dataDirectory, "backups");
  await mkdir(backupDirectory, { recursive: true });
  const timestamp = (input.now ?? new Date())
    .toISOString()
    .replaceAll(/[:.]/gu, "-");
  const backupPath = path.join(
    backupDirectory,
    `vocabulary-catalog.before-audio-reconciliation.${timestamp}.json`
  );
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  await copyFile(catalogPath, backupPath);
  await writeFile(
    temporaryPath,
    `${JSON.stringify(merged, null, 2)}\n`,
    "utf8"
  );
  await rename(temporaryPath, catalogPath);
  return { backupPath };
}

const loadSources = async (dataDirectory: string) =>
  Promise.all([
    readJson<VocabularyCatalogItem[]>(
      path.join(dataDirectory, "vocabulary-catalog.json")
    ),
    readJson<VocabularyTopicDefinition[]>(path.join(dataDirectory, "topics.json")),
  ]).then(([catalog, topics]) => ({ catalog, topics }));

const writePlanReport = async (
  dataDirectory: string,
  plan: VocabularyAudioReconciliationPlan
) => {
  const reportDirectory = path.join(
    dataDirectory,
    "working/dictionary-enrichment"
  );
  const reportPath = path.join(
    reportDirectory,
    "audio-reconciliation-plan.json"
  );
  const temporaryPath = `${reportPath}.${process.pid}.tmp`;
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  await rename(temporaryPath, reportPath);
  return reportPath;
};

const unwrapPrismaClient = (moduleValue: unknown): PrismaClient => {
  let candidate = (moduleValue as { default?: unknown }).default ?? moduleValue;
  if (candidate && typeof candidate === "object" && "default" in candidate) {
    candidate = (candidate as { default: unknown }).default;
  }
  return candidate as PrismaClient;
};

async function main() {
  const clientModule = await import("../../support/script-prisma.js");
  const prisma = unwrapPrismaClient(clientModule);
  const arguments_ = parseVocabularyAudioReconciliationArguments(
    process.argv.slice(2)
  );
  const dataDirectory =
    arguments_.dataDirectory ??
    path.resolve(process.cwd(), "../../data/vocabulary");
  const databaseTarget = sanitizeAudioReconciliationDatabaseTarget(
    resolveDatabaseUrl(process.env)
  );
  const runtime: VocabularyAudioReconciliationRuntime = {
    databaseTarget,
    loadSources,
    async loadDatabaseRows() {
      const rows = await prisma.vocabulary_items.findMany({
        select: {
          id: true,
          normalized_word: true,
          pos: true,
          cefr_level: true,
          audio_url: true,
          audio_source: true,
        },
        orderBy: { id: "asc" },
      });
      return rows.map((row) => ({
        id: row.id,
        normalizedWord: row.normalized_word,
        pos: row.pos,
        cefrLevel: row.cefr_level,
        audioUrl: row.audio_url,
        audioSource: row.audio_source,
      }));
    },
    writeReport: (plan) => writePlanReport(dataDirectory, plan),
    writeCatalog: (writeInput) =>
      writeReconciledVocabularyCatalog(writeInput),
    print(value) {
      console.log(JSON.stringify(value, null, 2));
    },
  };

  try {
    await runVocabularyAudioReconciliation(runtime, {
      ...arguments_,
      dataDirectory,
    });
  } finally {
    await prisma.$disconnect();
  }
}

const entrypoint = path.basename(process.argv[1] ?? "");
if (/^reconcile-vocabulary-audio\.(?:ts|js)$/u.test(entrypoint)) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
