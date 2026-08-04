import { buildToeicDictationInventory } from "./toeic-dictation.inventory.js";
import { loadToeicDictationRuntime } from "./toeic-dictation.cli.js";

async function main() {
  const runtime = loadToeicDictationRuntime(process.argv.slice(2));
  const inventory = await buildToeicDictationInventory({
    source: runtime.source,
    collectionName: runtime.collectionName,
    observedAt: new Date().toISOString(),
    mediaConcurrency: runtime.inventoryConcurrency,
  });
  const storageKey = await runtime.storage.writeInventory(inventory);
  console.log(
    JSON.stringify(
      {
        storageKey,
        inventorySha256: inventory.inventorySha256,
        selectedSetCount: inventory.selectedSetCount,
        itemCount: inventory.itemCount,
        audioCount: inventory.audioCount,
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
