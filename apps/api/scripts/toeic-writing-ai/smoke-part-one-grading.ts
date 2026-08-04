import { join, resolve } from "node:path";

import type { ToeicWritingLocale } from "@repo/shared";

import { resolveLicensedContentRoot } from "../../src/config/application.config";
import { resolveGeminiConfiguration } from "../../src/config/gemini.config";
import { PrismaService } from "../../src/database/prisma/prisma.service";
import {
  createGeminiWritingClient,
  GeminiWritingProvider,
} from "../../src/module/toeic-writing/provider/gemini-writing.provider";
import { writingPartOneProviderResultSchema } from "../../src/module/toeic-writing/provider/writing-ai.schemas";
import type { WritingAiProvider } from "../../src/module/toeic-writing/provider/writing-ai-provider";
import { PrismaWritingAiRepository } from "../../src/module/toeic-writing/repository/prisma-writing-ai.repository";
import { PrismaWritingPartOneTaskSource } from "../../src/module/toeic-writing/repository/prisma-writing-task.repository";
import { OwnedWritingPictureResolver } from "../../src/module/toeic-writing/services/writing-picture-resolver";
import type {
  ResolvedWritingPicture,
  WritingPartOneTask,
} from "../../src/module/toeic-writing/use-cases/grade-toeic-writing-part-one.use-case";

type GradeInput = Parameters<WritingAiProvider["gradePartOne"]>[0];

export type PartOneGradingSmokeDependencies = {
  providerEnabled: boolean;
  loadTask(taskId: number): Promise<WritingPartOneTask>;
  resolvePicture(task: WritingPartOneTask): Promise<ResolvedWritingPicture>;
  grade(input: GradeInput): Promise<unknown>;
  log(value: unknown): void;
};

export type PartOneGradingSmokeSummary = {
  taskId: number;
  contextSource: ResolvedWritingPicture["source"];
  providerCalled: boolean;
  schemaValid: boolean;
  score?: number;
};

function parseOptions(argv: string[]) {
  const taskIdValue = argv
    .find((value) => value.startsWith("--task-id="))
    ?.slice("--task-id=".length);
  const taskId = Number(taskIdValue);
  if (!taskIdValue || !Number.isSafeInteger(taskId) || taskId < 1) {
    throw new Error("--task-id must be a positive integer");
  }

  const localeValue = argv
    .find((value) => value.startsWith("--locale="))
    ?.slice("--locale=".length);
  if (localeValue !== undefined && localeValue !== "en" && localeValue !== "vi") {
    throw new Error("--locale must be en or vi");
  }
  const known = new Set(["--", "--call-provider"]);
  const unknown = argv.find(
    (value) =>
      !known.has(value) &&
      !value.startsWith("--task-id=") &&
      !value.startsWith("--locale=")
  );
  if (unknown) throw new Error(`Unknown smoke option: ${unknown}`);

  const locale: ToeicWritingLocale = localeValue ?? "vi";
  return {
    taskId,
    locale,
    callProvider: argv.includes("--call-provider"),
  };
}

function smokeResponse(requiredWords: string[]): string {
  const [first = "person", second = "object"] = requiredWords;
  return `The picture shows ${first} and ${second}.`;
}

export async function runPartOneGradingSmoke(
  argv: string[],
  dependencies: PartOneGradingSmokeDependencies
): Promise<PartOneGradingSmokeSummary> {
  const options = parseOptions(argv);
  const task = await dependencies.loadTask(options.taskId);
  const picture = await dependencies.resolvePicture(task);

  if (!options.callProvider) {
    const summary: PartOneGradingSmokeSummary = {
      taskId: task.id,
      contextSource: picture.source,
      providerCalled: false,
      schemaValid: false,
    };
    dependencies.log(summary);
    return summary;
  }
  if (!dependencies.providerEnabled) {
    throw new Error("Gemini must be explicitly enabled for provider smoke");
  }

  let result;
  try {
    result = writingPartOneProviderResultSchema.parse(
      await dependencies.grade({
        locale: options.locale,
        responseText: smokeResponse(task.requiredWords),
        requiredWords: task.requiredWords,
        picture,
      })
    );
  } catch (error) {
    dependencies.log({
      providerError: {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw new Error("Writing AI returned an invalid structured result");
  }

  const summary: PartOneGradingSmokeSummary = {
    taskId: task.id,
    contextSource: picture.source,
    providerCalled: true,
    schemaValid: true,
    score: result.score,
  };
  dependencies.log(summary);
  return summary;
}

async function main() {
  const configuration = resolveGeminiConfiguration(process.env);
  const prisma = new PrismaService();
  const tasks = new PrismaWritingPartOneTaskSource(prisma);
  const repository = new PrismaWritingAiRepository(prisma);
  const repositoryRoot = resolve(__dirname, "../../../..");
  const licensedRoot = resolveLicensedContentRoot(
    process.env.LICENSED_CONTENT_ROOT,
    join(repositoryRoot, "apps/api")
  );
  const pictures = new OwnedWritingPictureResolver(
    repository,
    join(licensedRoot, "writing")
  );
  const provider = new GeminiWritingProvider(
    createGeminiWritingClient(configuration.apiKey, configuration.apiEndpoint),
    configuration
  );

  try {
    await runPartOneGradingSmoke(process.argv.slice(2), {
      providerEnabled: configuration.enabled && configuration.apiKey.length > 0,
      loadTask: (taskId) => tasks.getPublishedPartOne(taskId),
      resolvePicture: (task) => pictures.resolve(task),
      grade: (input) => provider.gradePartOne(input),
      log: (value) => console.log(JSON.stringify(value, null, 2)),
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    const category = message.includes("task-id")
      ? "INVALID_ARGUMENT"
      : message.includes("explicitly enabled")
        ? "PROVIDER_DISABLED"
        : message.includes("invalid structured")
          ? "INVALID_STRUCTURED_RESULT"
          : "SMOKE_FAILED";
    console.error(
      JSON.stringify({
        error: category,
        cause: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
    process.exitCode = 1;
  });
}
