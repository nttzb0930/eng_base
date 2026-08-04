import { runVocabularyBootstrapCommand } from "./vocabulary/database/bootstrap-vocabulary.js";

void runVocabularyBootstrapCommand().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
