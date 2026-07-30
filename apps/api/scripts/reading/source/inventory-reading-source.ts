import { resolve } from "node:path";

import { createDautoeicReadingSource } from "./dautoeic-reading-source.js";
import {
  buildReadingSourceInventory,
  extractEmbeddedImageUrls,
} from "./reading-source.inventory.js";
import { createFileReadingSourceStorage } from "./reading-source.storage.js";

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

async function main() {
  const sourceUrl = requireEnvironment("READING_SOURCE_URL");
  requireEnvironment("READING_LICENSE_NAME");
  requireEnvironment("READING_LICENSE_REFERENCE");
  requireEnvironment("READING_LICENSE_INTENDED_USE");
  const baseHost = new URL(sourceUrl).hostname;
  const allowedHosts = new Set([
    baseHost,
    ...(process.env.READING_SOURCE_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]);

  const source = createDautoeicReadingSource({
    baseUrl: sourceUrl,
    authorization: requireEnvironment("READING_SOURCE_AUTHORIZATION"),
    allowedHosts: [...allowedHosts],
    request: fetch,
    timeoutMs: positiveInteger("READING_SOURCE_TIMEOUT_MS", 20_000),
    maxRetries: positiveInteger("READING_SOURCE_MAX_RETRIES", 3),
  });
  const repositoryRoot = resolve(process.cwd(), "../..");
  const storage = createFileReadingSourceStorage({
    repositoryRoot,
    configuredRoot: process.env.READING_CONTENT_STORAGE_DIR,
  });

  const accessSummaries = await source.listAccessSummaries();
  const rows = await source.listReadingRows();
  const imageUrls = extractEmbeddedImageUrls(rows);
  const images = [];
  for (const imageUrl of imageUrls) {
    images.push(await source.inspectEmbeddedImage(imageUrl));
  }

  const inventory = buildReadingSourceInventory({
    accessSummaries,
    rows,
    images,
    createdAt: new Date().toISOString(),
  });
  const storageKey = await storage.writeInventory(inventory);

  console.log(
    JSON.stringify(
      {
        storageKey,
        inventorySha256: inventory.inventorySha256,
        visibleCount: inventory.visibleCount,
        acceptedCount: inventory.acceptedCount,
        excludedNotFreeCount: inventory.excludedNotFreeCount,
        excludedHiddenCount: inventory.excludedHiddenCount,
        questionCount: inventory.questionCount,
        embeddedImageCount: inventory.embeddedImageCount,
        knownImageBytes: inventory.knownImageBytes,
        unknownImageSizeCount: inventory.unknownImageSizeCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Reading inventory failed",
  );
  process.exitCode = 1;
});
