import { validateToeicDictationPackage } from "./toeic-dictation.validation.js";
import type {
  ToeicDictationCanonicalSet,
  ToeicDictationInventory,
} from "./toeic-dictation.types.js";

export type ToeicDictationImportManifestMedia = {
  url: string;
  storagePath: string;
  sha256: string;
  bytes: number;
  contentType: string;
};

export type ToeicDictationImportManifest = {
  schemaVersion: 1;
  source: "dautoeic";
  collectionName: string;
  inventorySha256: string;
  media: ToeicDictationImportManifestMedia[];
};

export type ToeicDictationImportSet = {
  sourceVersion: string;
  set: ToeicDictationCanonicalSet;
  mediaByUrl: Record<string, ToeicDictationImportManifestMedia>;
};

export type ToeicDictationImportStore = {
  importSet(input: ToeicDictationImportSet): Promise<"UPDATED" | "SKIPPED">;
};

export type ToeicDictationImportStorage = {
  readPackageFile(packageVersion: string, name: string): Promise<unknown>;
};

export type ToeicDictationImportSummary = {
  updated: string[];
  skipped: string[];
  rejected: Array<{ sourceSetId: string; errors: string[] }>;
  failed: Array<{ sourceSetId: string; category: string }>;
};

function asManifest(value: unknown): ToeicDictationImportManifest {
  if (!value || typeof value !== "object") {
    throw new Error("Dictation package manifest is not an object");
  }
  const manifest = value as Partial<ToeicDictationImportManifest>;
  if (
    manifest.schemaVersion !== 1 ||
    manifest.source !== "dautoeic" ||
    typeof manifest.collectionName !== "string" ||
    typeof manifest.inventorySha256 !== "string" ||
    !Array.isArray(manifest.media)
  ) {
    throw new Error("Dictation package manifest has an invalid shape");
  }
  return manifest as ToeicDictationImportManifest;
}

function manifestIdentityErrors(
  content: ToeicDictationInventory,
  manifest: ToeicDictationImportManifest,
  approvedSha256: string,
) {
  const errors: string[] = [];
  if (content.inventorySha256 !== approvedSha256) {
    errors.push("content inventory SHA does not match approved SHA");
  }
  if (
    manifest.source !== content.source ||
    manifest.collectionName !== content.collectionName ||
    manifest.inventorySha256 !== approvedSha256
  ) {
    errors.push("package manifest identity does not match content");
  }
  return errors;
}

export async function importToeicDictationPackage(input: {
  approvedSha256: string;
  storage: ToeicDictationImportStorage;
  store: ToeicDictationImportStore;
  expectedSetCount?: number;
}): Promise<ToeicDictationImportSummary> {
  if (!/^[a-f0-9]{64}$/u.test(input.approvedSha256)) {
    throw new Error("approvedSha256 must be an exact SHA-256");
  }

  const summary: ToeicDictationImportSummary = {
    updated: [],
    skipped: [],
    rejected: [],
    failed: [],
  };

  let content: ToeicDictationInventory;
  let manifest: ToeicDictationImportManifest;
  try {
    const [contentValue, manifestValue] = await Promise.all([
      input.storage.readPackageFile(input.approvedSha256, "content.json"),
      input.storage.readPackageFile(input.approvedSha256, "manifest.json"),
    ]);
    content = contentValue as ToeicDictationInventory;
    manifest = asManifest(manifestValue);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Dictation package could not be read",
    );
  }

  const validation = validateToeicDictationPackage(content, {
    expectedSetCount: input.expectedSetCount ?? 40,
  });
  const identityErrors = manifestIdentityErrors(
    content,
    manifest,
    input.approvedSha256,
  );
  const mediaByUrl = Object.fromEntries(
    manifest.media.map((media) => [media.url, media]),
  );
  const packageErrors = [...validation.errors, ...identityErrors];
  if (packageErrors.length > 0) {
    for (const set of content.selectedSets ?? []) {
      summary.rejected.push({
        sourceSetId: set.sourceSetId,
        errors: packageErrors,
      });
    }
    return summary;
  }

  for (const set of content.selectedSets) {
    const missingMedia = set.items
      .filter((item) => !item.audioUrl || !mediaByUrl[item.audioUrl])
      .map((item) => `item ${item.sourceItemId} has no local media manifest`);
    if (missingMedia.length > 0) {
      summary.rejected.push({ sourceSetId: set.sourceSetId, errors: missingMedia });
      continue;
    }
    try {
      const result = await input.store.importSet({
        sourceVersion: input.approvedSha256,
        set,
        mediaByUrl,
      });
      (result === "UPDATED" ? summary.updated : summary.skipped).push(
        set.sourceSetId,
      );
    } catch (error) {
      summary.failed.push({
        sourceSetId: set.sourceSetId,
        category: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  summary.updated.sort();
  summary.skipped.sort();
  summary.rejected.sort((a, b) => a.sourceSetId.localeCompare(b.sourceSetId));
  summary.failed.sort((a, b) => a.sourceSetId.localeCompare(b.sourceSetId));
  return summary;
}
