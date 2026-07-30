import { loadReadingSourceRuntime } from "./reading-source.cli.js";
import { validateStoredReadingPackages } from "./reading-source.download.js";

async function main() {
  const runtime = loadReadingSourceRuntime({ argv: process.argv.slice(2) });
  const summary = await validateStoredReadingPackages(runtime.storage);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.invalid.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Reading validation failed",
  );
  process.exitCode = 1;
});
