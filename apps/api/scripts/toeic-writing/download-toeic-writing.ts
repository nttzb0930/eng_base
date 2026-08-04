import {
  loadToeicWritingRemoteRuntime,
  requireToeicWritingApprovedSha,
  safeToeicWritingCommandError,
} from "./toeic-writing.cli.js";
import { downloadToeicWriting } from "./toeic-writing.download.js";

async function main() {
  const runtime = loadToeicWritingRemoteRuntime(process.argv.slice(2));
  const approvedSha256 = requireToeicWritingApprovedSha(
    runtime.options.approvedSha256
  );
  const inventory = await runtime.storage.readInventory(approvedSha256);
  const summary = await downloadToeicWriting({
    source: runtime.source,
    storage: runtime.storage,
    inventory,
    approvedSha256,
    concurrency: runtime.options.workers,
    onProgress: (progress) => {
      console.log(
        `[writing-download] ${progress.completed}/${progress.total} ${progress.status} ${progress.sourceTaskId}`
      );
    },
  });

  console.log(
    JSON.stringify(
      {
        ...summary,
        workers: runtime.options.workers,
      },
      null,
      2
    )
  );
  if (summary.rejected.length > 0 || summary.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(safeToeicWritingCommandError(error, "Writing download failed"));
  process.exitCode = 1;
});
