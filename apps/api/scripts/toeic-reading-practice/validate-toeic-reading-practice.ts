import { resolve } from "node:path";

import { validateToeicReadingPracticeTest } from "./toeic-reading-practice.canonical.js";
import { createFileToeicReadingStorage } from "./toeic-reading-practice.storage.js";

async function main() {
  const storage = createFileToeicReadingStorage({
    repositoryRoot: resolve(__dirname, "../../../.."),
  });
  const packages = await storage.listCompletePackages();
  const invalid: Array<{ sourceTestId: string; errors: string[] }> = [];
  for (const item of packages) {
    const content = await storage.readPackageFile(
      item.sourceTestId,
      item.sourceVersion,
      "content.json"
    );
    const result = validateToeicReadingPracticeTest(content);
    if (!result.valid) {
      invalid.push({ sourceTestId: item.sourceTestId, errors: result.errors });
    }
  }
  console.log(
    JSON.stringify(
      {
        packageCount: packages.length,
        validCount: packages.length - invalid.length,
        invalid,
      },
      null,
      2
    )
  );
  if (invalid.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Validation failed",
    })
  );
  process.exitCode = 1;
});
