import {
  loadReadingSourceRuntime,
} from "./reading-source.cli.js";
import { downloadReadingSource } from "./reading-source.download.js";

async function main() {
  const runtime = loadReadingSourceRuntime({
    argv: process.argv.slice(2),
    requireAuthorization: true,
    requireApprovedSha: true,
  });
  if (!runtime.source || !runtime.approvedSha256) {
    throw new Error("Reading download runtime is incomplete");
  }
  const summary = await downloadReadingSource({
    source: runtime.source,
    storage: runtime.storage,
    approvedInventory: await runtime.storage.readApprovedInventory(
      runtime.approvedSha256,
    ),
    license: runtime.profile.license,
    sourceWebUrl: runtime.profile.sourceWebUrl,
    concurrency: runtime.profile.downloadConcurrency,
    now: () => new Date(),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.rejected.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Reading download failed");
  process.exitCode = 1;
});
