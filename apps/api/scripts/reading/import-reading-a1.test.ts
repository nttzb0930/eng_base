import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiDirectory = process.cwd();
const scriptsDirectory = join(apiDirectory, "scripts", "reading");

test("package exposes one explicit Reading A1 import command", () => {
  const packageJson = JSON.parse(
    readFileSync(join(apiDirectory, "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };

  assert.equal(
    packageJson.scripts?.["data:import-reading-a1"],
    "dotenv -e ../../.env -- tsx ./scripts/reading/import-reading-a1.ts"
  );
});

test("Reading importer composes validation, audit, synchronization, and Prisma", () => {
  const source = readFileSync(
    join(scriptsDirectory, "import-reading-a1.ts"),
    "utf8"
  );

  assert.match(source, /loadCanonicalReadingContent/u);
  assert.match(source, /validateReadingContentPack/u);
  assert.match(source, /auditReadingVocabulary/u);
  assert.match(source, /importReadingContent/u);
  assert.match(source, /script-prisma/u);
  assert.match(source, /questionIndex \+ 1/u);
  assert.match(source, /optionIndex \+ 1/u);
  assert.match(source, /status: "DRAFT"/u);
  assert.doesNotMatch(
    source,
    /migrate|publish|practice_sessions|user_vocabulary_progress/u
  );
});
