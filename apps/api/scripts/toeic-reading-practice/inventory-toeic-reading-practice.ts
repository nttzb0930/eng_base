import { inventoryToeicReadingPractice } from "./toeic-reading-practice.inventory.js";
import { loadToeicReadingRuntime } from "./toeic-reading-practice.cli.js";

async function main() {
  const runtime = loadToeicReadingRuntime({
    argv: process.argv.slice(2),
    requireAuthorization: true,
    requireApprovedSha: false,
  });
  if (!runtime.source) throw new Error("TOEIC Reading source is unavailable");
  const inventory = await inventoryToeicReadingPractice({
    source: runtime.source,
    sourceSet: runtime.options.sourceSet,
    limitTests: runtime.options.limitTests,
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
        totalQuestions: inventory.totalQuestions,
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
