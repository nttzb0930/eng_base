import type { ToeicWritingLocale } from "@repo/shared";

import { resolveGeminiConfiguration } from "../../src/config/gemini.config";
import { PrismaService } from "../../src/database/prisma/prisma.service";
import { validatePartTwoProviderResult } from "../../src/module/toeic-writing/grading/part-two-provider-result.validator";
import {
  createGeminiWritingClient,
  GeminiWritingProvider,
} from "../../src/module/toeic-writing/provider/gemini-writing.provider";
import { buildPartTwoGradingPrompt } from "../../src/module/toeic-writing/provider/part-two-grading.prompt";
import { writingPartTwoProviderResultSchema } from "../../src/module/toeic-writing/provider/writing-ai.schemas";
import type {
  WritingAiProvider,
  WritingPartTwoProviderResult,
} from "../../src/module/toeic-writing/provider/writing-ai-provider";
import { PrismaWritingPartTwoTaskSource } from "../../src/module/toeic-writing/repository/prisma-writing-task.repository";
import {
  evidenceFor,
  partTwoRubricCases,
} from "../../src/module/toeic-writing/tests/fixtures/part-two-rubric-cases";
import type { WritingPartTwoTask } from "../../src/module/toeic-writing/use-cases/grade-toeic-writing-part-two.use-case";

type GradeInput = Parameters<WritingAiProvider["gradePartTwo"]>[0];

export type PartTwoGradingSmokeDependencies = {
  providerEnabled: boolean;
  model: string;
  loadTask(taskId: number): Promise<WritingPartTwoTask>;
  grade(input: GradeInput): Promise<unknown>;
  now(): number;
  log(value: unknown): void;
};

export type PartTwoGradingSmokeSummary = {
  taskId: number;
  model: string;
  providerCalled: boolean;
  latencyMs: number;
  schemaValid: boolean;
  score: number;
  quotaCharged: false;
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
  if (
    localeValue !== undefined &&
    localeValue !== "en" &&
    localeValue !== "vi"
  ) {
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
  return {
    taskId,
    locale: (localeValue ?? "vi") as ToeicWritingLocale,
    callProvider: argv.includes("--call-provider"),
  };
}

function smokeResponse(): string {
  return partTwoRubricCases[4]!.responseText;
}

function providerInput(
  task: WritingPartTwoTask,
  locale: ToeicWritingLocale
): GradeInput {
  return {
    locale,
    sourceEmail: task.sourceEmail,
    requirements: task.requirements,
    responseText: smokeResponse(),
    assistance: {
      outlineViewed: false,
      vocabularyViewed: false,
      sampleViewed: false,
      communityAnswerRestored: false,
    },
  };
}

function validateResult(
  value: unknown,
  task: WritingPartTwoTask,
  responseText: string
): WritingPartTwoProviderResult {
  const parsed = writingPartTwoProviderResultSchema.parse(value);
  return validatePartTwoProviderResult(parsed, {
    responseText,
    requirementIds: task.requirements.map(({ id }) => id),
  });
}

export async function runPartTwoGradingSmoke(
  argv: string[],
  dependencies: PartTwoGradingSmokeDependencies
): Promise<PartTwoGradingSmokeSummary> {
  const options = parseOptions(argv);
  const task = await dependencies.loadTask(options.taskId);
  const input = providerInput(task, options.locale);
  buildPartTwoGradingPrompt(input);

  const startedAt = dependencies.now();
  let result: WritingPartTwoProviderResult;
  if (options.callProvider) {
    if (!dependencies.providerEnabled) {
      throw new Error("Gemini must be explicitly enabled for provider smoke");
    }
    result = validateResult(
      await dependencies.grade(input),
      task,
      input.responseText
    );
  } else {
    const fixture = partTwoRubricCases[4]!.providerResult;
    const learnerEvidence = evidenceFor(
      input.responseText,
      "cannot connect to our office network"
    );
    const improvedEvidence = evidenceFor(
      fixture.improvedEmail.text,
      "cannot connect to our network"
    );
    result = validateResult(
      {
        ...fixture,
        taskCompletion: {
          ...fixture.taskCompletion,
          requirements: task.requirements.map((requirement) => ({
            requirementId: requirement.id,
            status: "MET" as const,
            comment: "Dry-run fixture requirement.",
            evidence: [learnerEvidence],
            suggestedFix: null,
          })),
          completedCount: task.requirements.length,
          totalCount: task.requirements.length,
        },
        improvedEmail: {
          ...fixture.improvedEmail,
          requirementCoverage: task.requirements.map((requirement) => ({
            requirementId: requirement.id,
            evidence: [improvedEvidence],
          })),
        },
      },
      task,
      input.responseText
    );
  }

  const summary: PartTwoGradingSmokeSummary = {
    taskId: task.id,
    model: dependencies.model,
    providerCalled: options.callProvider,
    latencyMs: Math.max(0, dependencies.now() - startedAt),
    schemaValid: true,
    score: result.score,
    quotaCharged: false,
  };
  dependencies.log(summary);
  return summary;
}

async function main() {
  const configuration = resolveGeminiConfiguration(process.env);
  const prisma = new PrismaService();
  const tasks = new PrismaWritingPartTwoTaskSource(prisma);
  try {
    await runPartTwoGradingSmoke(process.argv.slice(2), {
      providerEnabled: configuration.enabled && configuration.apiKey.length > 0,
      model: configuration.gradingModel,
      loadTask: (taskId) => tasks.getPublishedPartTwo(taskId),
      grade: (input) => {
        const provider = new GeminiWritingProvider(
          createGeminiWritingClient(configuration.apiKey),
          configuration
        );
        return provider.gradePartTwo(input);
      },
      now: () => Date.now(),
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
        : message.includes("structured")
          ? "INVALID_STRUCTURED_RESULT"
          : "SMOKE_FAILED";
    console.error(JSON.stringify({ error: category }));
    process.exitCode = 1;
  });
}
