import {
  buildReadingSourceInventory,
  extractEmbeddedImageUrls,
} from "./reading-source.inventory.js";
import { loadReadingSourceRuntime } from "./reading-source.cli.js";

async function main() {
  const runtime = loadReadingSourceRuntime({
    argv: process.argv.slice(2),
    requireAuthorization: true,
  });
  if (!runtime.source) throw new Error("Reading source is unavailable");

  const accessSummaries = await runtime.source.listAccessSummaries();
  const rows = await runtime.source.listReadingRows();
  const images = [];
  for (const imageUrl of extractEmbeddedImageUrls(rows)) {
    images.push(await runtime.source.inspectEmbeddedImage(imageUrl));
  }
  const inventory = buildReadingSourceInventory({
    accessSummaries,
    rows,
    images,
    createdAt: new Date().toISOString(),
  });
  const storageKey = await runtime.storage.writeInventory(inventory);
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
