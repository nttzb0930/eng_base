import prisma from "../support/script-prisma.js";
import {
  loadToeicGrammarStorage,
  requireApprovedSha,
  safeCommandError,
} from "./toeic-grammar.cli.js";
import { importToeicGrammar } from "./toeic-grammar.import.js";
import { createPrismaToeicGrammarImportStore } from "./toeic-grammar.prisma-store.js";
async function main() {
  const runtime = loadToeicGrammarStorage(process.argv.slice(2));
  const result = await importToeicGrammar({
    approvedSha256: requireApprovedSha(runtime.options.approvedSha256),
    storage: runtime.storage,
    store: createPrismaToeicGrammarImportStore(prisma),
  });
  console.log(JSON.stringify({ result }, null, 2));
}
main()
  .catch((error: unknown) => {
    console.error(safeCommandError(error, "Grammar import failed"));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
