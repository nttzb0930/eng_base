import { downloadToeicGrammar } from "./toeic-grammar.download.js";
import {
  loadToeicGrammarRemoteRuntime,
  requireApprovedSha,
  safeCommandError,
} from "./toeic-grammar.cli.js";
async function main() {
  const runtime = loadToeicGrammarRemoteRuntime(process.argv.slice(2));
  console.log(
    JSON.stringify(
      await downloadToeicGrammar({
        approvedSha256: requireApprovedSha(runtime.options.approvedSha256),
        source: runtime.source,
        storage: runtime.storage,
        workers: runtime.options.workers,
      }),
      null,
      2
    )
  );
}
main().catch((error: unknown) => {
  console.error(safeCommandError(error, "Grammar download failed"));
  process.exitCode = 1;
});
