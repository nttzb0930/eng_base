import { classifyReadingSourceAccess } from "./reading-source.policy.js";
import { sha256Text, stableJson } from "./reading-source.canonical.js";
import type {
  ReadingSourceAccessSummary,
  ReadingSourceImageInspection,
  ReadingSourceInventory,
  ReadingSourceRow,
} from "./reading-source.types.js";

function duplicateCount(values: string[]) {
  return values.length - new Set(values).size;
}

function sortedUnique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function extractEmbeddedImageUrls(rows: ReadingSourceRow[]) {
  const urls: string[] = [];
  const imagePattern =
    /<img\b[^>]*\bsrc\s*=\s*["'](?<url>[^"']+)["'][^>]*>/giu;

  for (const row of rows) {
    for (const match of row.contentHtml.matchAll(imagePattern)) {
      const value = match.groups?.url;
      if (!value) continue;
      try {
        const url = new URL(value);
        if (url.protocol === "https:") urls.push(url.href);
      } catch {
        continue;
      }
    }
  }

  return sortedUnique(urls);
}

export function buildReadingSourceInventory(input: {
  accessSummaries: ReadingSourceAccessSummary[];
  rows: ReadingSourceRow[];
  images: ReadingSourceImageInspection[];
  createdAt: string;
}): ReadingSourceInventory {
  if (Number.isNaN(Date.parse(input.createdAt))) {
    throw new Error("Reading inventory createdAt must be an ISO timestamp");
  }

  const summaryIds = input.accessSummaries.map((summary) => summary.sourceId);
  if (duplicateCount(summaryIds) > 0) {
    throw new Error("Reading inventory contains duplicate access-summary source ID");
  }
  const rowIds = input.rows.map((row) => row.sourceId);
  if (duplicateCount(rowIds) > 0) {
    throw new Error("Reading inventory contains duplicate content-row source ID");
  }

  const classified = input.accessSummaries.map((summary) => ({
    summary,
    access: classifyReadingSourceAccess(summary),
  }));
  const acceptedIds = sortedUnique(
    classified
      .filter(({ access }) => access.classification === "BASIC_FREE")
      .map(({ summary }) => summary.sourceId),
  );
  const sortedRowIds = sortedUnique(rowIds);
  if (stableJson(acceptedIds) !== stableJson(sortedRowIds)) {
    throw new Error(
      "Reading accepted source rows do not match access metadata",
    );
  }

  const imageByUrl = new Map<string, ReadingSourceImageInspection>();
  for (const image of input.images) {
    const existing = imageByUrl.get(image.url);
    if (
      existing &&
      (existing.bytes !== image.bytes || existing.mimeType !== image.mimeType)
    ) {
      throw new Error(`Reading image metadata conflicts for ${image.url}`);
    }
    imageByUrl.set(image.url, image);
  }
  const images = [...imageByUrl.values()].sort((left, right) =>
    left.url.localeCompare(right.url),
  );

  const digestInput = {
    schemaVersion: 1,
    source: "dautoeic",
    visibleCount: input.accessSummaries.length,
    acceptedCount: input.rows.length,
    excludedNotFreeCount: classified.filter(
      ({ access }) => access.classification === "EXCLUDED_NOT_FREE",
    ).length,
    excludedHiddenCount: classified.filter(
      ({ access }) => access.classification === "EXCLUDED_HIDDEN",
    ).length,
    sourceLevelCounts: {
      "1": input.rows.filter((row) => row.sourceLevel === "1").length,
      "2": input.rows.filter((row) => row.sourceLevel === "2").length,
    },
    questionCount: input.rows.reduce(
      (total, row) => total + row.questions.length,
      0,
    ),
    embeddedImageCount: images.length,
    knownImageBytes: images.reduce(
      (total, image) => total + (image.bytes ?? 0),
      0,
    ),
    unknownImageSizeCount: images.filter((image) => image.bytes === null).length,
    acceptedSourceIds: acceptedIds,
    images,
  } as const;

  return {
    schemaVersion: 1,
    source: "dautoeic",
    createdAt: input.createdAt,
    visibleCount: digestInput.visibleCount,
    acceptedCount: digestInput.acceptedCount,
    excludedNotFreeCount: digestInput.excludedNotFreeCount,
    excludedHiddenCount: digestInput.excludedHiddenCount,
    sourceLevelCounts: digestInput.sourceLevelCounts,
    questionCount: digestInput.questionCount,
    embeddedImageCount: digestInput.embeddedImageCount,
    knownImageBytes: digestInput.knownImageBytes,
    unknownImageSizeCount: digestInput.unknownImageSizeCount,
    acceptedSourceIds: digestInput.acceptedSourceIds,
    inventorySha256: sha256Text(stableJson(digestInput)),
  };
}
