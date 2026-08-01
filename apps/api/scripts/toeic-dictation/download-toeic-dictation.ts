import { downloadToeicDictationPackage } from "./toeic-dictation.download.js";
import { loadToeicDictationRuntime } from "./toeic-dictation.cli.js";
import { validateToeicDictationPackage } from "./toeic-dictation.validation.js";

async function main() {
  const runtime = loadToeicDictationRuntime(process.argv.slice(2));
  if (!runtime.approvedSha) throw new Error("--approved-sha is required");
  const inventory = await runtime.storage.readInventory(runtime.approvedSha);
  const validation = validateToeicDictationPackage(inventory, {
    expectedSetCount: 40,
  });
  if (!validation.valid) {
    throw new Error(`Dictation inventory is invalid: ${validation.errors.join("; ")}`);
  }
  const summary = await downloadToeicDictationPackage({
    source: runtime.source,
    storage: runtime.storage,
    inventory,
    concurrency: runtime.profile.downloadConcurrency,
  });
  await runtime.storage.writePackageFile(
    inventory.inventorySha256,
    "validation.json",
    validation
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Dictation download failed",
    })
  );
  process.exitCode = 1;
});
