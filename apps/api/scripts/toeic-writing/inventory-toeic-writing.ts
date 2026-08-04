import {
  loadToeicWritingRemoteRuntime,
  safeToeicWritingCommandError,
} from "./toeic-writing.cli.js";
import { inventoryToeicWriting } from "./toeic-writing.inventory.js";

async function main() {
  const runtime = loadToeicWritingRemoteRuntime(process.argv.slice(2));
  const inventory = await inventoryToeicWriting({
    source: runtime.source,
    observedAt: new Date().toISOString(),
    licenseReference: runtime.licenseReference,
    concurrency: runtime.options.workers,
  });
  const storageKey = await runtime.storage.writeInventory(inventory);
  console.log(
    JSON.stringify(
      {
        storageKey,
        inventorySha256: inventory.inventorySha256,
        taskCounts: inventory.taskCounts,
        imageCount: inventory.imageCount,
        knownImageBytes: inventory.knownImageBytes,
        unknownImageSizeCount: inventory.unknownImageSizeCount,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(
    safeToeicWritingCommandError(error, "Writing inventory failed")
  );
  process.exitCode = 1;
});
