import prisma from "../support/script-prisma.js";

import {
  loadToeicDictationStorageRuntime,
  parseToeicDictationOptions,
} from "./toeic-dictation.cli.js";
import { importToeicDictationPackage } from "./toeic-dictation.import.js";
import { createPrismaToeicDictationImportStore } from "./toeic-dictation.prisma-store.js";

async function main() {
  const runtime = loadToeicDictationStorageRuntime(process.argv.slice(2));
  const options = parseToeicDictationOptions(process.argv.slice(2));
  if (!options.approvedSha) {
    throw new Error("--approved-sha is required");
  }
  const summary = await importToeicDictationPackage({
    approvedSha256: options.approvedSha,
    storage: runtime.storage,
    store: createPrismaToeicDictationImportStore(prisma),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.rejected.length > 0 || summary.failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "TOEIC Dictation import failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
