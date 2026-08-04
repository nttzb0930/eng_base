import { extname } from "node:path";

import {
  buildCanonicalReadingPackage,
  sha256Text,
  stableJson,
  validateCanonicalReadingPackage,
} from "./reading-source.canonical.js";
import {
  buildReadingSourceInventory,
  extractEmbeddedImageUrls,
} from "./reading-source.inventory.js";
import { assertApprovedReadingInventory } from "./reading-source.policy.js";
import type {
  DautoeicReadingSource,
  ReadingSourceInventory,
  ReadingSourceLicense,
  ReadingSourceManifest,
  ReadingSourceRow,
  ReadingSourceStorage,
} from "./reading-source.types.js";

type DownloadInput = {
  source: DautoeicReadingSource;
  storage: ReadingSourceStorage;
  approvedInventory: ReadingSourceInventory;
  license: ReadingSourceLicense;
  sourceWebUrl: string;
  concurrency: number;
  now: () => Date;
};

type Rejection = { sourceId: string; errors: string[] };

function errorMessages(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown validation error")
    .split("\n")
    .filter(Boolean);
}

function mediaId(url: string) {
  const extension = extname(new URL(url).pathname).toLocaleLowerCase("en-US");
  const safeExtension = /^\.[a-z0-9]{1,8}$/u.test(extension)
    ? extension
    : ".bin";
  return `${sha256Text(url)}${safeExtension}`;
}

async function liveInventory(input: DownloadInput, rows: ReadingSourceRow[]) {
  const accessSummaries = await input.source.listAccessSummaries();
  const images = [];
  for (const url of extractEmbeddedImageUrls(rows)) {
    images.push(await input.source.inspectEmbeddedImage(url));
  }
  return buildReadingSourceInventory({
    accessSummaries,
    rows,
    images,
    createdAt: input.now().toISOString(),
  });
}

async function runPool<T>(
  values: T[],
  concurrency: number,
  work: (value: T) => Promise<void>,
) {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("Reading download concurrency must be a positive integer");
  }
  let cursor = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      async () => {
        while (cursor < values.length) {
          const value = values[cursor];
          cursor += 1;
          if (value !== undefined) await work(value);
        }
      },
    ),
  );
}

export async function downloadReadingSource(input: DownloadInput) {
  const rows = await input.source.listReadingRows();
  const live = await liveInventory(input, rows);
  assertApprovedReadingInventory({
    approvedSha256: input.approvedInventory.inventorySha256,
    liveSha256: live.inventorySha256,
    liveAcceptedSourceIds: live.acceptedSourceIds,
    approvedAcceptedSourceIds: input.approvedInventory.acceptedSourceIds,
  });

  const completed: string[] = [];
  const resumed: string[] = [];
  const rejected: Rejection[] = [];

  await runPool(rows, input.concurrency, async (row) => {
    const preliminary = buildCanonicalReadingPackage(row, []);
    const sourceVersion = preliminary.sourceVersion;
    if (await input.storage.packageExists(row.sourceId, sourceVersion)) {
      resumed.push(row.sourceId);
      return;
    }

    try {
      const media = [];
      for (const url of extractEmbeddedImageUrls([row])) {
        const id = mediaId(url);
        const stored = await input.storage.writeMedia({
          sourceId: row.sourceId,
          sourceVersion,
          mediaId: id,
          response: await input.source.openEmbeddedImage(url),
        });
        media.push({ id, sourceUrl: url, ...stored });
      }
      const content = validateCanonicalReadingPackage(
        buildCanonicalReadingPackage(row, media),
      );
      const validation = {
        schemaVersion: 1,
        sourceId: row.sourceId,
        sourceVersion,
        status: "VALID",
        errors: [],
        warnings: [],
      };
      const manifest: ReadingSourceManifest = {
        schemaVersion: 1,
        source: "dautoeic",
        sourceId: row.sourceId,
        sourceVersion,
        sourceWebUrl: input.sourceWebUrl,
        accessClassification: "BASIC_FREE",
        approvedInventorySha256: input.approvedInventory.inventorySha256,
        license: input.license,
        createdAt: input.now().toISOString(),
        files: {
          content: { sha256: sha256Text(stableJson(content)) },
          validation: { sha256: sha256Text(stableJson(validation)) },
        },
      };
      await input.storage.writePackageFile(
        row.sourceId,
        sourceVersion,
        "validation.json",
        validation,
      );
      await input.storage.writePackageFile(
        row.sourceId,
        sourceVersion,
        "content.json",
        content,
      );
      await input.storage.writePackageFile(
        row.sourceId,
        sourceVersion,
        "manifest.json",
        manifest,
      );
      completed.push(row.sourceId);
    } catch (error) {
      const errors = errorMessages(error);
      rejected.push({ sourceId: row.sourceId, errors });
      await input.storage.writeRejectedValidation(row.sourceId, sourceVersion, {
        schemaVersion: 1,
        sourceId: row.sourceId,
        sourceVersion,
        status: "REJECTED",
        errors,
      });
    }
  });

  return {
    completed: completed.sort(),
    resumed: resumed.sort(),
    rejected: rejected.sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId),
    ),
  };
}

export async function validateStoredReadingPackages(
  storage: ReadingSourceStorage,
) {
  const packages = await storage.listCompletePackages();
  const valid: string[] = [];
  const invalid: Rejection[] = [];
  for (const item of packages) {
    try {
      const content = validateCanonicalReadingPackage(
        await storage.readPackageFile(
          item.sourceId,
          item.sourceVersion,
          "content.json",
        ),
      );
      const validation = await storage.readPackageFile(
        item.sourceId,
        item.sourceVersion,
        "validation.json",
      );
      const manifest = (await storage.readPackageFile(
        item.sourceId,
        item.sourceVersion,
        "manifest.json",
      )) as ReadingSourceManifest;
      if (
        manifest.sourceId !== item.sourceId ||
        manifest.sourceVersion !== item.sourceVersion ||
        manifest.files.content.sha256 !== sha256Text(stableJson(content)) ||
        manifest.files.validation.sha256 !== sha256Text(stableJson(validation))
      ) {
        throw new Error("Reading package manifest checksum mismatch");
      }
      valid.push(item.sourceId);
    } catch (error) {
      invalid.push({ sourceId: item.sourceId, errors: errorMessages(error) });
    }
  }
  return { valid: valid.sort(), invalid };
}
