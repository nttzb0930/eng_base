import { loadToeicGrammarStorage, safeCommandError } from "./toeic-grammar.cli.js";
import { validateStoredToeicGrammar } from "./toeic-grammar.validation.js";
async function main() { const runtime = loadToeicGrammarStorage(process.argv.slice(2)); console.log(JSON.stringify(await validateStoredToeicGrammar({ storage: runtime.storage }), null, 2)); }
main().catch((error: unknown) => { console.error(safeCommandError(error, "Grammar validation failed")); process.exitCode = 1; });
