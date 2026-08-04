import { resolve } from "node:path";

import { createFileToeicListeningStorage } from "./toeic-listening-practice.storage.js";
import { validateToeicListeningPackages } from "./toeic-listening-practice.validation.js";

async function main() {
  const storage = createFileToeicListeningStorage(
    resolve(__dirname, "../../../..")
  );
  const summary = await validateToeicListeningPackages(storage);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.invalid.length > 0) process.exitCode = 1;
}

main().catch(() => {
  console.error(JSON.stringify({ error: "Listening validation failed" }));
  process.exitCode = 1;
});
