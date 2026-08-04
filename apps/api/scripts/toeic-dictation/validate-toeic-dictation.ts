import { validateToeicDictationPackage } from "./toeic-dictation.validation.js";
import { loadToeicDictationRuntime } from "./toeic-dictation.cli.js";

async function main() {
  const runtime = loadToeicDictationRuntime(process.argv.slice(2));
  if (!runtime.approvedSha) throw new Error("--approved-sha is required");
  const inventory = await runtime.storage.readInventory(runtime.approvedSha);
  const validation = validateToeicDictationPackage(inventory, {
    expectedSetCount: 40,
  });
  console.log(
    JSON.stringify(
      {
        packageCount: 1,
        validCount: validation.valid ? 1 : 0,
        invalid: validation.valid ? [] : [{ inventorySha256: inventory.inventorySha256, errors: validation.errors }],
      },
      null,
      2
    )
  );
  if (!validation.valid) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Dictation validation failed",
    })
  );
  process.exitCode = 1;
});
