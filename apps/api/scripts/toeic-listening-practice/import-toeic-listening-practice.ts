import { resolve } from "node:path";

import prisma from "../support/script-prisma.js";
import { importToeicListeningPractice } from "./toeic-listening-practice.import.js";
import { createPrismaToeicListeningImportStore } from "./toeic-listening-practice.prisma-store.js";
import { createFileToeicListeningStorage } from "./toeic-listening-practice.storage.js";

async function main() {
  try {
    const summary = await importToeicListeningPractice({
      storage: createFileToeicListeningStorage(
        resolve(__dirname, "../../../..")
      ),
      store: createPrismaToeicListeningImportStore(prisma),
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
    error instanceof Error ? error.message : "Listening import failed"
  );
  process.exitCode = 1;
});
