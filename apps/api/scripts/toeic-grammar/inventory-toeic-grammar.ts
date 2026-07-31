import { loadToeicGrammarRemoteRuntime, safeCommandError } from "./toeic-grammar.cli.js";
import { inventoryToeicGrammar } from "./toeic-grammar.inventory.js";
async function main() { const runtime = loadToeicGrammarRemoteRuntime(process.argv.slice(2)); const result = await inventoryToeicGrammar(runtime); console.log(JSON.stringify({ storageKey: result.storageKey, inventorySha256: result.inventorySha256, counts: result.counts }, null, 2)); }
main().catch((error: unknown) => { console.error(safeCommandError(error, "Grammar inventory failed")); process.exitCode = 1; });
