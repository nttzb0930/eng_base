import path from "node:path";

import type { Prisma, PrismaClient } from "@prisma/client";

import { resolveDatabaseUrl } from "../../../src/config/database-url.js";
import {
  loadVocabularySeedData,
  type VocabularySeedData,
} from "./vocabulary-seed-data.js";
import {
  buildVocabularyBootstrapPlan,
  type VocabularyBootstrapLiveState,
  type VocabularyBootstrapPlan,
  type VocabularyBootstrapSummary,
} from "./vocabulary-bootstrap-plan.js";
import {
  executePrismaVocabularyBootstrap,
  loadVocabularyBootstrapState,
  type VocabularyBootstrapExecutionReport,
} from "./vocabulary-bootstrap-store.js";

export type VocabularyBootstrapArguments = {
  mode: "plan" | "dry-run" | "apply";
  confirmation?: string;
  dataDirectory?: string;
};

export type VocabularyBootstrapCommandResult = {
  action:
    | "vocabulary-bootstrap-plan"
    | "vocabulary-bootstrap-dry-run"
    | "vocabulary-bootstrap-apply";
  committed: boolean;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  confirmation: string;
  summary: VocabularyBootstrapSummary;
};

export type VocabularyBootstrapRuntime = {
  loadSource(dataDirectory: string): Promise<VocabularySeedData>;
  loadLiveState(): Promise<VocabularyBootstrapLiveState>;
  execute(
    plan: VocabularyBootstrapPlan,
    mode: "dry-run" | "apply"
  ): Promise<VocabularyBootstrapExecutionReport>;
  print(value: unknown): void;
};

export function parseBootstrapArguments(
  values: string[]
): VocabularyBootstrapArguments {
  const arguments_ = values.filter((value) => value !== "--");
  const modes = arguments_.filter((value) =>
    ["plan", "dry-run", "apply"].includes(value)
  );
  if (modes.length !== 1) {
    throw new Error(
      "Vocabulary bootstrap mode must be exactly one of: plan, dry-run, apply"
    );
  }
  const mode = modes[0] as VocabularyBootstrapArguments["mode"];
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
    throw new Error(`Unknown Vocabulary bootstrap argument: ${unknown[0]}`);
  }
  return {
    mode,
    ...(confirmation ? { confirmation } : {}),
    ...(dataDirectory ? { dataDirectory } : {}),
  };
}

export function sanitizeDatabaseTarget(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const port = parsed.port || "5432";
  const database = decodeURIComponent(parsed.pathname.replace(/^\//u, ""));
  const schema = parsed.searchParams.get("schema") || "public";
  return `${parsed.hostname}:${port}/${database}?schema=${schema}`;
}

const commandResult = (
  plan: VocabularyBootstrapPlan,
  action: VocabularyBootstrapCommandResult["action"],
  committed: boolean
): VocabularyBootstrapCommandResult => ({
  action,
  committed,
  databaseTarget: plan.databaseTarget,
  sourceSha256: plan.sourceSha256,
  liveSha256: plan.liveSha256,
  planSha256: plan.planSha256,
  confirmation: plan.confirmation,
  summary: plan.summary,
});

export async function runVocabularyBootstrap(
  runtime: VocabularyBootstrapRuntime,
  arguments_: VocabularyBootstrapArguments
): Promise<VocabularyBootstrapCommandResult> {
  const dataDirectory =
    arguments_.dataDirectory ??
    path.resolve(process.cwd(), "../../data/vocabulary");
  const source = await runtime.loadSource(dataDirectory);
  const live = await runtime.loadLiveState();
  const plan = buildVocabularyBootstrapPlan(source, live);

  if (arguments_.mode === "plan") {
    const result = commandResult(plan, "vocabulary-bootstrap-plan", false);
    runtime.print(result);
    return result;
  }

  if (
    arguments_.mode === "apply" &&
    arguments_.confirmation !== plan.confirmation
  ) {
    throw new Error(
      `Apply confirmation does not match the current plan; required: ${plan.confirmation}`
    );
  }

  const report = await runtime.execute(plan, arguments_.mode);
  const result = commandResult(
    plan,
    arguments_.mode === "dry-run"
      ? "vocabulary-bootstrap-dry-run"
      : "vocabulary-bootstrap-apply",
    report.committed
  );
  runtime.print(result);
  return result;
}

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
  const databaseTarget = sanitizeDatabaseTarget(
    resolveDatabaseUrl(process.env)
  );
  const runtime: VocabularyBootstrapRuntime = {
    loadSource: loadVocabularySeedData,
    loadLiveState: () =>
      loadVocabularyBootstrapState(
        prisma as unknown as Prisma.TransactionClient,
        databaseTarget
      ),
    execute: (plan, mode) =>
      executePrismaVocabularyBootstrap(prisma, plan, mode),
    print(value) {
      console.log(JSON.stringify(value, null, 2));
    },
  };

  try {
    await runVocabularyBootstrap(
      runtime,
      parseBootstrapArguments(process.argv.slice(2))
    );
  } finally {
    await prisma.$disconnect();
  }
}

const entrypoint = path.basename(process.argv[1] ?? "");
if (/^bootstrap-vocabulary\.(?:ts|js)$/u.test(entrypoint)) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
