import { validateToeicListeningPracticeTest } from "./toeic-listening-practice.canonical.js";
import { selectLatestToeicListeningPackages } from "./toeic-listening-practice.packages.js";
import type {
  ToeicListeningImportResult,
  ToeicListeningImportSummary,
  ToeicListeningPracticeTest,
  ToeicListeningStorage,
} from "./toeic-listening-practice.types.js";

export interface ToeicListeningImportStore {
  importOne(
    content: ToeicListeningPracticeTest
  ): Promise<ToeicListeningImportResult>;
}

export async function importToeicListeningPractice(input: {
  storage: ToeicListeningStorage;
  store: ToeicListeningImportStore;
}): Promise<ToeicListeningImportSummary> {
  const summary: ToeicListeningImportSummary = {
    updated: [],
    skipped: [],
    rejected: [],
    failed: [],
  };
  const packageSelection = await selectLatestToeicListeningPackages(
    input.storage
  );
  for (const item of packageSelection.selected) {
    let content: ToeicListeningPracticeTest;
    try {
      content = (await input.storage.readPackageFile(
        item.sourceTestId,
        item.sourceVersion,
        "content.json"
      )) as ToeicListeningPracticeTest;
      const manifest = (await input.storage.readPackageFile(
        item.sourceTestId,
        item.sourceVersion,
        "manifest.json"
      )) as Record<string, unknown>;
      const validation = validateToeicListeningPracticeTest(content);
      const errors = [...validation.errors];
      if (
        content.sourceTestId !== item.sourceTestId ||
        content.listeningSourceVersion !== item.sourceVersion
      ) {
        errors.push("Package directory identity does not match content");
      }
      if (
        manifest.source !== content.source ||
        manifest.sourceTestId !== content.sourceTestId ||
        manifest.listeningSourceVersion !== content.listeningSourceVersion ||
        manifest.validationStatus !== "VALID"
      ) {
        errors.push("Package manifest identity does not match content");
      }
      if (errors.length > 0) {
        summary.rejected.push({ sourceTestId: item.sourceTestId, errors });
        continue;
      }
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
      const result = await input.store.importOne(content);
      (result === "UPDATED" ? summary.updated : summary.skipped).push(
        item.sourceTestId
      );
    } catch (error) {
      summary.failed.push({
        sourceTestId: item.sourceTestId,
        category: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
  summary.updated.sort();
  summary.skipped.sort();
  summary.rejected.sort((a, b) => a.sourceTestId.localeCompare(b.sourceTestId));
  summary.failed.sort((a, b) => a.sourceTestId.localeCompare(b.sourceTestId));
  return summary;
}
