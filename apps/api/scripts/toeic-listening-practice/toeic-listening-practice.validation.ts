import { validateToeicListeningPracticeTest } from "./toeic-listening-practice.canonical.js";
import {
  selectLatestToeicListeningPackages,
  type ToeicListeningPackageIdentity,
} from "./toeic-listening-practice.packages.js";
import type {
  ToeicListeningPracticeTest,
  ToeicListeningStorage,
} from "./toeic-listening-practice.types.js";

export type ToeicListeningPackageValidationSummary = {
  physicalPackageCount: number;
  selectedPackageCount: number;
  supersededCount: number;
  validCount: number;
  superseded: ToeicListeningPackageIdentity[];
  invalid: Array<
    ToeicListeningPackageIdentity & {
      errors: string[];
    }
  >;
};

export async function validateToeicListeningPackages(
  storage: ToeicListeningStorage
): Promise<ToeicListeningPackageValidationSummary> {
  const selection = await selectLatestToeicListeningPackages(storage);
  const invalid: ToeicListeningPackageValidationSummary["invalid"] = [];

  for (const item of selection.selected) {
    const content = (await storage.readPackageFile(
      item.sourceTestId,
      item.sourceVersion,
      "content.json"
    )) as ToeicListeningPracticeTest;
    const validation = validateToeicListeningPracticeTest(content);
    if (!validation.valid) invalid.push({ ...item, errors: validation.errors });
  }

  return {
    physicalPackageCount: selection.physicalPackageCount,
    selectedPackageCount: selection.selected.length,
    supersededCount: selection.superseded.length,
    validCount: selection.selected.length - invalid.length,
    superseded: selection.superseded,
    invalid,
  };
}
