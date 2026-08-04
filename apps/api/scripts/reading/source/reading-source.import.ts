import type { ReadingCandidateImportSummary } from "@repo/shared";

import {
  sha256Text,
  stableJson,
  validateCanonicalReadingPackage,
} from "./reading-source.canonical.js";
import type {
  CanonicalReadingSourcePackage,
  ReadingSourceManifest,
  ReadingSourceStorage,
} from "./reading-source.types.js";

export interface ReadingCandidateImportStore {
  importOne(
    sourcePackage: CanonicalReadingSourcePackage,
    manifest: ReadingSourceManifest,
  ): Promise<"CREATED" | "UNCHANGED" | "IMMUTABLE_SKIPPED">;
}

function category(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN";
  if (/checksum/iu.test(error.message)) return "CHECKSUM";
  if (/manifest|sourceId|sourceVersion/iu.test(error.message)) return "IDENTITY";
  return "VALIDATION";
}

export async function importReadingSourceCandidates(input: {
  storage: ReadingSourceStorage;
  store: ReadingCandidateImportStore;
}): Promise<ReadingCandidateImportSummary> {
  const summary: ReadingCandidateImportSummary = {
    created: [],
    unchanged: [],
    immutableSkipped: [],
    rejected: [],
    failed: [],
  };
  for (const item of await input.storage.listCompletePackages()) {
    try {
      const validation = (await input.storage.readPackageFile(
        item.sourceId,
        item.sourceVersion,
        "validation.json",
      )) as { status?: unknown };
      if (validation.status !== "VALID") {
        summary.rejected.push(item.sourceId);
        continue;
      }
      const sourcePackage = validateCanonicalReadingPackage(
        await input.storage.readPackageFile(
          item.sourceId,
          item.sourceVersion,
          "content.json",
        ),
      );
      const manifest = (await input.storage.readPackageFile(
        item.sourceId,
        item.sourceVersion,
        "manifest.json",
      )) as ReadingSourceManifest;
      if (
        sourcePackage.sourceId !== item.sourceId ||
        sourcePackage.sourceVersion !== item.sourceVersion ||
        manifest.sourceId !== item.sourceId ||
        manifest.sourceVersion !== item.sourceVersion
      ) {
        throw new Error("Reading candidate manifest identity mismatch");
      }
      if (
        manifest.files.content.sha256 !==
          sha256Text(stableJson(sourcePackage)) ||
        manifest.files.validation.sha256 !== sha256Text(stableJson(validation))
      ) {
        throw new Error("Reading candidate package checksum mismatch");
      }
      const result = await input.store.importOne(sourcePackage, manifest);
      const target =
        result === "CREATED"
          ? summary.created
          : result === "UNCHANGED"
            ? summary.unchanged
            : summary.immutableSkipped;
      target.push(item.sourceId);
    } catch (error) {
      summary.failed.push({ sourceId: item.sourceId, category: category(error) });
    }
  }
  summary.created.sort();
  summary.unchanged.sort();
  summary.immutableSkipped.sort();
  summary.rejected.sort();
  summary.failed.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  return summary;
}
