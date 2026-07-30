import {
  createReadingSourceFromEnvironment,
  createReadingStorageFromEnvironment,
  readingPositiveInteger,
  requireReadingEnvironment,
} from "./reading-source.cli.js";
import { downloadReadingSource } from "./reading-source.download.js";

async function main() {
  const sourceUrl = requireReadingEnvironment("READING_SOURCE_URL");
  const storage = createReadingStorageFromEnvironment();
  const approvedSha256 = requireReadingEnvironment(
    "READING_APPROVED_INVENTORY_SHA256",
  );
  const summary = await downloadReadingSource({
    source: createReadingSourceFromEnvironment(sourceUrl),
    storage,
    approvedInventory: await storage.readApprovedInventory(approvedSha256),
    license: {
      name: requireReadingEnvironment("READING_LICENSE_NAME"),
      reference: requireReadingEnvironment("READING_LICENSE_REFERENCE"),
      intendedUse: requireReadingEnvironment("READING_LICENSE_INTENDED_USE"),
    },
    sourceWebUrl: sourceUrl,
    concurrency: readingPositiveInteger(
      "READING_SOURCE_DOWNLOAD_CONCURRENCY",
      4,
    ),
    now: () => new Date(),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.rejected.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Reading download failed");
  process.exitCode = 1;
});
