import { validateToeicReadingPracticeTest } from "./toeic-reading-practice.canonical.js";
import type {
  ToeicPracticeStat,
  ToeicReadingImportResult,
  ToeicReadingImportSummary,
  ToeicReadingPracticeTest,
  ToeicReadingStorage,
} from "./toeic-reading-practice.types.js";

export interface ToeicReadingImportStore {
  requireCourseId(courseCode: "toeic-600"): Promise<number>;
  importOne(input: {
    courseId: number;
    content: ToeicReadingPracticeTest;
    practiceStats: ToeicPracticeStat[];
  }): Promise<ToeicReadingImportResult>;
}

type ValidationFile = {
  valid?: unknown;
  errors?: unknown;
};

type ManifestFile = {
  source?: unknown;
  sourceSetId?: unknown;
  sourceTestId?: unknown;
  sourceVersion?: unknown;
};

type PracticeStatsFile = {
  items?: unknown;
};

function validationErrors(value: ValidationFile) {
  if (value.valid === true) return [];
  if (Array.isArray(value.errors)) {
    return value.errors.filter(
      (error): error is string => typeof error === "string"
    );
  }
  return ["Package validation is not valid"];
}

function parsePracticeStats(value: PracticeStatsFile): ToeicPracticeStat[] {
  if (!Array.isArray(value.items)) {
    throw new Error("Practice stats items must be an array");
  }
  return value.items as ToeicPracticeStat[];
}

function manifestErrors(input: {
  item: { sourceTestId: string; sourceVersion: string };
  content: ToeicReadingPracticeTest;
  manifest: ManifestFile;
}) {
  const errors: string[] = [];
  if (
    input.content.sourceTestId !== input.item.sourceTestId ||
    input.content.sourceVersion !== input.item.sourceVersion
  ) {
    errors.push("Package directory identity does not match content");
  }
  if (
    input.manifest.source !== input.content.source ||
    input.manifest.sourceSetId !== input.content.sourceSetId ||
    input.manifest.sourceTestId !== input.content.sourceTestId ||
    input.manifest.sourceVersion !== input.content.sourceVersion
  ) {
    errors.push("Package manifest identity does not match content");
  }
  return errors;
}

export async function importToeicReadingPractice(input: {
  storage: ToeicReadingStorage;
  store: ToeicReadingImportStore;
}): Promise<ToeicReadingImportSummary> {
  const courseId = await input.store.requireCourseId("toeic-600");
  const summary: ToeicReadingImportSummary = {
    created: [],
    updated: [],
    skipped: [],
    rejected: [],
    failed: [],
  };

  for (const item of await input.storage.listCompletePackages()) {
    let content: ToeicReadingPracticeTest;
    let practiceStats: ToeicPracticeStat[];
    try {
      const validation = (await input.storage.readPackageFile(
        item.sourceTestId,
        item.sourceVersion,
        "validation.json"
      )) as ValidationFile;
      const persistedErrors = validationErrors(validation);
      if (persistedErrors.length > 0) {
        summary.rejected.push({
          sourceTestId: item.sourceTestId,
          errors: persistedErrors,
        });
        continue;
      }

      content = (await input.storage.readPackageFile(
        item.sourceTestId,
        item.sourceVersion,
        "content.json"
      )) as ToeicReadingPracticeTest;
      const canonicalValidation = validateToeicReadingPracticeTest(content);
      if (!canonicalValidation.valid) {
        summary.rejected.push({
          sourceTestId: item.sourceTestId,
          errors: canonicalValidation.errors,
        });
        continue;
      }

      const manifest = (await input.storage.readPackageFile(
        item.sourceTestId,
        item.sourceVersion,
        "manifest.json"
      )) as ManifestFile;
      const identityErrors = manifestErrors({ item, content, manifest });
      if (identityErrors.length > 0) {
        summary.rejected.push({
          sourceTestId: item.sourceTestId,
          errors: identityErrors,
        });
        continue;
      }

      practiceStats = parsePracticeStats(
        (await input.storage.readPackageFile(
          item.sourceTestId,
          item.sourceVersion,
          "practice-stats.json"
        )) as PracticeStatsFile
      );
    } catch (error) {
      summary.rejected.push({
        sourceTestId: item.sourceTestId,
        errors: [
          error instanceof Error ? error.message : "Package could not be read",
        ],
      });
      continue;
    }

    try {
      const result = await input.store.importOne({
        courseId,
        content,
        practiceStats,
      });
      const target =
        result === "CREATED"
          ? summary.created
          : result === "UPDATED"
            ? summary.updated
            : summary.skipped;
      target.push(item.sourceTestId);
    } catch (error) {
      summary.failed.push({
        sourceTestId: item.sourceTestId,
        category: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  summary.created.sort();
  summary.updated.sort();
  summary.skipped.sort();
  summary.rejected.sort((left, right) =>
    left.sourceTestId.localeCompare(right.sourceTestId)
  );
  summary.failed.sort((left, right) =>
    left.sourceTestId.localeCompare(right.sourceTestId)
  );
  return summary;
}
