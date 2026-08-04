import {
  downloadToeicListeningPractice,
  formatListeningProgress,
} from "./toeic-listening-practice.download.js";
import { loadToeicListeningRuntime } from "./toeic-listening-practice.cli.js";

async function main() {
  const runtime = loadToeicListeningRuntime({
    argv: process.argv.slice(2),
    requireReadingInventorySha: false,
    requireApprovedSha: true,
  });
  const summary = await downloadToeicListeningPractice({
    source: runtime.source,
    storage: runtime.storage,
    approvedInventorySha256: runtime.options.approvedSha256!,
    now: () => new Date(),
    concurrency: runtime.profile.downloadConcurrency,
    onProgress: (value) => console.error(formatListeningProgress(value)),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.rejected.length > 0 || summary.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error(JSON.stringify({ error: "Listening download failed" }));
  process.exitCode = 1;
});
