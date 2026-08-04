import type { ToeicWritingCanonicalTask } from "./toeic-writing.types.js";
import { validateToeicWritingTask } from "./toeic-writing.validation.js";

export type ToeicWritingImportStore = {
  importOne(task: ToeicWritingCanonicalTask): Promise<"UPDATED" | "SKIPPED">;
};

export type ToeicWritingImportFailure = {
  sourceTaskId: string;
  category: string;
};

export type ToeicWritingImportSummary = {
  updated: string[];
  skipped: string[];
  rejected: Array<{ sourceTaskId: string; errors: string[] }>;
  failed: ToeicWritingImportFailure[];
};

function isNewer(
  candidate: ToeicWritingCanonicalTask,
  current: ToeicWritingCanonicalTask
): boolean {
  return (
    candidate.retrievedAt.localeCompare(current.retrievedAt) > 0 ||
    (candidate.retrievedAt === current.retrievedAt &&
      candidate.sourceVersion.localeCompare(current.sourceVersion) > 0)
  );
}

function classifyImportError(error: unknown): string {
  if (!(error instanceof Error)) return "UnknownError";
  if (/course toeic-600 does not exist/iu.test(error.message)) {
    return "COURSE_NOT_FOUND";
  }
  return error.name || "Error";
}

export async function importToeicWriting(input: {
  packages: ToeicWritingCanonicalTask[];
  store: ToeicWritingImportStore;
}): Promise<ToeicWritingImportSummary> {
  const result: ToeicWritingImportSummary = {
    updated: [],
    skipped: [],
    rejected: [],
    failed: [],
  };
  const latest = new Map<string, ToeicWritingCanonicalTask>();

  for (const task of input.packages) {
    const validation = validateToeicWritingTask(task);
    if (!validation.valid) {
      result.rejected.push({
        sourceTaskId: task.sourceTaskId,
        errors: validation.errors,
      });
      continue;
    }
    const current = latest.get(task.sourceTaskId);
    if (!current || isNewer(task, current)) latest.set(task.sourceTaskId, task);
  }

  for (const task of [...latest.values()].sort((left, right) =>
    left.sourceTaskId.localeCompare(right.sourceTaskId)
  )) {
    try {
      const state = await input.store.importOne(task);
      (state === "UPDATED" ? result.updated : result.skipped).push(
        task.sourceTaskId
      );
    } catch (error) {
      result.failed.push({
        sourceTaskId: task.sourceTaskId,
        category: classifyImportError(error),
      });
    }
  }

  result.updated.sort();
  result.skipped.sort();
  result.rejected.sort((left, right) =>
    left.sourceTaskId.localeCompare(right.sourceTaskId)
  );
  result.failed.sort((left, right) =>
    left.sourceTaskId.localeCompare(right.sourceTaskId)
  );
  return result;
}
