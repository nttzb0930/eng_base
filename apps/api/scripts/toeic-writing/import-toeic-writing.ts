import prisma from "../support/script-prisma.js";

import {
  loadToeicWritingStorageRuntime,
  requireToeicWritingApprovedSha,
  safeToeicWritingCommandError,
} from "./toeic-writing.cli.js";
import { importToeicWriting } from "./toeic-writing.import.js";
import { createPrismaToeicWritingImportStore } from "./toeic-writing.prisma-store.js";
import type { ToeicWritingCanonicalTask } from "./toeic-writing.types.js";

async function main() {
  const runtime = loadToeicWritingStorageRuntime(process.argv.slice(2));
  const approvedSha256 = requireToeicWritingApprovedSha(
    runtime.options.approvedSha256
  );
  const inventory = await runtime.storage.readInventory(approvedSha256);
  if (inventory.inventorySha256 !== approvedSha256) {
    throw new Error("approved inventory SHA-256 does not match inventory");
  }

  const packages: ToeicWritingCanonicalTask[] = [];
  const unreadable: Array<{ sourceTaskId: string; category: string }> = [];
  for (const task of inventory.selectedTasks) {
    try {
      const [content, manifest, validation] = await Promise.all([
        runtime.storage.readPackageFile(
          task.sourceTaskId,
          task.sourceVersion,
          "content.json"
        ),
        runtime.storage.readPackageFile(
          task.sourceTaskId,
          task.sourceVersion,
          "manifest.json"
        ),
        runtime.storage.readPackageFile(
          task.sourceTaskId,
          task.sourceVersion,
          "validation.json"
        ),
      ]);
      const manifestValue = manifest as { inventorySha256?: unknown };
      const validationValue = validation as { valid?: unknown };
      if (
        manifestValue.inventorySha256 !== approvedSha256 ||
        validationValue.valid !== true
      ) {
        unreadable.push({
          sourceTaskId: task.sourceTaskId,
          category: "PACKAGE_NOT_APPROVED",
        });
        continue;
      }
      packages.push(content as ToeicWritingCanonicalTask);
    } catch {
      unreadable.push({
        sourceTaskId: task.sourceTaskId,
        category: "PACKAGE_READ_FAILED",
      });
    }
  }

  const summary = await importToeicWriting({
    packages,
    store: createPrismaToeicWritingImportStore(prisma),
  });
  summary.failed.push(...unreadable);
  summary.failed.sort((left, right) =>
    left.sourceTaskId.localeCompare(right.sourceTaskId)
  );
  console.log(JSON.stringify(summary, null, 2));
  if (summary.rejected.length > 0 || summary.failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(safeToeicWritingCommandError(error, "Writing import failed"));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
