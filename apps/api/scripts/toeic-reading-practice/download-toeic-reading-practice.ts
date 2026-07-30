import { loadToeicReadingRuntime } from "./toeic-reading-practice.cli.js";
import { downloadToeicReadingPractice } from "./toeic-reading-practice.download.js";

async function main() {
  const runtime = loadToeicReadingRuntime({
    argv: process.argv.slice(2),
    requireAuthorization: true,
    requireApprovedSha: true,
  });
  if (!runtime.source || !runtime.options.approvedSha256) {
    throw new Error("TOEIC Reading download configuration is incomplete");
  }
  const result = await downloadToeicReadingPractice({
    source: runtime.source,
    storage: runtime.storage,
    approvedInventorySha256: runtime.options.approvedSha256,
    now: () => new Date(),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.rejected.length > 0 || result.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Download failed",
    })
  );
  process.exitCode = 1;
});
