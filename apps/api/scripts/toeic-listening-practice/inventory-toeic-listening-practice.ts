import { inventoryToeicListeningPractice } from "./toeic-listening-practice.inventory.js";
import { loadToeicListeningInventoryRuntime } from "./toeic-listening-practice.cli.js";

async function main() {
  const runtime = loadToeicListeningInventoryRuntime(process.argv.slice(2));
  const readingInventory = await runtime.storage.readReadingInventory(
    runtime.options.readingInventorySha256!
  );
  const inventory = await inventoryToeicListeningPractice({
    source: runtime.source,
    approvedTests: readingInventory.selectedTests.map((test) => ({
      sourceTestId: test.sourceTestId,
      sourceSetId: test.sourceSetId,
      title: test.title,
      order: test.order,
    })),
    readingInventorySha256: readingInventory.inventorySha256,
    sourceSetName: readingInventory.sourceSet,
    observedAt: new Date().toISOString(),
  });
  const storageKey = await runtime.storage.writeInventory(inventory);
  console.log(
    JSON.stringify(
      {
        storageKey,
        inventorySha256: inventory.inventorySha256,
        selectedTestCount: inventory.selectedTests.length,
        questionCounts: inventory.questionCounts,
        audioCount: inventory.audioCount,
        imageCount: inventory.imageCount,
        knownMediaBytes: inventory.knownMediaBytes,
        unknownMediaSizeCount: inventory.unknownMediaSizeCount,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Inventory failed",
    })
  );
  process.exitCode = 1;
});
