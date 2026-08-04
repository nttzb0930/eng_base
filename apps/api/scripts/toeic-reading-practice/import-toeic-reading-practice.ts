import { resolve } from "node:path";

import prisma from "../support/script-prisma.js";
import { importToeicReadingPractice } from "./toeic-reading-practice.import.js";
import { createPrismaToeicReadingImportStore } from "./toeic-reading-practice.prisma-store.js";
import { createFileToeicReadingStorage } from "./toeic-reading-practice.storage.js";

async function main() {
  try {
    const summary = await importToeicReadingPractice({
      storage: createFileToeicReadingStorage({
        repositoryRoot: resolve(__dirname, "../../../.."),
      }),
      store: createPrismaToeicReadingImportStore(prisma),
    });
    console.log(JSON.stringify(summary, null, 2));
    if (summary.rejected.length > 0 || summary.failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "TOEIC Reading import failed"
  );
  process.exitCode = 1;
});
