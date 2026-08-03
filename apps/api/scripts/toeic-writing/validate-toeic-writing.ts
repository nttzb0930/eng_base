import {
  loadToeicWritingStorageRuntime,
  safeToeicWritingCommandError,
} from "./toeic-writing.cli.js";
import type { ToeicWritingCanonicalTask } from "./toeic-writing.types.js";
import { validateToeicWritingTask } from "./toeic-writing.validation.js";

async function main() {
  const runtime = loadToeicWritingStorageRuntime(process.argv.slice(2));
  const packages = await runtime.storage.listPackages();
  const invalid: Array<{ sourceTaskId: string; errors: string[] }> = [];
  let validCount = 0;

  for (const entry of packages) {
    try {
      const content = (await runtime.storage.readPackageFile(
        entry.sourceTaskId,
        entry.sourceVersion,
        "content.json"
      )) as ToeicWritingCanonicalTask;
      const result = validateToeicWritingTask(content);
      if (result.valid) validCount += 1;
      else
        invalid.push({
          sourceTaskId: entry.sourceTaskId,
          errors: result.errors,
        });
    } catch {
      invalid.push({
        sourceTaskId: entry.sourceTaskId,
        errors: ["package content cannot be read"],
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        packageCount: packages.length,
        validCount,
        invalid,
      },
      null,
      2
    )
  );
  if (invalid.length > 0 || packages.length !== 98) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    safeToeicWritingCommandError(error, "Writing validation failed")
  );
  process.exitCode = 1;
});
